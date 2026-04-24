'use client';

import React from 'react';
import { motion } from 'framer-motion';

interface EmptyStateProps {
  icon: React.ReactNode;
  title: string;
  description?: string;
  action?: {
    label: string;
    onClick: () => void;
  };
  className?: string;
}

export function EmptyState({ icon, title, description, action, className = '' }: EmptyStateProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className={`flex flex-col items-center justify-center py-16 px-6 text-center rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 ${className}`}
    >
      <div className="empty-state-icon mb-4 empty-state-float">
        {icon}
      </div>
      <h3 className="text-lg font-semibold text-slate-600 dark:text-slate-300 mb-2">{title}</h3>
      {description && (
        <p className="text-sm text-slate-400 dark:text-slate-500 max-w-sm">{description}</p>
      )}
      {action && (
        <motion.button
          whileHover={{ scale: 1.04 }}
          whileTap={{ scale: 0.97 }}
          onClick={action.onClick}
          className="mt-6 px-6 py-2.5 bg-emerald-600 text-white rounded-xl text-sm font-medium hover:bg-emerald-500 transition-colors shadow-sm hover:shadow-md shadow-emerald-500/20"
        >
          {action.label}
        </motion.button>
      )}
    </motion.div>
  );
}
