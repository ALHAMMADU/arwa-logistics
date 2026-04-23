'use client';

import React, { useEffect, useCallback, createContext, useContext, useRef } from 'react';
import { useSSE } from '@/hooks/use-sse';
import { useAppStore } from '@/lib/store';
import { toast } from 'sonner';
import { useI18n } from '@/lib/i18n';

// Connection status context for other components to use
interface RealtimeContextType {
  connected: boolean;
  reconnectCount: number;
}

const RealtimeContext = createContext<RealtimeContextType>({
  connected: false,
  reconnectCount: 0,
});

export function useRealtimeStatus() {
  return useContext(RealtimeContext);
}

// Status i18n key paths for shipment updates
const STATUS_I18N_KEYS: Record<string, string> = {
  CREATED: 'status.created',
  WAITING_WAREHOUSE_ARRIVAL: 'status.waitingWarehouse',
  RECEIVED_AT_WAREHOUSE: 'status.receivedWarehouse',
  PROCESSING: 'status.processing',
  READY_FOR_DISPATCH: 'status.readyDispatch',
  DISPATCHED: 'status.dispatched',
  IN_TRANSIT: 'status.inTransit',
  ARRIVED_AT_DESTINATION: 'status.arrivedDestination',
  CUSTOMS_CLEARANCE: 'status.customsClearance',
  OUT_FOR_DELIVERY: 'status.outDelivery',
  DELIVERED: 'status.delivered',
};

interface RealtimeProviderProps {
  children: React.ReactNode;
}

export default function RealtimeProvider({ children }: RealtimeProviderProps) {
  const { events, connected, lastEvent, reconnectCount } = useSSE();
  const { user } = useAppStore();
  const { t } = useI18n();
  const processedEventsRef = useRef<Set<string>>(new Set());

  // Process incoming events and show toasts
  const processEvent = useCallback((event: { type: string; data: any }) => {
    // Deduplicate events by using a combination of type + timestamp + data
    const eventKey = `${event.type}-${JSON.stringify(event.data)}`;
    if (processedEventsRef.current.has(eventKey)) return;

    // Keep the set from growing too large
    if (processedEventsRef.current.size > 200) {
      const entries = Array.from(processedEventsRef.current);
      processedEventsRef.current = new Set(entries.slice(-100));
    }
    processedEventsRef.current.add(eventKey);

    switch (event.type) {
      case 'shipment_status_update': {
        const data = event.data;
        const statusLabel = STATUS_I18N_KEYS[data.newStatus] ? t(STATUS_I18N_KEYS[data.newStatus]) : data.newStatus;
        const isRelevant = !data.customerId || data.customerId === user?.id || user?.role === 'ADMIN' || user?.role === 'WAREHOUSE_STAFF';

        if (isRelevant) {
          const description = data.shipmentTrackingId
            ? t('realtime.shipmentTrackingStatus', { trackingId: data.shipmentTrackingId, status: statusLabel })
            : t('realtime.shipmentStatusUpdatedTo', { status: statusLabel });

          if (data.newStatus === 'DELIVERED') {
            toast.success(t('realtime.shipmentDelivered'), {
              description,
              duration: 6000,
            });
          } else {
            toast.info(t('realtime.shipmentStatusUpdate'), {
              description,
              duration: 5000,
            });
          }
        }
        break;
      }

      case 'new_notification': {
        const data = event.data;
        const isRelevant = !data.userId || data.userId === user?.id || user?.role === 'ADMIN';

        if (isRelevant) {
          toast.info(data.title || t('realtime.newNotification'), {
            description: data.message,
            duration: 5000,
          });
        }
        break;
      }

      case 'payment_update': {
        const data = event.data;
        toast.info(t('realtime.paymentUpdate'), {
          description: `Payment ${data.paymentId}: ${data.status}`,
          duration: 5000,
        });
        break;
      }

      case 'connected':
        // Connection confirmation - no toast needed
        break;

      case 'heartbeat':
        // Heartbeat - no action needed
        break;

      default:
        break;
    }
  }, [user?.id, user?.role, t]);

  // Process new events as they arrive
  useEffect(() => {
    if (lastEvent) {
      processEvent(lastEvent);
    }
  }, [lastEvent, processEvent]);

  // Show connection status toast on reconnection
  const prevConnectedRef = useRef(false);
  useEffect(() => {
    if (connected && !prevConnectedRef.current && user) {
      // Only show toast on reconnection, not initial connection
      if (prevConnectedRef.current !== undefined && reconnectCount > 0) {
        toast.success(t('realtime.connectionRestored'));
      }
    }
    if (!connected && prevConnectedRef.current && user) {
      toast.error(t('realtime.connectionLost'), {
        description: t('realtime.attemptingReconnect'),
        duration: 3000,
      });
    }
    prevConnectedRef.current = connected;
  }, [connected, user, reconnectCount, t]);

  return (
    <RealtimeContext.Provider value={{ connected, reconnectCount }}>
      {children}
    </RealtimeContext.Provider>
  );
}
