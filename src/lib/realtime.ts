/**
 * Realtime Notification Bridge
 *
 * Bridges the database notification system, SSE event emitter,
 * queue system, and WebSocket server for comprehensive real-time
 * notification delivery.
 *
 * Notification flow:
 * 1. Event occurs (e.g., shipment status change)
 * 2. sendNotification() saves to DB + emits via WebSocket + publishes to queue
 * 3. notifyShipmentStatus() handles shipment-specific real-time updates
 * 4. All notifications are delivered via both SSE and WebSocket channels
 */

import { publishMessage } from './queue';
import { notifyUser, notifyShipmentUpdate, notifyRole, sendRealtimeNotification } from './websocket';
import { sseEmitter } from './event-emitter';
import { db } from './db';
import { apiLogger } from './logger';

/**
 * Send a notification to a user through all channels (DB + SSE + WebSocket + Queue)
 */
export async function sendNotification(data: {
  userId: string;
  title: string;
  message: string;
  type: string;
  link?: string;
}): Promise<void> {
  try {
    // Save to database
    const notification = await db.notification.create({ data });

    // Emit via SSE (for existing SSE-connected clients)
    sseEmitter.emit('new_notification', {
      userId: data.userId,
      notificationId: notification.id,
      title: data.title,
      message: data.message,
      type: data.type,
      timestamp: new Date().toISOString(),
    });

    // Send real-time via WebSocket (if available)
    sendRealtimeNotification(data.userId, {
      id: notification.id,
      title: data.title,
      message: data.message,
      type: data.type,
      link: data.link,
    });

    // Publish to queue for email/webhook processing
    await publishMessage('notification.send', {
      notificationId: notification.id,
      userId: data.userId,
      title: data.title,
    }).catch(() => {
      // Queue might not be available, that's OK
    });
  } catch (error) {
    apiLogger.error('Failed to send notification', {
      userId: data.userId,
      error: error instanceof Error ? error.message : String(error),
    });
  }
}

/**
 * Send shipment status update notification through all channels
 */
export async function notifyShipmentStatus(data: {
  shipmentId: string;
  customerId: string;
  trackingNumber: string;
  newStatus: string;
  location: string;
  updatedBy: string;
}): Promise<void> {
  // Emit via SSE (for existing SSE-connected clients)
  sseEmitter.emit('shipment_status_update', {
    shipmentId: data.shipmentId,
    newStatus: data.newStatus,
    updatedBy: data.updatedBy,
    timestamp: new Date().toISOString(),
    customerId: data.customerId,
    shipmentTrackingId: data.trackingNumber,
  });

  // Notify via WebSocket shipment room
  notifyShipmentUpdate(data.shipmentId, {
    shipmentId: data.shipmentId,
    trackingNumber: data.trackingNumber,
    newStatus: data.newStatus,
    location: data.location,
    timestamp: new Date().toISOString(),
  });

  // Send user notification (DB + SSE + WebSocket + Queue)
  await sendNotification({
    userId: data.customerId,
    title: 'Shipment Status Update',
    message: `Shipment ${data.trackingNumber} is now ${data.newStatus.replace(/_/g, ' ')}`,
    type: 'SHIPMENT_UPDATE',
    link: `shipment-detail`,
  });

  // Notify admins via WebSocket role room
  notifyRole('ADMIN', 'shipment:status_changed', {
    shipmentId: data.shipmentId,
    trackingNumber: data.trackingNumber,
    newStatus: data.newStatus,
    location: data.location,
    customerId: data.customerId,
    updatedBy: data.updatedBy,
    timestamp: new Date().toISOString(),
  });
}

/**
 * Send a payment update notification through all channels
 */
export async function notifyPaymentUpdate(data: {
  paymentId: string;
  shipmentId: string;
  userId: string;
  status: string;
  amount?: number;
}): Promise<void> {
  // Emit via SSE
  sseEmitter.emit('payment_update', {
    paymentId: data.paymentId,
    shipmentId: data.shipmentId,
    status: data.status,
    amount: data.amount,
    timestamp: new Date().toISOString(),
  });

  // Notify via WebSocket
  notifyUser(data.userId, 'payment:updated', {
    paymentId: data.paymentId,
    shipmentId: data.shipmentId,
    status: data.status,
    amount: data.amount,
    timestamp: new Date().toISOString(),
  });

  // Send in-app notification
  await sendNotification({
    userId: data.userId,
    title: 'Payment Update',
    message: `Payment ${data.paymentId} status: ${data.status}`,
    type: data.status === 'COMPLETED' ? 'SUCCESS' : 'INFO',
  });
}

const realtime = {
  sendNotification,
  notifyShipmentStatus,
  notifyPaymentUpdate,
};

export default realtime;
