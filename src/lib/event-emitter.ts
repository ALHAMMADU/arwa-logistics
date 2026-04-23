// Simple typed SSE Event Emitter for server-side event broadcasting
// Singleton pattern to ensure a single emitter instance across the app

type EventHandler = (data: any) => void;

class SSEEventEmitter {
  private handlers: Map<string, Set<EventHandler>> = new Map();

  /**
   * Subscribe to an event
   */
  on(event: string, handler: EventHandler): void {
    if (!this.handlers.has(event)) {
      this.handlers.set(event, new Set());
    }
    this.handlers.get(event)!.add(handler);
  }

  /**
   * Unsubscribe from an event
   */
  off(event: string, handler: EventHandler): void {
    const eventHandlers = this.handlers.get(event);
    if (eventHandlers) {
      eventHandlers.delete(handler);
      // Clean up empty sets
      if (eventHandlers.size === 0) {
        this.handlers.delete(event);
      }
    }
  }

  /**
   * Emit an event to all subscribers
   */
  emit(event: string, data: any): void {
    const eventHandlers = this.handlers.get(event);
    if (eventHandlers) {
      eventHandlers.forEach(handler => {
        try {
          handler(data);
        } catch (error) {
          console.error(`Error in event handler for "${event}":`, error);
        }
      });
    }
  }

  /**
   * Get all registered event names
   */
  getEventNames(): string[] {
    return Array.from(this.handlers.keys());
  }

  /**
   * Get the number of handlers for a specific event
   */
  getHandlerCount(event: string): number {
    return this.handlers.get(event)?.size || 0;
  }

  /**
   * Remove all handlers for a specific event
   */
  removeAllHandlers(event?: string): void {
    if (event) {
      this.handlers.delete(event);
    } else {
      this.handlers.clear();
    }
  }
}

// Singleton instance
export const sseEmitter = new SSEEventEmitter();

// Event types for type safety
export type SSEEventType =
  | 'shipment_status_update'
  | 'new_notification'
  | 'payment_update'
  | 'heartbeat';

export interface ShipmentStatusUpdateEvent {
  shipmentId: string;
  newStatus: string;
  updatedBy: string;
  timestamp: string;
  customerId?: string;
  shipmentTrackingId?: string;
}

export interface NewNotificationEvent {
  userId: string;
  notificationId: string;
  title: string;
  message: string;
  type: string;
  timestamp: string;
}

export interface PaymentUpdateEvent {
  paymentId: string;
  shipmentId: string;
  status: string;
  amount?: number;
  timestamp: string;
}
