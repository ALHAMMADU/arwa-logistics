'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { apiFetch } from '@/lib/api';
import { useAppStore } from '@/lib/store';
import { SearchIcon, XIcon, PackageIcon, ClockIcon } from '@/components/icons';
import { SHIPMENT_STATUS_LABELS, SHIPMENT_STATUS_COLORS, SHIPPING_METHOD_LABELS } from '@/lib/shipping';

interface ShipmentResult {
  id: string;
  shipmentId: string;
  trackingNumber: string;
  destinationCity: string;
  destinationCountry: string;
  receiverName: string;
  senderName: string;
  status: string;
  shippingMethod: string;
  shipmentValue: number;
  customer?: { name: string; company?: string };
}

const RECENT_SEARCHES_KEY = 'arwa_recent_searches';
const MAX_RECENT = 5;

function getRecentSearches(): string[] {
  if (typeof window === 'undefined') return [];
  try {
    const stored = localStorage.getItem(RECENT_SEARCHES_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
}

function saveRecentSearch(query: string) {
  if (typeof window === 'undefined') return;
  try {
    const recent = getRecentSearches().filter((s) => s !== query);
    recent.unshift(query);
    if (recent.length > MAX_RECENT) recent.pop();
    localStorage.setItem(RECENT_SEARCHES_KEY, JSON.stringify(recent));
  } catch {
    // ignore
  }
}

// Combined search state to avoid cascading setState calls in effects
interface SearchState {
  query: string;
  results: ShipmentResult[];
  loading: boolean;
  selectedIndex: number;
  recentSearches: string[];
  recentVersion: number;
}

type SearchAction =
  | { type: 'SET_QUERY'; query: string }
  | { type: 'SEARCH_START' }
  | { type: 'SEARCH_COMPLETE'; results: ShipmentResult[] }
  | { type: 'SEARCH_ERROR' }
  | { type: 'SELECT_INDEX'; index: number }
  | { type: 'REFRESH_RECENT' }
  | { type: 'CLEAR_RECENT' }
  | { type: 'RESET' };

function searchReducer(state: SearchState, action: SearchAction): SearchState {
  switch (action.type) {
    case 'SET_QUERY':
      return {
        ...state,
        query: action.query,
        loading: action.query.trim().length > 0,
        results: action.query.trim().length > 0 ? state.results : [],
        selectedIndex: -1,
      };
    case 'SEARCH_START':
      return { ...state, loading: true };
    case 'SEARCH_COMPLETE':
      return { ...state, results: action.results, loading: false, selectedIndex: -1 };
    case 'SEARCH_ERROR':
      return { ...state, results: [], loading: false };
    case 'SELECT_INDEX':
      return { ...state, selectedIndex: action.index };
    case 'REFRESH_RECENT':
      return { ...state, recentSearches: getRecentSearches(), recentVersion: state.recentVersion + 1 };
    case 'CLEAR_RECENT':
      if (typeof window !== 'undefined') localStorage.removeItem(RECENT_SEARCHES_KEY);
      return { ...state, recentSearches: [] };
    case 'RESET':
      return {
        ...state,
        query: '',
        results: [],
        loading: false,
        selectedIndex: -1,
      };
    default:
      return state;
  }
}

export default function GlobalSearch({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const [state, dispatch] = React.useReducer(searchReducer, {
    query: '',
    results: [],
    loading: false,
    selectedIndex: -1,
    recentSearches: getRecentSearches(),
    recentVersion: 0,
  });

  const inputRef = useRef<HTMLInputElement>(null);
  const debounceRef = useRef<NodeJS.Timeout | null>(null);
  const { setSelectedShipmentId, setCurrentPage } = useAppStore();

  // Auto-focus when opening + refresh recent searches
  useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 100);
      dispatch({ type: 'REFRESH_RECENT' });
    }
  }, [open]);

  // Keyboard shortcut: Ctrl+K / Cmd+K
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        onOpenChange(!open);
      }
      if (e.key === 'Escape' && open) {
        onOpenChange(false);
      }
    }
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [open, onOpenChange]);

  // Debounced search
  const doSearch = useCallback(async (q: string) => {
    if (!q.trim()) return;
    try {
      const res = await apiFetch(`/shipments?search=${encodeURIComponent(q)}&limit=10`);
      if (res.success) {
        dispatch({ type: 'SEARCH_COMPLETE', results: res.data?.shipments || [] });
      } else {
        dispatch({ type: 'SEARCH_COMPLETE', results: [] });
      }
    } catch {
      dispatch({ type: 'SEARCH_ERROR' });
    }
  }, []);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (!state.query.trim()) return;
    debounceRef.current = setTimeout(() => {
      doSearch(state.query);
    }, 300);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [state.query, doSearch]);

  const totalItems = state.results.length;

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      dispatch({ type: 'SELECT_INDEX', index: state.selectedIndex < totalItems - 1 ? state.selectedIndex + 1 : 0 });
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      dispatch({ type: 'SELECT_INDEX', index: state.selectedIndex > 0 ? state.selectedIndex - 1 : totalItems - 1 });
    } else if (e.key === 'Enter' && state.selectedIndex >= 0 && state.selectedIndex < totalItems) {
      e.preventDefault();
      selectResult(state.results[state.selectedIndex]);
    }
  }

  function selectResult(shipment: ShipmentResult) {
    saveRecentSearch(state.query);
    setSelectedShipmentId(shipment.id);
    setCurrentPage('shipment-detail');
    onOpenChange(false);
  }

  function handleClose() {
    dispatch({ type: 'RESET' });
    onOpenChange(false);
  }

  function handleQueryChange(e: React.ChangeEvent<HTMLInputElement>) {
    dispatch({ type: 'SET_QUERY', query: e.target.value });
  }

  function handleClearQuery() {
    dispatch({ type: 'SET_QUERY', query: '' });
    inputRef.current?.focus();
  }

  const hasQuery = state.query.trim().length > 0;
  const visibleResults = hasQuery ? state.results : [];
  const showResults = hasQuery;
  const showRecent = !hasQuery && state.recentSearches.length > 0;
  const showNoResults = showResults && visibleResults.length === 0 && !state.loading;

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Backdrop */}
          <motion.div
            key="search-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm"
            onClick={handleClose}
          />

          {/* Modal */}
          <div className="fixed inset-0 z-50 flex items-start justify-center pt-[15vh]">
            <motion.div
              key="search-modal"
              initial={{ opacity: 0, y: -20, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -10, scale: 0.98 }}
              transition={{ duration: 0.2, ease: [0.4, 0, 0.2, 1] }}
              className="w-full max-w-xl bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-2xl overflow-hidden"
              onClick={(e) => e.stopPropagation()}
            >
            {/* Search Input */}
            <div className="flex items-center gap-3 px-4 py-3 border-b border-slate-200 dark:border-slate-700">
              <SearchIcon className="w-5 h-5 text-slate-400 dark:text-slate-500 shrink-0" />
              <input
                ref={inputRef}
                type="text"
                value={state.query}
                onChange={handleQueryChange}
                onKeyDown={handleKeyDown}
                placeholder="Search shipments by ID, tracking, city, name..."
                className="flex-1 bg-transparent text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 outline-none"
              />
              {state.loading && (
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-emerald-600 border-t-transparent shrink-0" />
              )}
              {state.query && !state.loading && (
                <button
                  onClick={handleClearQuery}
                  className="p-1 hover:bg-slate-100 dark:hover:bg-slate-700 rounded transition-colors"
                >
                  <XIcon className="w-4 h-4 text-slate-400 dark:text-slate-500" />
                </button>
              )}
              <kbd className="hidden sm:inline-flex items-center gap-1 rounded border border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-700 px-1.5 py-0.5 text-[10px] font-medium text-slate-400 dark:text-slate-500">
                ESC
              </kbd>
            </div>

            {/* Results Area */}
            <div className="max-h-96 overflow-y-auto">
              {/* Recent Searches */}
              {showRecent && (
                <div className="p-2">
                  <div className="flex items-center justify-between px-3 py-2">
                    <span className="text-xs font-medium text-slate-500 dark:text-slate-400">Recent Searches</span>
                    <button
                      onClick={() => dispatch({ type: 'CLEAR_RECENT' })}
                      className="text-xs text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300 transition-colors"
                    >
                      Clear
                    </button>
                  </div>
                  {state.recentSearches.map((recent, i) => (
                    <button
                      key={i}
                      onClick={() => dispatch({ type: 'SET_QUERY', query: recent })}
                      className="w-full flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors text-left"
                    >
                      <ClockIcon className="w-4 h-4 text-slate-400 dark:text-slate-500 shrink-0" />
                      <span className="text-sm text-slate-700 dark:text-slate-300">{recent}</span>
                    </button>
                  ))}
                </div>
              )}

              {/* Search Results */}
              {showResults && (
                <div className="p-2">
                  <div className="px-3 py-2">
                    <span className="text-xs font-medium text-slate-500 dark:text-slate-400">Shipments</span>
                  </div>
                  {visibleResults.length > 0 ? (
                    visibleResults.map((shipment, i) => (
                      <button
                        key={shipment.id}
                        onClick={() => selectResult(shipment)}
                        className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors text-left ${
                          state.selectedIndex === i
                            ? 'bg-emerald-50 dark:bg-emerald-900/20 ring-1 ring-emerald-200 dark:ring-emerald-800'
                            : 'hover:bg-slate-50 dark:hover:bg-slate-700/50'
                        }`}
                      >
                        <div className="w-8 h-8 rounded-lg bg-emerald-50 dark:bg-emerald-900/20 flex items-center justify-center shrink-0">
                          <PackageIcon className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-mono font-medium text-slate-900 dark:text-slate-100">
                              {shipment.shipmentId}
                            </span>
                            <span
                              className={`inline-flex px-1.5 py-0.5 text-[10px] font-medium rounded-full ${
                                SHIPMENT_STATUS_COLORS[shipment.status] || 'bg-slate-100 text-slate-700'
                              }`}
                            >
                              {SHIPMENT_STATUS_LABELS[shipment.status] || shipment.status}
                            </span>
                          </div>
                          <div className="text-xs text-slate-500 dark:text-slate-400 truncate mt-0.5">
                            {shipment.destinationCity}, {shipment.destinationCountry} · {shipment.receiverName} · {SHIPPING_METHOD_LABELS[shipment.shippingMethod] || shipment.shippingMethod}
                          </div>
                        </div>
                        <div className="text-xs text-slate-400 dark:text-slate-500 shrink-0">
                          ${shipment.shipmentValue?.toLocaleString()}
                        </div>
                      </button>
                    ))
                  ) : null}
                  {showNoResults && (
                    <div className="flex flex-col items-center gap-2 py-8 px-4">
                      <PackageIcon className="w-8 h-8 text-slate-300 dark:text-slate-600" />
                      <p className="text-sm text-slate-500 dark:text-slate-400">No shipments found</p>
                      <p className="text-xs text-slate-400 dark:text-slate-500">Try searching by shipment ID, tracking number, city, or name</p>
                    </div>
                  )}
                </div>
              )}

              {/* Empty initial state */}
              {!hasQuery && state.recentSearches.length === 0 && (
                <div className="flex flex-col items-center gap-2 py-8 px-4">
                  <SearchIcon className="w-8 h-8 text-slate-300 dark:text-slate-600" />
                  <p className="text-sm text-slate-500 dark:text-slate-400">Search shipments</p>
                  <p className="text-xs text-slate-400 dark:text-slate-500">
                    Find by ID, tracking number, city, sender, or receiver
                  </p>
                  <div className="mt-2 flex items-center gap-1">
                    <kbd className="inline-flex items-center rounded border border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-700 px-1.5 py-0.5 text-[10px] font-medium text-slate-400 dark:text-slate-500">
                      Ctrl
                    </kbd>
                    <span className="text-xs text-slate-400 dark:text-slate-500">+</span>
                    <kbd className="inline-flex items-center rounded border border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-700 px-1.5 py-0.5 text-[10px] font-medium text-slate-400 dark:text-slate-500">
                      K
                    </kbd>
                    <span className="text-xs text-slate-400 dark:text-slate-500 ml-1">to search anytime</span>
                  </div>
                </div>
              )}
            </div>

            {/* Footer hint */}
            {showResults && visibleResults.length > 0 && (
              <div className="border-t border-slate-100 dark:border-slate-700 px-4 py-2 flex items-center gap-4 text-[10px] text-slate-400 dark:text-slate-500">
                <span className="flex items-center gap-1">
                  <kbd className="inline-flex items-center rounded border border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-700 px-1 py-0.5 text-[10px] font-medium">↑↓</kbd>
                  Navigate
                </span>
                <span className="flex items-center gap-1">
                  <kbd className="inline-flex items-center rounded border border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-700 px-1 py-0.5 text-[10px] font-medium">↵</kbd>
                  Open
                </span>
                <span className="flex items-center gap-1">
                  <kbd className="inline-flex items-center rounded border border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-700 px-1 py-0.5 text-[10px] font-medium">Esc</kbd>
                  Close
                </span>
              </div>
            )}
            </motion.div>
          </div>
        </>
      )}
    </AnimatePresence>
  );
}
