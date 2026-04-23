'use client';

import React from 'react';
import { useAppStore } from '@/lib/store';
import { SunIcon, MoonIcon } from '@/components/icons';

export default function ThemeToggle() {
  const { theme, toggleTheme } = useAppStore();

  return (
    <button
      onClick={toggleTheme}
      className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors"
      aria-label={theme === 'light' ? 'Switch to dark mode' : 'Switch to light mode'}
      title={theme === 'light' ? 'Switch to dark mode' : 'Switch to light mode'}
    >
      {theme === 'light' ? (
        <MoonIcon className="w-5 h-5 text-slate-500 dark:text-slate-300" />
      ) : (
        <SunIcon className="w-5 h-5 text-slate-300" />
      )}
    </button>
  );
}
