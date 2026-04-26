import { NextResponse } from 'next/server';
import { isWebSocketHealthy, getWebSocketConnectionCount } from '@/lib/websocket';

/**
 * Socket.io WebSocket endpoint information route.
 *
 * The actual WebSocket connections are handled by the notification-ws
 * mini-service running on port 3003. Clients should connect via:
 *   io('/?XTransformPort=3003')
 *
 * This route provides health/status information and prevents 404 errors.
 */
export async function GET() {
  const healthy = await isWebSocketHealthy();
  const connections = healthy ? await getWebSocketConnectionCount() : 0;

  return NextResponse.json({
    message: 'ARWA Logistics WebSocket endpoint',
    note: 'Connect via Socket.io client to /?XTransformPort=3003',
    status: healthy ? 'online' : 'offline',
    connections,
    events: [
      'notification:new',
      'shipment:updated',
      'shipment:status_changed',
    ],
    rooms: [
      'user:{userId} - User-specific notifications',
      'role:{role} - Role-specific notifications (ADMIN, CUSTOMER, WAREHOUSE_STAFF)',
      'shipment:{shipmentId} - Shipment tracking updates',
    ],
  });
}
