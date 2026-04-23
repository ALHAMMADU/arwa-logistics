'use client';

import React, { useState } from 'react';
import { apiFetch } from '@/lib/api';
import { useFetch } from '@/lib/useFetch';
import { toast } from 'sonner';
import { useI18n } from '@/lib/i18n';
import {
  ChatIcon, SearchIcon, RefreshIcon, FilterIcon,
  SendIcon, XIcon, ArrowLeftIcon, CheckCircleIcon,
  ClockIcon, UsersIcon, PackageIcon, ClockIcon as WaitingIcon,
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

export default function AdminTickets() {
  const { t } = useI18n();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [selectedTicket, setSelectedTicket] = useState<string | null>(null);
  const [replyText, setReplyText] = useState('');
  const [isInternal, setIsInternal] = useState(false);
  const [resolution, setResolution] = useState('');
  const [newStatus, setNewStatus] = useState('');

  const queryParams = `search=${search}&status=${statusFilter}&category=${categoryFilter}`;
  const { data: ticketsData, loading, refresh } = useFetch<any>(
    () => apiFetch(`/tickets?${queryParams}`).then(r => r.success ? r.data : []),
    [search, statusFilter, categoryFilter]
  );

  const { data: ticketDetail, loading: detailLoading, refresh: refreshDetail } = useFetch<any>(
    () => selectedTicket ? apiFetch(`/tickets/${selectedTicket}`).then(r => r.success ? r.data : null) : Promise.resolve(null),
    [selectedTicket]
  );

  const { data: admins } = useFetch<any[]>(
    () => apiFetch('/admin/users?role=ADMIN').then(r => r.success ? r.data?.users || r.data || [] : []),
    []
  );

  const tickets = ticketsData || [];

  // Stats
  const stats = {
    open: tickets.filter((t: any) => t.status === 'OPEN').length,
    inProgress: tickets.filter((t: any) => t.status === 'IN_PROGRESS').length,
    waiting: tickets.filter((t: any) => t.status === 'WAITING_CUSTOMER').length,
    resolvedToday: tickets.filter((t: any) => {
      if (t.status !== 'RESOLVED') return false;
      const d = new Date(t.updatedAt);
      const today = new Date();
      return d.toDateString() === today.toDateString();
    }).length,
  };

  const handleReply = async () => {
    if (!replyText.trim() || !selectedTicket) return;
    try {
      const res = await apiFetch(`/tickets/${selectedTicket}/messages`, {
        method: 'POST',
        body: JSON.stringify({ message: replyText, isInternal }),
      });
      if (res.success) {
        setReplyText('');
        setIsInternal(false);
        refreshDetail();
        toast.success(isInternal ? 'Internal note added' : 'Reply sent');
      } else {
        toast.error(res.error || 'Failed');
      }
    } catch {
      toast.error('Network error');
    }
  };

  const handleStatusChange = async () => {
    if (!selectedTicket || !newStatus) return;
    if ((newStatus === 'RESOLVED' || newStatus === 'CLOSED') && !resolution.trim()) {
      toast.error('Resolution is required when resolving/closing');
      return;
    }
    try {
      const res = await apiFetch(`/tickets/${selectedTicket}/status`, {
        method: 'PUT',
        body: JSON.stringify({ status: newStatus, resolution: resolution.trim() || undefined }),
      });
      if (res.success) {
        setNewStatus('');
        setResolution('');
        refreshDetail();
        refresh();
        toast.success('Status updated');
      } else {
        toast.error(res.error || 'Failed');
      }
    } catch {
      toast.error('Network error');
    }
  };

  const handleAssign = async (assignedTo: string) => {
    if (!selectedTicket) return;
    try {
      const res = await apiFetch(`/tickets/${selectedTicket}/assign`, {
        method: 'PUT',
        body: JSON.stringify({ assignedTo }),
      });
      if (res.success) {
        refreshDetail();
        toast.success('Ticket assigned');
      } else {
        toast.error(res.error || 'Failed');
      }
    } catch {
      toast.error('Network error');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">{t('tickets.adminTitle') || 'Support Tickets'}</h1>
          <p className="text-sm text-slate-500 mt-1">{t('tickets.adminSubtitle') || 'Manage customer support requests'}</p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: t('status.created') || 'Open', value: stats.open, icon: <PackageIcon className="w-5 h-5" />, color: 'text-blue-600', bg: 'bg-blue-50' },
          { label: t('tickets.inProgress') || 'In Progress', value: stats.inProgress, icon: <ClockIcon className="w-5 h-5" />, color: 'text-amber-600', bg: 'bg-amber-50' },
          { label: t('tickets.waitingCustomer') || 'Waiting', value: stats.waiting, icon: <WaitingIcon className="w-5 h-5" />, color: 'text-purple-600', bg: 'bg-purple-50' },
          { label: t('tickets.resolvedToday') || 'Resolved Today', value: stats.resolvedToday, icon: <CheckCircleIcon className="w-5 h-5" />, color: 'text-green-600', bg: 'bg-green-50' },
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
        <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)}
          className="px-3 py-2 border border-slate-200 rounded-lg text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-500/50">
          <option value="">{t('common.all') || 'All Statuses'}</option>
          {Object.entries(STATUS_CONFIG).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
        </select>
        <select value={categoryFilter} onChange={e => setCategoryFilter(e.target.value)}
          className="px-3 py-2 border border-slate-200 rounded-lg text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-500/50">
          <option value="">{t('common.all') || 'All Categories'}</option>
          {CATEGORIES.map(c => <option key={c} value={c}>{c.replace('_', ' ')}</option>)}
        </select>
        <button onClick={refresh} className="p-2 border border-slate-200 rounded-lg hover:bg-slate-50">
          <RefreshIcon className="w-4 h-4 text-slate-500" />
        </button>
      </div>

      {/* Detail View */}
      {selectedTicket && ticketDetail ? (
        <div className="space-y-4">
          <button onClick={() => { setSelectedTicket(null); refresh(); }} className="flex items-center gap-2 text-sm text-slate-500 hover:text-slate-700">
            <ArrowLeftIcon className="w-4 h-4" /> {t('common.back') || 'Back to list'}
          </button>

          <div className="grid lg:grid-cols-3 gap-4">
            {/* Main Ticket & Messages */}
            <div className="lg:col-span-2 space-y-4">
              <div className="bg-white rounded-xl border border-slate-200 p-6">
                <div className="flex items-center gap-2 mb-3">
                  <span className="text-sm font-mono text-slate-400">{ticketDetail.ticketId}</span>
                  <span className={`px-2.5 py-0.5 text-xs font-medium rounded-full ${STATUS_CONFIG[ticketDetail.status]?.bg} ${STATUS_CONFIG[ticketDetail.status]?.color}`}>
                    {STATUS_CONFIG[ticketDetail.status]?.label}
                  </span>
                  <span className={`px-2.5 py-0.5 text-xs font-medium rounded-full ${PRIORITY_CONFIG[ticketDetail.priority]?.bg} ${PRIORITY_CONFIG[ticketDetail.priority]?.color}`}>
                    {PRIORITY_CONFIG[ticketDetail.priority]?.label}
                  </span>
                </div>
                <h2 className="text-lg font-semibold text-slate-900 mb-2">{ticketDetail.subject}</h2>
                <div className="flex items-center gap-4 text-sm text-slate-500">
                  <span>{t('tickets.category')}: {ticketDetail.category?.replace('_', ' ')}</span>
                  <span>{t('common.date')}: {new Date(ticketDetail.createdAt).toLocaleDateString()}</span>
                </div>
              </div>

              {/* Messages */}
              <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
                <div className="p-4 max-h-[350px] overflow-y-auto space-y-4">
                  {(ticketDetail.messages || []).map((msg: any) => (
                    <div key={msg.id} className={`flex gap-3 ${msg.isInternal ? 'bg-amber-50 -mx-2 px-2 py-2 rounded-lg' : ''}`}>
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 ${
                        msg.user?.role === 'ADMIN' ? 'bg-emerald-100 text-emerald-700' : 'bg-blue-100 text-blue-700'
                      }`}>
                        {msg.user?.name?.charAt(0) || '?'}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-sm font-medium text-slate-900">{msg.user?.name || 'Unknown'}</span>
                          <span className="text-xs text-slate-400">{msg.user?.role === 'ADMIN' ? 'Staff' : 'Customer'}</span>
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
                {ticketDetail.status !== 'CLOSED' && (
                  <div className="p-4 border-t border-slate-200 space-y-3">
                    <div className="flex gap-3">
                      <textarea
                        value={replyText}
                        onChange={e => setReplyText(e.target.value)}
                        placeholder={t('tickets.replyPlaceholder') || 'Type your reply...'}
                        rows={2}
                        className="flex-1 px-4 py-2 border border-slate-200 rounded-lg text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
                      />
                    </div>
                    <div className="flex items-center justify-between">
                      <label className="flex items-center gap-2 text-sm text-slate-600">
                        <input
                          type="checkbox"
                          checked={isInternal}
                          onChange={e => setIsInternal(e.target.checked)}
                          className="rounded border-slate-300"
                        />
                        {t('tickets.markInternal') || 'Internal note (not visible to customer)'}
                      </label>
                      <button
                        onClick={handleReply}
                        disabled={!replyText.trim()}
                        className="px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-500 disabled:opacity-50 text-sm transition-colors flex items-center gap-2"
                      >
                        <SendIcon className="w-4 h-4" /> {isInternal ? (t('tickets.addNote') || 'Add Note') : (t('tickets.reply') || 'Reply')}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Sidebar - Actions */}
            <div className="space-y-4">
              {/* Status Change */}
              <div className="bg-white rounded-xl border border-slate-200 p-4">
                <h3 className="text-sm font-semibold text-slate-900 mb-3">{t('tickets.changeStatus') || 'Change Status'}</h3>
                <div className="space-y-3">
                  <select
                    value={newStatus}
                    onChange={e => setNewStatus(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
                  >
                    <option value="">{t('tickets.selectStatus') || 'Select status...'}</option>
                    {Object.entries(STATUS_CONFIG).map(([k, v]) => (
                      <option key={k} value={k}>{v.label}</option>
                    ))}
                  </select>
                  {(newStatus === 'RESOLVED' || newStatus === 'CLOSED') && (
                    <textarea
                      value={resolution}
                      onChange={e => setResolution(e.target.value)}
                      placeholder={t('tickets.resolutionPlaceholder') || 'Resolution details...'}
                      rows={3}
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
                    />
                  )}
                  <button
                    onClick={handleStatusChange}
                    disabled={!newStatus}
                    className="w-full px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-500 disabled:opacity-50 text-sm transition-colors"
                  >
                    {t('common.update') || 'Update Status'}
                  </button>
                </div>
              </div>

              {/* Assign */}
              <div className="bg-white rounded-xl border border-slate-200 p-4">
                <h3 className="text-sm font-semibold text-slate-900 mb-3">{t('tickets.assignTo') || 'Assign To'}</h3>
                <select
                  value={ticketDetail.assignedTo || ''}
                  onChange={e => handleAssign(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
                >
                  <option value="">{t('tickets.unassigned') || 'Unassigned'}</option>
                  {(admins || []).map((a: any) => (
                    <option key={a.id} value={a.id}>{a.name}</option>
                  ))}
                </select>
              </div>

              {/* Customer Info */}
              <div className="bg-white rounded-xl border border-slate-200 p-4">
                <h3 className="text-sm font-semibold text-slate-900 mb-3">{t('tickets.customerInfo') || 'Customer Info'}</h3>
                {ticketDetail.customer && (
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-slate-500">{t('common.name')}</span>
                      <span className="text-slate-900">{ticketDetail.customer.name}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">{t('common.email')}</span>
                      <span className="text-slate-900 text-xs">{ticketDetail.customer.email}</span>
                    </div>
                    {ticketDetail.customer.phone && (
                      <div className="flex justify-between">
                        <span className="text-slate-500">{t('common.phone')}</span>
                        <span className="text-slate-900">{ticketDetail.customer.phone}</span>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Related Shipment */}
              {ticketDetail.shipment && (
                <div className="bg-white rounded-xl border border-slate-200 p-4">
                  <h3 className="text-sm font-semibold text-slate-900 mb-3">{t('tickets.relatedShipment') || 'Related Shipment'}</h3>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-slate-500">ID</span>
                      <span className="text-slate-900 font-mono">{ticketDetail.shipment.shipmentId}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">{t('shipment.trackingNumber')}</span>
                      <span className="text-slate-900 font-mono">{ticketDetail.shipment.trackingNumber}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">{t('common.status')}</span>
                      <span className="text-slate-900">{ticketDetail.shipment.status}</span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      ) : (
        /* Ticket List */
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase">Ticket</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase">Subject</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase">Customer</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase">Category</th>
                  <th className="text-center px-4 py-3 text-xs font-semibold text-slate-500 uppercase">Priority</th>
                  <th className="text-center px-4 py-3 text-xs font-semibold text-slate-500 uppercase">Status</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase">Assigned</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase">Created</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {loading ? (
                  <tr><td colSpan={8} className="text-center py-8 text-slate-400">{t('common.loading')}</td></tr>
                ) : tickets.length === 0 ? (
                  <tr><td colSpan={8} className="text-center py-8 text-slate-400">{t('tickets.noTickets') || 'No tickets found'}</td></tr>
                ) : (
                  tickets.map((ticket: any) => (
                    <tr
                      key={ticket.id}
                      onClick={() => setSelectedTicket(ticket.id)}
                      className="hover:bg-slate-50 cursor-pointer"
                    >
                      <td className="px-4 py-3 text-sm font-mono text-slate-500">{ticket.ticketId}</td>
                      <td className="px-4 py-3 text-sm font-medium text-slate-900 max-w-[200px] truncate">{ticket.subject}</td>
                      <td className="px-4 py-3 text-sm text-slate-700">{ticket.customer?.name}</td>
                      <td className="px-4 py-3 text-sm text-slate-500">{ticket.category?.replace('_', ' ')}</td>
                      <td className="px-4 py-3 text-center">
                        <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${PRIORITY_CONFIG[ticket.priority]?.bg} ${PRIORITY_CONFIG[ticket.priority]?.color}`}>
                          {PRIORITY_CONFIG[ticket.priority]?.label}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${STATUS_CONFIG[ticket.status]?.bg} ${STATUS_CONFIG[ticket.status]?.color}`}>
                          {STATUS_CONFIG[ticket.status]?.label}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm text-slate-500">{ticket.assignee?.name || '-'}</td>
                      <td className="px-4 py-3 text-sm text-slate-400">{new Date(ticket.createdAt).toLocaleDateString()}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
