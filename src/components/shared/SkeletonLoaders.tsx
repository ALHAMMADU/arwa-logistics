'use client';

import React from 'react';

// ─── Base Skeleton Block ──────────────────────────────────

function SkeletonBlock({ className = '' }: { className?: string }) {
  return <div className={`animate-pulse rounded bg-slate-200 dark:bg-slate-700 ${className}`} />;
}

// ─── SkeletonCard ─────────────────────────────────────────

interface SkeletonCardProps {
  rows?: number;
  showAvatar?: boolean;
  showFooter?: boolean;
}

export function SkeletonCard({ rows = 3, showAvatar = false, showFooter = false }: SkeletonCardProps) {
  return (
    <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-6 space-y-4">
      <div className="flex items-center gap-3">
        {showAvatar && <SkeletonBlock className="h-10 w-10 rounded-full shrink-0" />}
        <div className="flex-1 space-y-2">
          <SkeletonBlock className="h-4 w-3/4" />
          <SkeletonBlock className="h-3 w-1/2" />
        </div>
      </div>
      <div className="space-y-2">
        {Array.from({ length: rows }).map((_, i) => (
          <SkeletonBlock key={i} className={`h-3 ${i === rows - 1 ? 'w-2/3' : 'w-full'}`} />
        ))}
      </div>
      {showFooter && (
        <div className="flex gap-3 pt-2">
          <SkeletonBlock className="h-8 w-20 rounded-lg" />
          <SkeletonBlock className="h-8 w-20 rounded-lg" />
        </div>
      )}
    </div>
  );
}

// ─── SkeletonTable ────────────────────────────────────────

interface SkeletonTableProps {
  rows?: number;
  columns?: number;
}

export function SkeletonTable({ rows = 5, columns = 5 }: SkeletonTableProps) {
  return (
    <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 overflow-hidden">
      {/* Header */}
      <div className="bg-slate-50 dark:bg-slate-900 border-b border-slate-200 dark:border-slate-700 px-4 py-3">
        <div className="flex gap-4">
          {Array.from({ length: columns }).map((_, i) => (
            <SkeletonBlock key={i} className={`h-3 ${i === 0 ? 'w-20' : i === columns - 1 ? 'w-16' : 'w-24'}`} />
          ))}
        </div>
      </div>
      {/* Rows */}
      <div className="divide-y divide-slate-100 dark:divide-slate-700">
        {Array.from({ length: rows }).map((_, rowIdx) => (
          <div key={rowIdx} className="px-4 py-3">
            <div className="flex gap-4 items-center">
              {Array.from({ length: columns }).map((_, colIdx) => (
                <SkeletonBlock
                  key={colIdx}
                  className={`h-3.5 ${
                    colIdx === 0
                      ? 'w-20'
                      : colIdx === columns - 1
                        ? 'w-16'
                        : colIdx === 1
                          ? 'w-32'
                          : 'w-24'
                  }`}
                />
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── SkeletonChart ────────────────────────────────────────

interface SkeletonChartProps {
  height?: string;
  showLegend?: boolean;
}

export function SkeletonChart({ height = 'h-[280px]', showLegend = true }: SkeletonChartProps) {
  return (
    <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-6">
      <div className="flex items-center gap-2 mb-4">
        <SkeletonBlock className="h-5 w-5 rounded" />
        <SkeletonBlock className="h-4 w-40" />
      </div>
      <SkeletonBlock className="h-3 w-56 mb-4" />
      <div className={`${height} relative`}>
        {/* Y axis */}
        <div className="absolute left-0 top-0 bottom-6 w-8 flex flex-col justify-between">
          {Array.from({ length: 5 }).map((_, i) => (
            <SkeletonBlock key={i} className="h-2 w-6" />
          ))}
        </div>
        {/* Chart area */}
        <div className="ml-10 mr-2 top-0 bottom-6 absolute inset-y-0 right-2 flex items-end gap-1">
          {Array.from({ length: 12 }).map((_, i) => (
            <div
              key={i}
              className="animate-pulse rounded-t bg-slate-200 dark:bg-slate-700 flex-1"
              style={{ height: `${20 + ((i * 7 + 13) % 6) * 13}%` }}
            />
          ))}
        </div>
        {/* X axis */}
        <div className="absolute bottom-0 left-10 right-2 flex justify-between">
          {Array.from({ length: 6 }).map((_, i) => (
            <SkeletonBlock key={i} className="h-2 w-8" />
          ))}
        </div>
      </div>
      {showLegend && (
        <div className="flex gap-4 mt-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="flex items-center gap-2">
              <SkeletonBlock className="h-3 w-3 rounded-full" />
              <SkeletonBlock className="h-3 w-16" />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── SkeletonStats ────────────────────────────────────────

interface SkeletonStatsProps {
  count?: number;
}

export function SkeletonStats({ count = 4 }: SkeletonStatsProps) {
  return (
    <div className={`grid gap-4 ${count <= 4 ? 'grid-cols-2 md:grid-cols-4' : count <= 6 ? 'grid-cols-2 md:grid-cols-3 lg:grid-cols-6' : 'grid-cols-2 md:grid-cols-4 lg:grid-cols-6'}`}>
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-4 space-y-3"
        >
          <div className="flex items-center justify-between">
            <SkeletonBlock className="h-9 w-9 rounded-lg" />
            <SkeletonBlock className="h-6 w-16" />
          </div>
          <SkeletonBlock className="h-7 w-20" />
          <SkeletonBlock className="h-3 w-24" />
        </div>
      ))}
    </div>
  );
}

// ─── SkeletonTimeline ─────────────────────────────────────

interface SkeletonTimelineProps {
  events?: number;
}

export function SkeletonTimeline({ events = 4 }: SkeletonTimelineProps) {
  return (
    <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-6">
      <SkeletonBlock className="h-5 w-40 mb-6" />
      <div className="space-y-0">
        {Array.from({ length: events }).map((_, i) => (
          <div key={i} className="flex gap-4">
            <div className="flex flex-col items-center">
              <SkeletonBlock className="h-3 w-3 rounded-full" />
              {i < events - 1 && <SkeletonBlock className="w-0.5 h-12 mt-1" />}
            </div>
            <div className="pb-6 flex-1">
              <SkeletonBlock className="h-4 w-48 mb-2" />
              <SkeletonBlock className="h-3 w-32 mb-1" />
              <SkeletonBlock className="h-3 w-40" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── SkeletonForm ─────────────────────────────────────────

interface SkeletonFormProps {
  fields?: number;
  showSubmit?: boolean;
}

export function SkeletonForm({ fields = 5, showSubmit = true }: SkeletonFormProps) {
  return (
    <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-6 space-y-5">
      <SkeletonBlock className="h-5 w-48 mb-2" />
      {Array.from({ length: fields }).map((_, i) => (
        <div key={i} className="space-y-2">
          <SkeletonBlock className="h-3 w-24" />
          <SkeletonBlock className="h-10 w-full rounded-lg" />
        </div>
      ))}
      {showSubmit && (
        <div className="flex gap-3 pt-2">
          <SkeletonBlock className="h-10 w-28 rounded-lg" />
          <SkeletonBlock className="h-10 w-28 rounded-lg" />
        </div>
      )}
    </div>
  );
}

// ─── PageLoader ───────────────────────────────────────────

export function PageLoader({ message = 'Loading...' }: { message?: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-24">
      {/* Spinning ship icon animation */}
      <div className="relative mb-6">
        <div className="h-16 w-16 rounded-2xl bg-gradient-to-br from-emerald-500 to-emerald-600 flex items-center justify-center animate-spin shadow-lg shadow-emerald-500/25">
          <svg
            className="h-8 w-8 text-white"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M2 21c.6.5 1.2 1 2.5 1 2.5 0 2.5-2 5-2 1.3 0 1.9.5 2.5 1s1.2 1 2.5 1c2.5 0 2.5-2 5-2 1.3 0 1.9.5 2.5 1" />
            <path d="M19.38 20A11.6 11.6 0 0 0 21 14l-9-4-9 4c0 2.9.94 5.34 2.81 7.76" />
            <path d="M19 13V7a2 2 0 0 0-2-2H7a2 2 0 0 0-2 2v6" />
            <path d="M12 1v4" />
          </svg>
        </div>
        {/* Orbiting dot */}
        <div className="absolute -top-1 -right-1 h-3 w-3 rounded-full bg-emerald-400 animate-ping" />
      </div>
      {/* ARWA branding */}
      <div className="text-center">
        <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 tracking-wide">ARWA LOGISTICS</h3>
        <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">{message}</p>
      </div>
      {/* Progress bar animation */}
      <div className="mt-4 w-32 h-1 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
        <div className="h-full bg-gradient-to-r from-emerald-500 to-emerald-400 rounded-full animate-[shimmer_1.5s_ease-in-out_infinite]" />
      </div>
    </div>
  );
}
