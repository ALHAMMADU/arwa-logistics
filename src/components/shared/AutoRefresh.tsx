'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { RefreshIcon } from '@/components/icons';

interface AutoRefreshProps {
  interval?: number; // seconds, default 30
  onRefresh: () => void;
  lastUpdated?: Date | null;
}

export default function AutoRefresh({
  interval = 30,
  onRefresh,
  lastUpdated = null,
}: AutoRefreshProps) {
  const [autoEnabled, setAutoEnabled] = useState(true);
  const [countdown, setCountdown] = useState(interval);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [tick, setTick] = useState(0);
  const onRefreshRef = useRef(onRefresh);

  useEffect(() => {
    onRefreshRef.current = onRefresh;
  }, [onRefresh]);

  // Global 1-second tick for countdown and "seconds ago"
  useEffect(() => {
    const timer = setInterval(() => {
      setTick((t) => t + 1);
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Countdown tracking
  useEffect(() => {
    if (!autoEnabled) return;
    setCountdown((prev) => {
      if (prev <= 1) {
        // Trigger refresh
        setIsRefreshing(true);
        onRefreshRef.current();
        setTimeout(() => setIsRefreshing(false), 1000);
        return interval;
      }
      return prev - 1;
    });
  }, [tick, autoEnabled, interval]);

  // Compute seconds ago from lastUpdated
  const secondsAgo = lastUpdated
    ? Math.floor((Date.now() - lastUpdated.getTime()) / 1000)
    : 0;

  const handleManualRefresh = useCallback(() => {
    setIsRefreshing(true);
    onRefreshRef.current();
    setCountdown(interval);
    setTimeout(() => setIsRefreshing(false), 1000);
  }, [interval]);

  // Format seconds ago display
  const formatAgo = (secs: number): string => {
    if (secs < 5) return 'just now';
    if (secs < 60) return `${secs}s ago`;
    const mins = Math.floor(secs / 60);
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    return `${hrs}h ago`;
  };

  // Progress percentage for countdown bar
  const progressPercent = autoEnabled ? ((interval - countdown) / interval) * 100 : 0;

  return (
    <div className="inline-flex items-center gap-2 text-xs text-slate-500 select-none">
      {/* Last updated indicator */}
      {lastUpdated && (
        <span className="text-slate-400">
          Updated {formatAgo(secondsAgo)}
        </span>
      )}

      {/* Countdown bar */}
      {autoEnabled && (
        <div className="w-12 h-1 bg-slate-200 rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-1000 ease-linear ${
              isRefreshing ? 'bg-emerald-400' : 'bg-emerald-500'
            }`}
            style={{ width: `${progressPercent}%` }}
          />
        </div>
      )}

      {/* Auto-refresh toggle */}
      <button
        onClick={() => setAutoEnabled(!autoEnabled)}
        className={`flex items-center gap-1 px-2 py-1 rounded-md text-xs font-medium transition-colors ${
          autoEnabled
            ? 'bg-emerald-50 text-emerald-600 hover:bg-emerald-100'
            : 'bg-slate-100 text-slate-400 hover:bg-slate-200'
        }`}
        title={autoEnabled ? 'Auto-refresh enabled' : 'Auto-refresh disabled'}
      >
        <span className={`w-1.5 h-1.5 rounded-full ${autoEnabled ? 'bg-emerald-500 animate-pulse' : 'bg-slate-300'}`} />
        Auto
      </button>

      {/* Manual refresh button */}
      <button
        onClick={handleManualRefresh}
        disabled={isRefreshing}
        className="p-1.5 rounded-md hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors disabled:opacity-50"
        title="Refresh now"
      >
        <RefreshIcon className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />
      </button>

      {/* Countdown text when auto is on */}
      {autoEnabled && (
        <span className="text-slate-300 tabular-nums">
          {countdown}s
        </span>
      )}
    </div>
  );
}
