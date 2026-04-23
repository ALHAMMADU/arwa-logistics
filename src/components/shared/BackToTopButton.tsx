'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

export function BackToTopButton() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      // Check both window scroll and main content scroll
      const mainEl = document.querySelector('main');
      const scrollY = window.scrollY || mainEl?.scrollTop || 0;
      setVisible(scrollY > 400);
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    // Also listen on main element for dashboard layout
    const mainEl = document.querySelector('main');
    mainEl?.addEventListener('scroll', handleScroll, { passive: true });

    return () => {
      window.removeEventListener('scroll', handleScroll);
      mainEl?.removeEventListener('scroll', handleScroll);
    };
  }, []);

  const scrollToTop = () => {
    const mainEl = document.querySelector('main');
    if (mainEl) {
      mainEl.scrollTo({ top: 0, behavior: 'smooth' });
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <AnimatePresence>
      {visible && (
        <motion.button
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.8 }}
          transition={{ duration: 0.2 }}
          onClick={scrollToTop}
          className="fixed bottom-24 z-40 right-6 rtl:right-auto rtl:left-6 w-10 h-10 rounded-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-lg flex items-center justify-center text-slate-600 dark:text-slate-300 hover:text-emerald-600 dark:hover:text-emerald-400 hover:border-emerald-300 dark:hover:border-emerald-600 transition-colors"
          aria-label="Back to top"
        >
          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M18 15l-6-6-6 6" />
          </svg>
        </motion.button>
      )}
    </AnimatePresence>
  );
}
