/**
 * WebSocket Helper Module for ARWA Logistics
 *
 * This module provides server-side functions to emit WebSocket events
 * through the notification-ws mini-service.
 *
 * The WebSocket server runs as a separate mini-service on port 3003.
 * This module communicates with it via HTTP POST requests to its REST emit API.
 *
 * Frontend clients connect via: io('/?XTransformPort=3003')
 */

import { apiLogger } from './logger';

const WS_SERVICE_PORT = 3003;
const WS_SERVICE_HOST = 'localhost';

/**
 * Emit an event to the WebSocket server via its REST API
 */
async function emitToWS(event: string, room: string | null, payload: unknown): Promise<void> {
  try {
    const response = await fetch(`http://${WS_SERVICE_HOST}:${WS_SERVICE_PORT}/emit`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ event, room, payload }),
    });

    if (!response.ok) {
      apiLogger.warn('WebSocket emit failed', { event, room, status: response.status });
    }
  } catch (error) {
    // WebSocket server might not be running — gracefully degrade
    apiLogger.debug('WebSocket server unavailable', {
      event,
      room,
      error: error instanceof Error ? error.message : String(error),
    });
  }
}

/**
 * Send a notification to a specific user
 */
export function notifyUser(userId: string, event: string, data: unknown): void {
  emitToWS(event, `user:${userId}`, data);
}

/**
 * Send a notification to all users with a specific role
 */
export function notifyRole(role: string, event: string, data: unknown): void {
  emitToWS(event, `role:${role}`, data);
}

/**
 * Send a notification to all connected clients
 */
export function broadcast(event: string, data: unknown): void {
  emitToWS(event, null, data);
}

/**
 * Send a shipment update to users watching that shipment
 */
export function notifyShipmentUpdate(shipmentId: string, data: unknown): void {
  emitToWS('shipment:updated', `shipment:${shipmentId}`, data);
}

/**
 * Send a real-time notification to a user
 */
export function sendRealtimeNotification(userId: string, notification: {
  id: string;
  title: string;
  message: string;
  type: string;
  link?: string;
}): void {
  notifyUser(userId, 'notification:new', notification);
}

/**
 * Check if the WebSocket server is healthy
 */
export async function isWebSocketHealthy(): Promise<boolean> {
  try {
    const response = await fetch(`http://${WS_SERVICE_HOST}:${WS_SERVICE_PORT}/health`, {
      method: 'GET',
      signal: AbortSignal.timeout(3000),
    });
    return response.ok;
  } catch {
    return false;
  }
}

/**
 * Get WebSocket connection count
 */
export async function getWebSocketConnectionCount(): Promise<number> {
  try {
    const response = await fetch(`http://${WS_SERVICE_HOST}:${WS_SERVICE_PORT}/health`, {
      method: 'GET',
      signal: AbortSignal.timeout(3000),
    });
    if (response.ok) {
      const data = await response.json();
      return data.connections || 0;
    }
    return 0;
  } catch {
    return 0;
  }
}

const websocket = {
  notifyUser,
  notifyRole,
  broadcast,
  notifyShipmentUpdate,
  sendRealtimeNotification,
  isWebSocketHealthy,
  getWebSocketConnectionCount,
};

export default websocket;
