'use client';

import React, { useState } from 'react';
import { apiFetch } from '@/lib/api';
import { useFetch } from '@/lib/useFetch';
import { useAppStore } from '@/lib/store';
import { toast } from 'sonner';
import { useI18n } from '@/lib/i18n';
import {
  ChatIcon, PlusIcon, FilterIcon, SearchIcon,
  PackageIcon, ClockIcon, CheckCircleIcon, XIcon,
  SendIcon, RefreshIcon, ArrowLeftIcon,
} from '@/components/icons';

const STATUS_CONFIG: Record<string, { color: string; bg: string; label: string }> = {
  OPEN: { color: 'text-blue-700', bg: 'bg-blue-100', label: 'Open' },
  IN_PROGRESS: { color: 'text-amber-700', bg: 'bg-amber-100', label: 'In Progress' },
  WAITING_CUSTOMER: { color: 'text-purple-700', bg: 'bg-purple-100', label: 'Waiting' },
  RESOLVED: { color: 'text-green-700', bg: 'bg-green-100', label: 'Resolved' },
  CLOSED: { color: 'text-slate-600', bg: 'bg-slate-100', label: 'Closed' },
};

const PRIORITY_CONFIG: Record<string, { color: string; bg: string; label: string }> = {
  LOW: { color: 'text-slate-600', bg: 'bg-slate-100', label: 'Low' },
  MEDIUM: { color: 'text-blue-700', bg: 'bg-blue-100', label: 'Medium' },
  HIGH: { color: 'text-amber-700', bg: 'bg-amber-100', label: 'High' },
  URGENT: { color: 'text-red-700', bg: 'bg-red-100', label: 'Urgent' },
};

const CATEGORIES = ['GENERAL', 'SHIPMENT_ISSUE', 'BILLING', 'CUSTOMS', 'DAMAGE', 'DELIVERY', 'OTHER'];

export default function SupportTickets() {
  const { t } = useI18n();
  const { user } = useAppStore();
  const [showCreate, setShowCreate] = useState(false);
  const [selectedTicket, setSelectedTicket] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [replyText, setReplyText] = useState('');

  const { data: ticketsData, loading, refresh } = useFetch<any>(
    () => apiFetch(`/tickets?search=${search}&status=${statusFilter}`).then(r => r.success ? r.data : []),
    [search, statusFilter]
  );

  const { data: ticketDetail, loading: detailLoading, refresh: refreshDetail } = useFetch<any>(
    () => selectedTicket ? apiFetch(`/tickets/${selectedTicket}`).then(r => r.success ? r.data : null) : Promise.resolve(null),
    [selectedTicket]
  );

  const { data: shipments } = useFetch<any[]>(
    () => apiFetch('/shipments?limit=50').then(r => r.success ? r.data : []),
    []
  );

  const tickets = ticketsData || [];

  const [form, setForm] = useState({
    subject: '',
    description: '',
    category: 'GENERAL',
    priority: 'MEDIUM',
    shipmentId: '',
  });

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await apiFetch('/tickets', {
        method: 'POST',
        body: JSON.stringify(form),
      });
      if (res.success) {
        toast.success('Ticket created successfully');
        setShowCreate(false);
        setForm({ subject: '', description: '', category: 'GENERAL', priority: 'MEDIUM', shipmentId: '' });
        refresh();
      } else {
        toast.error(res.error || 'Failed to create ticket');
      }
    } catch {
      toast.error('Network error');
    }
  };

  const handleReply = async () => {
    if (!replyText.trim() || !selectedTicket) return;
    try {
      const res = await apiFetch(`/tickets/${selectedTicket}/messages`, {
        method: 'POST',
        body: JSON.stringify({ message: replyText }),
      });
      if (res.success) {
        setReplyText('');
        refreshDetail();
      } else {
        toast.error(res.error || 'Failed to send message');
      }
    } catch {
      toast.error('Network error');
    }
  };

  // Stats
  const stats = {
    total: tickets.length,
    open: tickets.filter((t: any) => t.status === 'OPEN').length,
    inProgress: tickets.filter((t: any) => t.status === 'IN_PROGRESS').length,
    resolved: tickets.filter((t: any) => t.status === 'RESOLVED').length,
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">{t('tickets.title') || 'Support Tickets'}</h1>
          <p className="text-sm text-slate-500 mt-1">{t('tickets.subtitle') || 'Get help with your shipments and account'}</p>
        </div>
        <button
          onClick={() => setShowCreate(true)}
          className="px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-500 text-sm font-medium transition-colors flex items-center gap-2"
        >
          <PlusIcon className="w-4 h-4" /> {t('tickets.newTicket') || 'New Ticket'}
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: t('tickets.total') || 'Total', value: stats.total, icon: <ChatIcon className="w-5 h-5" />, color: 'text-slate-600', bg: 'bg-slate-50' },
          { label: t('status.created') || 'Open', value: stats.open, icon: <PackageIcon className="w-5 h-5" />, color: 'text-blue-600', bg: 'bg-blue-50' },
          { label: t('tickets.inProgress') || 'In Progress', value: stats.inProgress, icon: <ClockIcon className="w-5 h-5" />, color: 'text-amber-600', bg: 'bg-amber-50' },
          { label: t('status.delivered') || 'Resolved', value: stats.resolved, icon: <CheckCircleIcon className="w-5 h-5" />, color: 'text-green-600', bg: 'bg-green-50' },
        ].map(s => (
          <div key={s.label} className={`${s.bg} rounded-xl p-4`}>
            <div className="flex items-center gap-2 mb-1">
              <span className={s.color}>{s.icon}</span>
              <span className="text-sm text-slate-500">{s.label}</span>
            </div>
            <span className={`text-2xl font-bold ${s.color}`}>{s.value}</span>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <SearchIcon className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder={t('tickets.searchPlaceholder') || 'Search tickets...'}
            className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-lg text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
          />
        </div>
        <select
          value={statusFilter}
          onChange={e => setStatusFilter(e.target.value)}
          className="px-3 py-2 border border-slate-200 rounded-lg text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
        >
          <option value="">{t('common.all') || 'All Statuses'}</option>
          {Object.entries(STATUS_CONFIG).map(([key, cfg]) => (
            <option key={key} value={key}>{cfg.label}</option>
          ))}
        </select>
        <button onClick={refresh} className="p-2 border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors">
          <RefreshIcon className="w-4 h-4 text-slate-500" />
        </button>
      </div>

      {/* Create Ticket Modal */}
      {showCreate && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-lg w-full max-h-[90vh] overflow-y-auto p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-slate-900">{t('tickets.createNew') || 'Create Support Ticket'}</h3>
              <button onClick={() => setShowCreate(false)} className="text-slate-400 hover:text-slate-600">
                <XIcon className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleCreate} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">{t('tickets.subject') || 'Subject'} *</label>
                <input
                  value={form.subject}
                  onChange={e => setForm({ ...form, subject: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
                  placeholder={t('tickets.subjectPlaceholder') || 'Brief description of your issue'}
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">{t('common.description') || 'Description'} *</label>
                <textarea
                  value={form.description}
                  onChange={e => setForm({ ...form, description: e.target.value })}
                  rows={4}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
                  placeholder={t('tickets.descPlaceholder') || 'Describe your issue in detail...'}
                  required
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">{t('tickets.category') || 'Category'}</label>
                  <select
                    value={form.category}
                    onChange={e => setForm({ ...form, category: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
                  >
                    {CATEGORIES.map(c => (
                      <option key={c} value={c}>{c.replace('_', ' ')}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">{t('tickets.priority') || 'Priority'}</label>
                  <select
                    value={form.priority}
                    onChange={e => setForm({ ...form, priority: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
                  >
                    {Object.entries(PRIORITY_CONFIG).map(([key, cfg]) => (
                      <option key={key} value={key}>{cfg.label}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">{t('tickets.relatedShipment') || 'Related Shipment (optional)'}</label>
                <select
                  value={form.shipmentId}
                  onChange={e => setForm({ ...form, shipmentId: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
                >
                  <option value="">{t('tickets.noShipment') || 'No specific shipment'}</option>
                  {(shipments || []).map((s: any) => (
                    <option key={s.id} value={s.id}>{s.shipmentId} - {s.receiverName}</option>
                  ))}
                </select>
              </div>
              <div className="flex gap-3 pt-2">
                <button type="submit" className="flex-1 px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-500 text-sm font-medium transition-colors">
                  {t('common.create') || 'Create Ticket'}
                </button>
                <button type="button" onClick={() => setShowCreate(false)} className="px-4 py-2 border border-slate-200 text-slate-700 rounded-lg hover:bg-slate-50 text-sm transition-colors">
                  {t('common.cancel') || 'Cancel'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Ticket Detail View */}
      {selectedTicket && ticketDetail ? (
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          <div className="p-6 border-b border-slate-200">
            <div className="flex items-center gap-3 mb-4">
              <button onClick={() => setSelectedTicket(null)} className="text-slate-400 hover:text-slate-600">
                <ArrowLeftIcon className="w-5 h-5" />
              </button>
              <span className="text-sm font-mono text-slate-500">{ticketDetail.ticketId}</span>
              <span className={`px-2.5 py-0.5 text-xs font-medium rounded-full ${STATUS_CONFIG[ticketDetail.status]?.bg} ${STATUS_CONFIG[ticketDetail.status]?.color}`}>
                {STATUS_CONFIG[ticketDetail.status]?.label}
              </span>
              <span className={`px-2.5 py-0.5 text-xs font-medium rounded-full ${PRIORITY_CONFIG[ticketDetail.priority]?.bg} ${PRIORITY_CONFIG[ticketDetail.priority]?.color}`}>
                {PRIORITY_CONFIG[ticketDetail.priority]?.label}
              </span>
            </div>
            <h2 className="text-lg font-semibold text-slate-900">{ticketDetail.subject}</h2>
            <div className="flex items-center gap-4 mt-2 text-sm text-slate-500">
              <span>{t('tickets.category') || 'Category'}: {ticketDetail.category?.replace('_', ' ')}</span>
              <span>{t('common.date') || 'Created'}: {new Date(ticketDetail.createdAt).toLocaleDateString()}</span>
              {ticketDetail.shipment && (
                <span>{t('shipment.shipmentId') || 'Shipment'}: {ticketDetail.shipment.shipmentId}</span>
              )}
            </div>
          </div>

          {/* Messages Thread */}
          <div className="p-6 max-h-[400px] overflow-y-auto space-y-4">
            {(ticketDetail.messages || []).map((msg: any) => (
              <div key={msg.id} className={`flex gap-3 ${msg.isInternal ? 'bg-amber-50 -mx-2 px-2 py-1 rounded-lg' : ''}`}>
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 ${
                  msg.user?.role === 'ADMIN' ? 'bg-emerald-100 text-emerald-700' : 'bg-blue-100 text-blue-700'
                }`}>
                  {msg.user?.name?.charAt(0) || '?'}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-sm font-medium text-slate-900">{msg.user?.name || 'Unknown'}</span>
                    {msg.isInternal && (
                      <span className="text-xs bg-amber-200 text-amber-800 px-1.5 py-0.5 rounded">{t('tickets.internalNote') || 'Internal'}</span>
                    )}
                    <span className="text-xs text-slate-400">{new Date(msg.createdAt).toLocaleString()}</span>
                  </div>
                  <p className="text-sm text-slate-700 whitespace-pre-wrap">{msg.message}</p>
                </div>
              </div>
            ))}
          </div>

          {/* Reply */}
          {ticketDetail.status !== 'CLOSED' && ticketDetail.status !== 'RESOLVED' && (
            <div className="p-4 border-t border-slate-200">
              <div className="flex gap-3">
                <input
                  value={replyText}
                  onChange={e => setReplyText(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && !e.shiftKey && handleReply()}
                  placeholder={t('tickets.replyPlaceholder') || 'Type your reply...'}
                  className="flex-1 px-4 py-2 border border-slate-200 rounded-lg text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
                />
                <button
                  onClick={handleReply}
                  disabled={!replyText.trim()}
                  className="px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-500 disabled:opacity-50 transition-colors flex items-center gap-2"
                >
                  <SendIcon className="w-4 h-4" /> {t('common.submit') || 'Send'}
                </button>
              </div>
            </div>
          )}
        </div>
      ) : (
        /* Ticket List */
        <div className="space-y-3">
          {loading ? (
            <div className="text-center py-12 text-slate-400">{t('common.loading') || 'Loading...'}</div>
          ) : tickets.length === 0 ? (
            <div className="text-center py-12">
              <ChatIcon className="w-12 h-12 text-slate-300 mx-auto mb-3" />
              <p className="text-slate-500">{t('tickets.noTickets') || 'No tickets found'}</p>
              <p className="text-sm text-slate-400 mt-1">{t('tickets.createFirst') || 'Create a ticket to get help'}</p>
            </div>
          ) : (
            tickets.map((ticket: any) => (
              <div
                key={ticket.id}
                onClick={() => setSelectedTicket(ticket.id)}
                className="bg-white rounded-xl border border-slate-200 p-4 hover:shadow-md transition-shadow cursor-pointer"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xs font-mono text-slate-400">{ticket.ticketId}</span>
                      <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${STATUS_CONFIG[ticket.status]?.bg} ${STATUS_CONFIG[ticket.status]?.color}`}>
                        {STATUS_CONFIG[ticket.status]?.label}
                      </span>
                      <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${PRIORITY_CONFIG[ticket.priority]?.bg} ${PRIORITY_CONFIG[ticket.priority]?.color}`}>
                        {PRIORITY_CONFIG[ticket.priority]?.label}
                      </span>
                    </div>
                    <h3 className="text-sm font-semibold text-slate-900 truncate">{ticket.subject}</h3>
                    <p className="text-xs text-slate-500 mt-1 truncate">{ticket.description}</p>
                  </div>
                  <div className="text-right flex-shrink-0 ml-4">
                    <span className="text-xs text-slate-400">{new Date(ticket.createdAt).toLocaleDateString()}</span>
                    {ticket._count?.messages > 1 && (
                      <div className="flex items-center gap-1 text-xs text-slate-400 mt-1">
                        <ChatIcon className="w-3 h-3" /> {ticket._count.messages}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}
