'use client';

import React from 'react';
import { SHIPMENT_STATUS_LABELS, SHIPMENT_STATUS_COLORS } from '@/lib/shipping';
import { STATUS_FLOW, getStatusIndex } from '@/lib/status-flow';

interface StatusFlowBarProps {
  currentStatus: string;
  variant?: 'full' | 'compact';
}

export default function StatusFlowBar({ currentStatus, variant = 'full' }: StatusFlowBarProps) {
  const currentIdx = getStatusIndex(currentStatus);
  const progress = ((currentIdx + 1) / STATUS_FLOW.length) * 100;

  if (variant === 'compact') {
    return (
      <div className="mt-3 overflow-x-auto">
        <div className="flex gap-1 min-w-max">
          {STATUS_FLOW.map((status, i) => (
            <div key={status} className="flex flex-col items-center" style={{ minWidth: '60px' }}>
              <div className={`w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-bold transition-all ${
                i < currentIdx ? 'bg-emerald-500 text-white' :
                i === currentIdx ? 'bg-emerald-500 text-white ring-3 ring-emerald-500/20' :
                'bg-slate-200 text-slate-400'
              }`}>
                {i < currentIdx ? '✓' : i + 1}
              </div>
              <span className={`text-[8px] mt-1 text-center leading-tight ${i <= currentIdx ? 'text-emerald-600 font-medium' : 'text-slate-300'}`}>
                {SHIPMENT_STATUS_LABELS[status].split(' ').slice(0, 2).join(' ')}
              </span>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="flex justify-between text-xs text-slate-400 mb-2">
        <span>Progress</span>
        <span>{Math.round(progress)}%</span>
      </div>
      <div className="w-full h-2.5 bg-slate-100 rounded-full overflow-hidden">
        <div
          className="h-full bg-gradient-to-r from-emerald-500 to-emerald-400 rounded-full transition-all duration-700"
          style={{ width: `${progress}%` }}
        />
      </div>
      <div className="mt-3 grid grid-cols-11 gap-0">
        {STATUS_FLOW.map((status, i) => (
          <div key={status} className="text-center">
            <div className={`w-2 h-2 rounded-full mx-auto mb-1 transition-colors ${
              i <= currentIdx ? 'bg-emerald-500' : 'bg-slate-200'
            }`} />
            <span className={`text-[7px] leading-tight block ${
              i <= currentIdx ? 'text-emerald-600 font-medium' : 'text-slate-300'
            }`}>
              {SHIPMENT_STATUS_LABELS[status].split(' ')[0]}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
