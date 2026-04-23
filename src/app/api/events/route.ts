import { rateLimit, checkAccess } from '@/lib/rbac';
import { verifyToken } from '@/lib/auth';
import { sseEmitter } from '@/lib/event-emitter';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  // Rate limiting
  const rateLimitResult = rateLimit(request);
  if (rateLimitResult) return rateLimitResult;

  // Check authentication - support both header and query param token
  // (EventSource doesn't support custom headers, so we accept ?token=xxx)
  let access = checkAccess(request);

  if (!access.allowed) {
    // Try token from query parameter
    const url = new URL(request.url);
    const tokenFromQuery = url.searchParams.get('token');
    if (tokenFromQuery) {
      const payload = verifyToken(tokenFromQuery);
      if (payload) {
        access = { allowed: true, session: { id: payload.id, email: payload.email, role: payload.role } };
      }
    }
  }

  if (!access.allowed) return access.response;

  const encoder = new TextEncoder();

  // Create a readable stream for SSE
  const stream = new ReadableStream({
    start(controller) {
      // Send initial connection confirmation
      controller.enqueue(
        encoder.encode(`event: connected\ndata: ${JSON.stringify({ timestamp: new Date().toISOString(), message: 'SSE connection established' })}\n\n`)
      );

      // Subscribe to all SSE event types with named events
      const eventTypes = ['shipment_status_update', 'new_notification', 'payment_update'];

      const handlers: Record<string, (data: any) => void> = {};

      eventTypes.forEach(eventType => {
        // Create a handler that sends the event with its type as the SSE event name
        handlers[eventType] = (data: any) => {
          controller.enqueue(
            encoder.encode(`event: ${eventType}\ndata: ${JSON.stringify(data)}\n\n`)
          );
        };
        sseEmitter.on(eventType, handlers[eventType]);
      });

      // Heartbeat every 30 seconds to keep connection alive
      const heartbeatInterval = setInterval(() => {
        try {
          controller.enqueue(
            encoder.encode(`event: heartbeat\ndata: ${JSON.stringify({ timestamp: new Date().toISOString() })}\n\n`)
          );
        } catch {
          clearInterval(heartbeatInterval);
        }
      }, 30000);

      // Handle connection close
      request.signal.addEventListener('abort', () => {
        clearInterval(heartbeatInterval);
        eventTypes.forEach(eventType => {
          sseEmitter.off(eventType, handlers[eventType]);
        });
        try {
          controller.close();
        } catch {
          // Stream already closed
        }
      });
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      'X-Accel-Buffering': 'no', // Disable nginx buffering
    },
  });
}
