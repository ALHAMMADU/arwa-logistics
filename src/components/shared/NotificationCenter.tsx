'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useAppStore } from '@/lib/store';
import { apiFetch } from '@/lib/api';
import { BellIcon, XIcon, PackageIcon, CheckCircleIcon, ClockIcon, TruckIcon } from '@/components/icons';
import { useI18n } from '@/lib/i18n';

interface Notification {
  id: string;
  shipmentId: string;
  status: string;
  location?: string;
  timestamp: string;
  read: boolean;
}

// Status-to-color mapping for notification badges
const STATUS_NOTIFICATION_COLORS: Record<string, string> = {
  CREATED: 'bg-blue-500',
  WAITING_WAREHOUSE_ARRIVAL: 'bg-yellow-500',
  RECEIVED_AT_WAREHOUSE: 'bg-orange-500',
  PROCESSING: 'bg-purple-500',
  READY_FOR_DISPATCH: 'bg-indigo-500',
  DISPATCHED: 'bg-cyan-500',
  IN_TRANSIT: 'bg-teal-500',
  ARRIVED_AT_DESTINATION: 'bg-emerald-500',
  CUSTOMS_CLEARANCE: 'bg-amber-500',
  OUT_FOR_DELIVERY: 'bg-lime-500',
  DELIVERED: 'bg-green-500',
};

const STATUS_LABELS: Record<string, string> = {
  CREATED: 'Shipment Created',
  WAITING_WAREHOUSE_ARRIVAL: 'Waiting Warehouse Arrival',
  RECEIVED_AT_WAREHOUSE: 'Received at Warehouse',
  PROCESSING: 'Processing',
  READY_FOR_DISPATCH: 'Ready for Dispatch',
  DISPATCHED: 'Dispatched',
  IN_TRANSIT: 'In Transit',
  ARRIVED_AT_DESTINATION: 'Arrived at Destination',
  CUSTOMS_CLEARANCE: 'Customs Clearance',
  OUT_FOR_DELIVERY: 'Out for Delivery',
  DELIVERED: 'Delivered',
};

function getStatusIcon(status: string) {
  switch (status) {
    case 'DELIVERED':
      return <CheckCircleIcon className="w-4 h-4 text-green-600" />;
    case 'IN_TRANSIT':
    case 'DISPATCHED':
      return <TruckIcon className="w-4 h-4 text-teal-600" />;
    case 'CREATED':
      return <PackageIcon className="w-4 h-4 text-blue-600" />;
    default:
      return <ClockIcon className="w-4 h-4 text-amber-600" />;
  }
}

function formatTimeAgo(timestamp: string): string {
  const now = new Date();
  const time = new Date(timestamp);
  const diffMs = now.getTime() - time.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return time.toLocaleDateString();
}

export default function NotificationCenter() {
  const { setCurrentPage, setSelectedShipmentId } = useAppStore();
  const { isRTL } = useI18n();
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  const unreadCount = notifications.filter(n => !n.read).length;

  const [refreshKey, setRefreshKey] = useState(0);

  // Fetch notifications
  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    async function load() {
      try {
        const res = await apiFetch('/notifications');
        if (!cancelled && res.success && res.data) {
          setNotifications(res.data);
        }
      } catch {
        // silently fail
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => { cancelled = true; };
  }, [refreshKey]);

  // Auto-refresh every 30 seconds
  useEffect(() => {
    const interval = setInterval(() => setRefreshKey(k => k + 1), 30000);
    return () => clearInterval(interval);
  }, []);

  const fetchNotifications = useCallback(() => setRefreshKey(k => k + 1), []);

  // Close on click outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        panelRef.current &&
        buttonRef.current &&
        !panelRef.current.contains(event.target as Node) &&
        !buttonRef.current.contains(event.target as Node)
      ) {
        setOpen(false);
      }
    }
    if (open) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [open]);

  // Mark all as read
  const handleMarkAllRead = async () => {
    try {
      await apiFetch('/notifications', {
        method: 'PUT',
        body: JSON.stringify({ markAllRead: true }),
      });
      setNotifications(prev => prev.map(n => ({ ...n, read: true })));
    } catch {
      // silently fail
    }
  };

  // Click notification to navigate
  const handleNotificationClick = (notification: Notification) => {
    // Mark as read locally
    setNotifications(prev =>
      prev.map(n => (n.id === notification.id ? { ...n, read: true } : n))
    );
    // Navigate to shipment detail
    setSelectedShipmentId(notification.shipmentId);
    setCurrentPage('shipment-detail');
    setOpen(false);
  };

  return (
    <div className="relative">
      {/* Bell button */}
      <button
        ref={buttonRef}
        onClick={() => setOpen(!open)}
        className="relative p-2 hover:bg-slate-100 rounded-lg transition-colors"
        aria-label="Notifications"
      >
        <BellIcon className="w-5 h-5 text-slate-600" />
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 flex items-center justify-center min-w-[18px] h-[18px] px-1 text-[10px] font-bold text-white bg-red-500 rounded-full">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown Panel */}
      {open && (
        <div
          ref={panelRef}
          className={`absolute ${isRTL ? 'left-0' : 'right-0'} top-full mt-2 w-80 sm:w-96 bg-white rounded-xl border border-slate-200 shadow-xl z-50 overflow-hidden`}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100 bg-slate-50">
            <div className="flex items-center gap-2">
              <BellIcon className="w-4 h-4 text-slate-600" />
              <h3 className="text-sm font-semibold text-slate-900">Notifications</h3>
              {unreadCount > 0 && (
                <span className="px-1.5 py-0.5 text-[10px] font-bold text-white bg-red-500 rounded-full">
                  {unreadCount}
                </span>
              )}
            </div>
            <div className="flex items-center gap-1">
              {unreadCount > 0 && (
                <button
                  onClick={handleMarkAllRead}
                  className="text-xs text-emerald-600 hover:text-emerald-700 font-medium px-2 py-1 hover:bg-emerald-50 rounded transition-colors"
                >
                  Mark all read
                </button>
              )}
              <button
                onClick={() => setOpen(false)}
                className="p-1 hover:bg-slate-200 rounded transition-colors"
              >
                <XIcon className="w-4 h-4 text-slate-400" />
              </button>
            </div>
          </div>

          {/* Notification List */}
          <div className="max-h-96 overflow-y-auto">
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-emerald-600" />
              </div>
            ) : notifications.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-10 px-4">
                <BellIcon className="w-10 h-10 text-slate-300 mb-3" />
                <p className="text-sm text-slate-500 font-medium">No notifications yet</p>
                <p className="text-xs text-slate-400 mt-1">We&apos;ll notify you when shipments are updated</p>
              </div>
            ) : (
              <div className="divide-y divide-slate-50">
                {notifications.map((notification) => (
                  <button
                    key={notification.id}
                    onClick={() => handleNotificationClick(notification)}
                    className={`w-full text-left px-4 py-3 hover:bg-slate-50 transition-colors flex gap-3 ${
                      !notification.read ? 'bg-emerald-50/50' : ''
                    }`}
                  >
                    {/* Status color indicator */}
                    <div className="flex-shrink-0 mt-0.5">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                        notification.read ? 'bg-slate-100' : 'bg-white border border-slate-200'
                      }`}>
                        {getStatusIcon(notification.status)}
                      </div>
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-0.5">
                        <span className="text-xs font-mono text-slate-600 font-medium">
                          {notification.shipmentId}
                        </span>
                        {!notification.read && (
                          <span className="w-2 h-2 bg-emerald-500 rounded-full flex-shrink-0" />
                        )}
                      </div>
                      <div className="flex items-center gap-1.5 mb-1">
                        <span className={`inline-block w-2 h-2 rounded-full ${STATUS_NOTIFICATION_COLORS[notification.status] || 'bg-slate-400'}`} />
                        <span className="text-sm text-slate-800 font-medium truncate">
                          {STATUS_LABELS[notification.status] || notification.status}
                        </span>
                      </div>
                      {notification.location && (
                        <p className="text-xs text-slate-500 truncate">{notification.location}</p>
                      )}
                      <p className="text-[11px] text-slate-400 mt-1">{formatTimeAgo(notification.timestamp)}</p>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
