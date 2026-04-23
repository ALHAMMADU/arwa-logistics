'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { apiFetch } from '@/lib/api';
import { toast } from 'sonner';
import { ClockIcon, PlusIcon, UserIcon } from '@/components/icons';

interface Note {
  text: string;
  author: string;
  timestamp: string;
}

interface ShipmentNotesProps {
  shipmentId: string;
}

function formatRelativeTime(dateStr: string): string {
  const now = new Date();
  const date = new Date(dateStr);
  const diffMs = now.getTime() - date.getTime();
  const diffSeconds = Math.floor(diffMs / 1000);
  const diffMinutes = Math.floor(diffSeconds / 60);
  const diffHours = Math.floor(diffMinutes / 60);
  const diffDays = Math.floor(diffHours / 24);
  const diffWeeks = Math.floor(diffDays / 7);

  if (diffSeconds < 60) return 'just now';
  if (diffMinutes < 60) return `${diffMinutes} minute${diffMinutes !== 1 ? 's' : ''} ago`;
  if (diffHours < 24) return `${diffHours} hour${diffHours !== 1 ? 's' : ''} ago`;
  if (diffDays < 7) return `${diffDays} day${diffDays !== 1 ? 's' : ''} ago`;
  if (diffWeeks < 4) return `${diffWeeks} week${diffWeeks !== 1 ? 's' : ''} ago`;
  return date.toLocaleDateString();
}

function formatFullDate(dateStr: string): string {
  return new Date(dateStr).toLocaleString();
}

export default function ShipmentNotes({ shipmentId }: ShipmentNotesProps) {
  const [notes, setNotes] = useState<Note[]>([]);
  const [loading, setLoading] = useState(true);
  const [newNoteText, setNewNoteText] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const notesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const fetchNotes = useCallback(async () => {
    try {
      const res = await apiFetch(`/shipments/${shipmentId}/notes`);
      if (res.success) {
        setNotes(res.data || []);
      }
    } catch {
      // Silently handle fetch errors
    } finally {
      setLoading(false);
    }
  }, [shipmentId]);

  useEffect(() => {
    fetchNotes();
  }, [fetchNotes]);

  // Auto-scroll to bottom when new notes are added
  useEffect(() => {
    notesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [notes]);

  const handleSubmit = async () => {
    if (!newNoteText.trim()) return;

    setSubmitting(true);
    try {
      const res = await apiFetch(`/shipments/${shipmentId}/notes`, {
        method: 'POST',
        body: JSON.stringify({ text: newNoteText.trim() }),
      });

      if (res.success) {
        setNotes(res.data || []);
        setNewNoteText('');
        toast.success('Note added successfully');
        inputRef.current?.focus();
      } else {
        toast.error(res.error || 'Failed to add note');
      }
    } catch {
      toast.error('Failed to add note');
    } finally {
      setSubmitting(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  if (loading) {
    return (
      <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-6">
        <div className="animate-pulse space-y-3">
          <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded w-1/3" />
          <div className="h-10 bg-slate-100 dark:bg-slate-700 rounded" />
          <div className="h-16 bg-slate-100 dark:bg-slate-700 rounded" />
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden">
      {/* Header */}
      <div className="px-4 py-3 border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50">
        <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-2">
          <ClockIcon className="w-4 h-4 text-slate-500" />
          Notes
          {notes.length > 0 && (
            <span className="ml-1 px-1.5 py-0.5 text-xs bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 rounded-full">
              {notes.length}
            </span>
          )}
        </h3>
      </div>

      {/* Notes List */}
      <div className="max-h-96 overflow-y-auto">
        {notes.length === 0 ? (
          <div className="px-4 py-8 text-center">
            <ClockIcon className="w-8 h-8 text-slate-300 dark:text-slate-600 mx-auto mb-2" />
            <p className="text-sm text-slate-400 dark:text-slate-500">No notes yet</p>
            <p className="text-xs text-slate-300 dark:text-slate-600 mt-1">Add a note to get started</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100 dark:divide-slate-700/50">
            {notes.map((note, index) => (
              <div key={index} className="px-4 py-3 hover:bg-slate-50 dark:hover:bg-slate-700/30 transition-colors">
                <div className="flex items-start gap-3">
                  {/* Author avatar */}
                  <div className="w-7 h-7 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <UserIcon className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className="text-xs font-medium text-slate-700 dark:text-slate-300 truncate">
                        {note.author}
                      </span>
                      <span className="text-xs text-slate-400 dark:text-slate-500 flex-shrink-0" title={formatFullDate(note.timestamp)}>
                        {formatRelativeTime(note.timestamp)}
                      </span>
                    </div>
                    <p className="text-sm text-slate-600 dark:text-slate-400 whitespace-pre-wrap break-words">
                      {note.text}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
        <div ref={notesEndRef} />
      </div>

      {/* Input */}
      <div className="px-4 py-3 border-t border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50">
        <div className="flex gap-2">
          <input
            ref={inputRef}
            type="text"
            value={newNoteText}
            onChange={(e) => setNewNoteText(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Add a note..."
            disabled={submitting}
            className="flex-1 px-3 py-2 text-sm border border-slate-200 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500 disabled:opacity-50"
          />
          <button
            onClick={handleSubmit}
            disabled={submitting || !newNoteText.trim()}
            className="px-3 py-2 bg-emerald-600 text-white rounded-lg text-sm font-medium hover:bg-emerald-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-1.5"
          >
            <PlusIcon className="w-4 h-4" />
            <span className="hidden sm:inline">Add</span>
          </button>
        </div>
      </div>
    </div>
  );
}
