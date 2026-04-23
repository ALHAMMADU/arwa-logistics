'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useAppStore } from '@/lib/store';

interface SSEEvent {
  type: string;
  data: any;
}

interface UseSSEReturn {
  events: SSEEvent[];
  connected: boolean;
  lastEvent: SSEEvent | null;
  reconnectCount: number;
}

const MAX_RETRIES = 5;
const INITIAL_BACKOFF = 1000; // 1 second
const MAX_BACKOFF = 30000; // 30 seconds

export function useSSE(): UseSSEReturn {
  const { isAuthenticated, token } = useAppStore();
  const [connected, setConnected] = useState(false);
  const [events, setEvents] = useState<SSEEvent[]>([]);
  const [lastEvent, setLastEvent] = useState<SSEEvent | null>(null);
  const [reconnectCount, setReconnectCount] = useState(0);
  const eventSourceRef = useRef<EventSource | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const mountedRef = useRef(true);
  const connectRef = useRef<() => void>(() => {});

  const connect = useCallback(() => {
    if (!isAuthenticated || !token) return;
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
    }

    // Build URL with token as query param since EventSource doesn't support headers
    const url = `/api/events?token=${encodeURIComponent(token)}`;
    const es = new EventSource(url);
    eventSourceRef.current = es;

    es.onopen = () => {
      if (!mountedRef.current) return;
      setConnected(true);
      setReconnectCount(0);
    };

    es.onmessage = (event) => {
      if (!mountedRef.current) return;
      try {
        const data = JSON.parse(event.data);
        const sseEvent: SSEEvent = {
          type: 'message',
          data,
        };
        setLastEvent(sseEvent);
        setEvents(prev => {
          // Keep last 50 events to avoid memory issues
          const updated = [...prev, sseEvent];
          return updated.slice(-50);
        });
      } catch {
        // Ignore malformed data
      }
    };

    // Handle named events
    const handleNamedEvent = (eventType: string) => {
      es.addEventListener(eventType, (event: MessageEvent) => {
        if (!mountedRef.current) return;
        try {
          const data = JSON.parse(event.data);
          const sseEvent: SSEEvent = {
            type: eventType,
            data,
          };
          setLastEvent(sseEvent);
          setEvents(prev => {
            const updated = [...prev, sseEvent];
            return updated.slice(-50);
          });
        } catch {
          // Ignore malformed data
        }
      });
    };

    // Subscribe to specific event types
    handleNamedEvent('shipment_status_update');
    handleNamedEvent('new_notification');
    handleNamedEvent('payment_update');
    handleNamedEvent('connected');
    handleNamedEvent('heartbeat');

    es.onerror = () => {
      if (!mountedRef.current) return;
      setConnected(false);
      es.close();
      eventSourceRef.current = null;

      // Exponential backoff reconnection
      setReconnectCount(prev => {
        const newCount = prev + 1;
        if (newCount <= MAX_RETRIES) {
          const backoff = Math.min(INITIAL_BACKOFF * Math.pow(2, newCount - 1), MAX_BACKOFF);
          // Add some jitter
          const jitter = backoff * (0.5 + Math.random() * 0.5);
          reconnectTimeoutRef.current = setTimeout(() => {
            if (mountedRef.current) {
              connectRef.current();
            }
          }, jitter);
        }
        return newCount;
      });
    };
  }, [isAuthenticated, token]);

  // Keep the ref updated
  useEffect(() => {
    connectRef.current = connect;
  }, [connect]);

  // Connect on mount / when auth changes
  useEffect(() => {
    mountedRef.current = true;

    if (isAuthenticated && token) {
      connect();
    }

    return () => {
      mountedRef.current = false;
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
        eventSourceRef.current = null;
      }
      setConnected(false);
    };
  }, [isAuthenticated, token, connect]);

  return { events, connected, lastEvent, reconnectCount };
}
