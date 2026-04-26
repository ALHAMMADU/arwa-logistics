import crypto from 'crypto';
import { db } from './db';
import { apiLogger } from './logger';

export type WebhookEvent =
  | 'shipment.created'
  | 'shipment.status_updated'
  | 'shipment.delivered'
  | 'payment.completed'
  | 'payment.failed'
  | 'payment.refunded'
  | 'quotation.created'
  | 'quotation.reviewed'
  | 'ticket.created'
  | 'ticket.resolved'
  | 'user.registered';

interface WebhookPayload {
  event: WebhookEvent;
  timestamp: string;
  data: Record<string, unknown>;
}

/**
 * Sign a webhook payload with HMAC-SHA256
 */
function signPayload(payload: string, secret: string): string {
  return crypto.createHmac('sha256', secret).update(payload).digest('hex');
}

/**
 * Dispatch a webhook event to all matching endpoints
 */
export async function dispatchWebhook(event: WebhookEvent, data: Record<string, unknown>): Promise<void> {
  try {
    // Find all active webhook endpoints that listen to this event
    const endpoints = await db.webhookEndpoint.findMany({
      where: { active: true },
    });

    const matchingEndpoints = endpoints.filter(endpoint => {
      try {
        const events: string[] = JSON.parse(endpoint.events);
        return events.includes(event) || events.includes('*');
      } catch {
        return false;
      }
    });

    if (matchingEndpoints.length === 0) return;

    const payload: WebhookPayload = {
      event,
      timestamp: new Date().toISOString(),
      data,
    };

    const payloadString = JSON.stringify(payload);

    for (const endpoint of matchingEndpoints) {
      const signature = signPayload(payloadString, endpoint.secret);

      // Create delivery record
      const delivery = await db.webhookDelivery.create({
        data: {
          webhookId: endpoint.id,
          event,
          payload: payloadString,
          success: false,
        },
      });

      // Send webhook asynchronously (fire and forget with delivery tracking)
      deliverWebhook(endpoint.url, payloadString, signature, delivery.id).catch(err => {
        apiLogger.error('Webhook delivery failed', {
          endpointId: endpoint.id,
          deliveryId: delivery.id,
          error: err instanceof Error ? err.message : String(err),
        });
      });
    }
  } catch (error) {
    apiLogger.error('Failed to dispatch webhook', {
      event,
      error: error instanceof Error ? error.message : String(error),
    });
  }
}

async function deliverWebhook(
  url: string,
  payload: string,
  signature: string,
  deliveryId: string,
  maxRetries = 3
): Promise<void> {
  let attempts = 0;

  while (attempts < maxRetries) {
    attempts++;
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 10000); // 10s timeout

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-ARWA-Signature': signature,
          'X-ARWA-Event': 'webhook',
          'User-Agent': 'ARWA-Webhook/1.0',
        },
        body: payload,
        signal: controller.signal,
      });

      clearTimeout(timeout);

      const responseBody = await response.text().catch(() => '');

      await db.webhookDelivery.update({
        where: { id: deliveryId },
        data: {
          statusCode: response.status,
          response: responseBody.substring(0, 1000),
          success: response.status >= 200 && response.status < 300,
          attempts,
        },
      });

      if (response.status >= 200 && response.status < 300) {
        return; // Success
      }

      // Non-2xx response, retry
      if (attempts >= maxRetries) {
        return;
      }
    } catch (error) {
      if (attempts >= maxRetries) {
        await db.webhookDelivery.update({
          where: { id: deliveryId },
          data: {
            success: false,
            attempts,
            response: error instanceof Error ? error.message.substring(0, 1000) : 'Unknown error',
          },
        });
        return;
      }
    }

    // Exponential backoff: 1s, 4s, 9s
    await new Promise(resolve => setTimeout(resolve, attempts * attempts * 1000));
  }
}

/**
 * Verify a webhook signature (for incoming webhooks from external systems)
 */
export function verifyWebhookSignature(payload: string, signature: string, secret: string): boolean {
  const expectedSignature = signPayload(payload, secret);
  return crypto.timingSafeEqual(
    Buffer.from(signature),
    Buffer.from(expectedSignature)
  );
}

export default { dispatchWebhook, verifyWebhookSignature };
