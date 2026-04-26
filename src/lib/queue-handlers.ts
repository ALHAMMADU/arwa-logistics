import { subscribeToQueue, type QueueMessage } from './queue';
import { db } from './db';
import { queueLogger } from './logger';

/**
 * Register all default queue handlers
 * Called during application startup
 */
export async function registerQueueHandlers(): Promise<void> {
  // Shipment created handler
  await subscribeToQueue('shipment.created', async (message: QueueMessage) => {
    queueLogger.info('Processing shipment.created event', { messageId: message.id });
    // Create notification for the customer
    try {
      const data = message.data as { customerId: string; shipmentId: string; trackingNumber: string };
      await db.notification.create({
        data: {
          userId: data.customerId,
          title: 'Shipment Created',
          message: `Your shipment ${data.trackingNumber} has been created.`,
          type: 'SHIPMENT_UPDATE',
          link: `/shipments/${data.shipmentId}`,
        },
      });
    } catch (error) {
      queueLogger.error('Failed to process shipment.created', { error: error instanceof Error ? error.message : String(error) });
    }
  });

  // Shipment status updated handler
  await subscribeToQueue('shipment.status_updated', async (message: QueueMessage) => {
    queueLogger.info('Processing shipment.status_updated event', { messageId: message.id });
    try {
      const data = message.data as { customerId: string; shipmentId: string; status: string; trackingNumber: string };
      await db.notification.create({
        data: {
          userId: data.customerId,
          title: 'Shipment Status Update',
          message: `Shipment ${data.trackingNumber} status changed to ${data.status}.`,
          type: 'SHIPMENT_UPDATE',
          link: `/shipments/${data.shipmentId}`,
        },
      });
    } catch (error) {
      queueLogger.error('Failed to process shipment.status_updated', { error: error instanceof Error ? error.message : String(error) });
    }
  });

  // Email send handler
  await subscribeToQueue('email.send', async (message: QueueMessage) => {
    queueLogger.info('Processing email.send event', { messageId: message.id });
    // TODO: Integrate with actual email service
    queueLogger.debug('Email would be sent here', { data: message.data });
  });

  queueLogger.info('Queue handlers registered');
}
