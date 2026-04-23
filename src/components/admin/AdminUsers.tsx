'use client';

import React, { useState, useCallback } from 'react';
import { apiFetch } from '@/lib/api';
import { useFetch } from '@/lib/useFetch';
import { toast } from 'sonner';
import {
  SearchIcon,
  RefreshIcon,
  ChevronDownIcon,
  ChevronUpIcon,
  UserIcon,
  UsersIcon,
  ShieldIcon,
  PackageIcon,
  ClockIcon,
  EyeIcon,
} from '@/components/icons';

// ─── Types ───────────────────────────────────────────────

interface UserData {
  id: string;
  email: string;
  name: string;
  role: string;
  phone: string | null;
  company: string | null;
  active: boolean;
  createdAt: string;
  updatedAt: string;
  _count: { shipments: number; auditLogs: number };
}

interface PaginatedData {
  users: UserData[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

// ─── Avatar Initials ──────────────────────────────────────

function UserAvatar({ name, active }: { name: string; active: boolean }) {
  const initials = name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  const bgColor = active ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-500';

  return (
    <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-semibold shrink-0 ${bgColor}`}>
      {initials || <UserIcon className="w-5 h-5" />}
    </div>
  );
}

// ─── Role Badge ───────────────────────────────────────────

function RoleBadge({ role }: { role: string }) {
  const styles: Record<string, string> = {
    ADMIN: 'bg-purple-100 text-purple-700',
    CUSTOMER: 'bg-sky-100 text-sky-700',
    WAREHOUSE_STAFF: 'bg-amber-100 text-amber-700',
  };
  const labels: Record<string, string> = {
    ADMIN: 'Admin',
    CUSTOMER: 'Customer',
    WAREHOUSE_STAFF: 'Warehouse',
  };
  return (
    <span className={`inline-flex px-2.5 py-1 text-xs font-medium rounded-full ${styles[role] || 'bg-slate-100 text-slate-700'}`}>
      {labels[role] || role}
    </span>
  );
}

// ─── Status Badge ─────────────────────────────────────────

function StatusBadge({ active }: { active: boolean }) {
  return (
    <span className={`inline-flex px-2 py-0.5 text-xs font-medium rounded-full ${active ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
      {active ? 'Active' : 'Inactive'}
    </span>
  );
}

// ─── Relative Time ────────────────────────────────────────

function formatRelativeTime(dateStr: string): string {
  const now = new Date();
  const date = new Date(dateStr);
  const diffMs = now.getTime() - date.getTime();
  const diffMinutes = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMinutes / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffMinutes < 1) return 'just now';
  if (diffMinutes < 60) return `${diffMinutes}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  return `${diffDays}d ago`;
}

// ─── Main Component ──────────────────────────────────────

export default function AdminUsers() {
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [activeFilter, setActiveFilter] = useState('');
  const [page, setPage] = useState(1);
  const [expandedUser, setExpandedUser] = useState<string | null>(null);
  const [roleDropdownOpen, setRoleDropdownOpen] = useState<string | null>(null);
  const [confirmToggle, setConfirmToggle] = useState<string | null>(null);
  const limit = 20;

  // Build query string
  const buildQuery = useCallback(() => {
    const params = new URLSearchParams();
    params.set('page', String(page));
    params.set('limit', String(limit));
    if (search) params.set('search', search);
    if (roleFilter) params.set('role', roleFilter);
    if (activeFilter) params.set('active', activeFilter);
    return `?${params.toString()}`;
  }, [page, search, roleFilter, activeFilter]);

  const { data, loading, refresh } = useFetch<PaginatedData>(
    () => apiFetch(`/admin/users${buildQuery()}`).then((r) => (r.success ? r.data : null)),
    [page, search, roleFilter, activeFilter]
  );

  const users = data?.users || [];
  const total = data?.total || 0;
  const totalPages = data?.totalPages || 1;

  // Handle search with debounce
  const [searchInput, setSearchInput] = useState(search);
  const handleSearch = () => {
    setSearch(searchInput);
    setPage(1);
  };

  // Handle role change
  const handleRoleChange = async (userId: string, newRole: string) => {
    try {
      const res = await apiFetch(`/admin/users/${userId}`, {
        method: 'PUT',
        body: JSON.stringify({ role: newRole }),
      });
      if (res.success) {
        toast.success('Role updated successfully');
        refresh();
      } else {
        toast.error(res.error || 'Failed to update role');
      }
    } catch {
      toast.error('Failed to update role');
    }
    setRoleDropdownOpen(null);
  };

  // Handle toggle active/inactive
  const handleToggleActive = async (userId: string, currentActive: boolean) => {
    try {
      const res = await apiFetch(`/admin/users/${userId}`, {
        method: 'PUT',
        body: JSON.stringify({ active: !currentActive }),
      });
      if (res.success) {
        toast.success(`User ${!currentActive ? 'activated' : 'deactivated'} successfully`);
        refresh();
      } else {
        toast.error(res.error || 'Failed to update status');
      }
    } catch {
      toast.error('Failed to update status');
    }
    setConfirmToggle(null);
  };

  // Handle deactivate (DELETE)
  const handleDeactivate = async (userId: string) => {
    try {
      const res = await apiFetch(`/admin/users/${userId}`, { method: 'DELETE' });
      if (res.success) {
        toast.success('User deactivated');
        refresh();
      } else {
        toast.error(res.error || 'Failed to deactivate');
      }
    } catch {
      toast.error('Failed to deactivate');
    }
    setConfirmToggle(null);
  };

  const toggleExpanded = (userId: string) => {
    setExpandedUser(expandedUser === userId ? null : userId);
  };

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-slate-900">User Management</h1>
        <button
          onClick={refresh}
          className="flex items-center gap-2 px-4 py-2 bg-white text-slate-700 border border-slate-200 rounded-lg hover:bg-slate-50 text-sm transition-colors"
        >
          <RefreshIcon className="w-4 h-4" /> Refresh
        </button>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl border border-slate-200 p-4 mb-4">
        <div className="flex flex-col sm:flex-row gap-3">
          {/* Search */}
          <div className="relative flex-1">
            <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search by name, email, or company..."
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
              className="w-full pl-10 pr-4 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/50 text-slate-900 bg-white"
            />
          </div>

          {/* Role Filter */}
          <select
            value={roleFilter}
            onChange={(e) => { setRoleFilter(e.target.value); setPage(1); }}
            className="px-3 py-2.5 border border-slate-200 rounded-lg text-sm text-slate-700 bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
          >
            <option value="">All Roles</option>
            <option value="ADMIN">Admin</option>
            <option value="CUSTOMER">Customer</option>
            <option value="WAREHOUSE_STAFF">Warehouse Staff</option>
          </select>

          {/* Active Filter */}
          <select
            value={activeFilter}
            onChange={(e) => { setActiveFilter(e.target.value); setPage(1); }}
            className="px-3 py-2.5 border border-slate-200 rounded-lg text-sm text-slate-700 bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
          >
            <option value="">All Status</option>
            <option value="true">Active</option>
            <option value="false">Inactive</option>
          </select>

          {/* Search Button */}
          <button
            onClick={handleSearch}
            className="px-4 py-2.5 bg-emerald-600 text-white rounded-lg text-sm font-medium hover:bg-emerald-500 transition-colors whitespace-nowrap"
          >
            Search
          </button>
        </div>

        {/* Results count */}
        <div className="mt-3 text-xs text-slate-500">
          Showing {users.length} of {total} users
        </div>
      </div>

      {/* Loading */}
      {loading ? (
        <div className="text-center py-12 text-slate-400">Loading users...</div>
      ) : users.length === 0 ? (
        <div className="text-center py-16">
          <UserIcon className="w-16 h-16 text-slate-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-slate-600">No users found</h3>
          <p className="text-slate-400 mt-2">Try adjusting your search or filters</p>
        </div>
      ) : (
        <>
          {/* Mobile Card Layout */}
          <div className="md:hidden space-y-3">
            {users.map((u) => (
              <div key={u.id} className="bg-white rounded-xl border border-slate-200 overflow-hidden">
                <div
                  className="p-4 cursor-pointer hover:bg-slate-50 transition-colors"
                  onClick={() => toggleExpanded(u.id)}
                >
                  <div className="flex items-center gap-3">
                    <UserAvatar name={u.name} active={u.active} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium text-slate-900 truncate">{u.name}</span>
                        <StatusBadge active={u.active} />
                      </div>
                      <div className="text-xs text-slate-500 truncate">{u.email}</div>
                    </div>
                    <div className="flex items-center gap-2">
                      <RoleBadge role={u.role} />
                      {expandedUser === u.id ? (
                        <ChevronUpIcon className="w-4 h-4 text-slate-400" />
                      ) : (
                        <ChevronDownIcon className="w-4 h-4 text-slate-400" />
                      )}
                    </div>
                  </div>

                  {/* Quick Stats Row */}
                  <div className="flex items-center gap-4 mt-3 text-xs text-slate-500">
                    <div className="flex items-center gap-1">
                      <PackageIcon className="w-3.5 h-3.5" />
                      <span>{u._count?.shipments || 0} shipments</span>
                    </div>
                    {u.company && (
                      <span className="truncate">{u.company}</span>
                    )}
                  </div>
                </div>

                {/* Expanded Details */}
                {expandedUser === u.id && (
                  <div className="border-t border-slate-100 px-4 py-3 bg-slate-50 space-y-3">
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      <div>
                        <span className="text-xs text-slate-400 block">Phone</span>
                        <span className="text-slate-700">{u.phone || '-'}</span>
                      </div>
                      <div>
                        <span className="text-xs text-slate-400 block">Company</span>
                        <span className="text-slate-700">{u.company || '-'}</span>
                      </div>
                      <div>
                        <span className="text-xs text-slate-400 block">Joined</span>
                        <span className="text-slate-700">{new Date(u.createdAt).toLocaleDateString()}</span>
                      </div>
                      <div>
                        <span className="text-xs text-slate-400 block">Last Updated</span>
                        <span className="text-slate-700">{formatRelativeTime(u.updatedAt)}</span>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex flex-wrap gap-2 pt-2 border-t border-slate-200">
                      {/* Role Change */}
                      <select
                        value={u.role}
                        onChange={(e) => handleRoleChange(u.id, e.target.value)}
                        className="px-2 py-1.5 border border-slate-200 rounded-lg text-xs bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <option value="ADMIN">Admin</option>
                        <option value="CUSTOMER">Customer</option>
                        <option value="WAREHOUSE_STAFF">Warehouse Staff</option>
                      </select>

                      {/* Toggle Active */}
                      {confirmToggle === u.id ? (
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => handleToggleActive(u.id, u.active)}
                            className="px-2 py-1.5 bg-red-600 text-white rounded-lg text-xs hover:bg-red-500"
                          >
                            Confirm {u.active ? 'Deactivate' : 'Activate'}
                          </button>
                          <button
                            onClick={() => setConfirmToggle(null)}
                            className="px-2 py-1.5 bg-slate-200 text-slate-700 rounded-lg text-xs hover:bg-slate-300"
                          >
                            Cancel
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => setConfirmToggle(u.id)}
                          className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                            u.active
                              ? 'bg-red-50 text-red-600 hover:bg-red-100'
                              : 'bg-green-50 text-green-600 hover:bg-green-100'
                          }`}
                        >
                          {u.active ? 'Deactivate' : 'Activate'}
                        </button>
                      )}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Desktop Table Layout */}
          <div className="hidden md:block bg-white rounded-xl border border-slate-200 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-slate-50 border-b border-slate-200">
                  <tr>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase">User</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase">Email</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase">Role</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase">Company</th>
                    <th className="text-center px-4 py-3 text-xs font-semibold text-slate-500 uppercase">Shipments</th>
                    <th className="text-center px-4 py-3 text-xs font-semibold text-slate-500 uppercase">Last Updated</th>
                    <th className="text-center px-4 py-3 text-xs font-semibold text-slate-500 uppercase">Status</th>
                    <th className="text-center px-4 py-3 text-xs font-semibold text-slate-500 uppercase">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {users.map((u) => (
                    <tr key={u.id} className="hover:bg-slate-50 transition-colors group">
                      {/* User */}
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <UserAvatar name={u.name} active={u.active} />
                          <div className="min-w-0">
                            <div className="text-sm font-medium text-slate-900 truncate">{u.name}</div>
                            {u.phone && (
                              <div className="text-xs text-slate-400 truncate">{u.phone}</div>
                            )}
                          </div>
                        </div>
                      </td>
                      {/* Email */}
                      <td className="px-4 py-3 text-sm text-slate-600 truncate max-w-[200px]">{u.email}</td>
                      {/* Role (inline dropdown) */}
                      <td className="px-4 py-3">
                        <div className="relative">
                          <select
                            value={u.role}
                            onChange={(e) => handleRoleChange(u.id, e.target.value)}
                            className={`appearance-none px-2.5 py-1 text-xs font-medium rounded-full border-0 cursor-pointer pr-6 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 ${
                              u.role === 'ADMIN'
                                ? 'bg-purple-100 text-purple-700'
                                : u.role === 'WAREHOUSE_STAFF'
                                  ? 'bg-amber-100 text-amber-700'
                                  : 'bg-sky-100 text-sky-700'
                            }`}
                            onClick={(e) => e.stopPropagation()}
                          >
                            <option value="ADMIN">Admin</option>
                            <option value="CUSTOMER">Customer</option>
                            <option value="WAREHOUSE_STAFF">Warehouse Staff</option>
                          </select>
                          <ChevronDownIcon className="w-3 h-3 absolute right-1 top-1/2 -translate-y-1/2 pointer-events-none opacity-50" />
                        </div>
                      </td>
                      {/* Company */}
                      <td className="px-4 py-3 text-sm text-slate-600">{u.company || '-'}</td>
                      {/* Shipments */}
                      <td className="px-4 py-3 text-center">
                        <div className="flex items-center justify-center gap-1">
                          <PackageIcon className="w-3.5 h-3.5 text-slate-400" />
                          <span className="text-sm text-slate-600">{u._count?.shipments || 0}</span>
                        </div>
                      </td>
                      {/* Last Updated */}
                      <td className="px-4 py-3 text-center">
                        <div className="flex items-center justify-center gap-1 text-xs text-slate-400">
                          <ClockIcon className="w-3 h-3" />
                          {formatRelativeTime(u.updatedAt)}
                        </div>
                      </td>
                      {/* Status */}
                      <td className="px-4 py-3 text-center">
                        <StatusBadge active={u.active} />
                      </td>
                      {/* Actions */}
                      <td className="px-4 py-3 text-center">
                        <div className="flex items-center justify-center gap-1">
                          <button
                            onClick={() => toggleExpanded(u.id)}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
                            title="View details"
                          >
                            <EyeIcon className="w-4 h-4" />
                          </button>
                          {confirmToggle === u.id ? (
                            <div className="flex items-center gap-1">
                              <button
                                onClick={() => handleToggleActive(u.id, u.active)}
                                className="px-2 py-1 bg-red-600 text-white rounded text-xs hover:bg-red-500"
                              >
                                Confirm
                              </button>
                              <button
                                onClick={() => setConfirmToggle(null)}
                                className="px-2 py-1 bg-slate-200 text-slate-600 rounded text-xs hover:bg-slate-300"
                              >
                                Cancel
                              </button>
                            </div>
                          ) : (
                            <button
                              onClick={() => setConfirmToggle(u.id)}
                              className={`p-1.5 rounded-lg transition-colors ${
                                u.active
                                  ? 'text-red-400 hover:text-red-600 hover:bg-red-50'
                                  : 'text-green-400 hover:text-green-600 hover:bg-green-50'
                              }`}
                              title={u.active ? 'Deactivate' : 'Activate'}
                            >
                              <ShieldIcon className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Expanded Row Detail */}
            {expandedUser && users.find((u) => u.id === expandedUser) && (
              <div className="border-t border-slate-200 bg-slate-50 px-6 py-4">
                {(() => {
                  const u = users.find((u) => u.id === expandedUser)!;
                  return (
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                      <div>
                        <span className="text-xs text-slate-400 block mb-1">Phone</span>
                        <span className="text-slate-700">{u.phone || 'Not provided'}</span>
                      </div>
                      <div>
                        <span className="text-xs text-slate-400 block mb-1">Company</span>
                        <span className="text-slate-700">{u.company || 'Not provided'}</span>
                      </div>
                      <div>
                        <span className="text-xs text-slate-400 block mb-1">Joined</span>
                        <span className="text-slate-700">{new Date(u.createdAt).toLocaleDateString()}</span>
                      </div>
                      <div>
                        <span className="text-xs text-slate-400 block mb-1">Audit Logs</span>
                        <span className="text-slate-700">{u._count?.auditLogs || 0} entries</span>
                      </div>
                    </div>
                  );
                })()}
              </div>
            )}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between mt-4">
              <div className="text-sm text-slate-500">
                Page {page} of {totalPages}
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setPage(Math.max(1, page - 1))}
                  disabled={page === 1}
                  className="px-3 py-2 text-sm border border-slate-200 rounded-lg bg-white text-slate-700 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  Previous
                </button>
                {/* Page Numbers */}
                {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                  let pageNum: number;
                  if (totalPages <= 5) {
                    pageNum = i + 1;
                  } else if (page <= 3) {
                    pageNum = i + 1;
                  } else if (page >= totalPages - 2) {
                    pageNum = totalPages - 4 + i;
                  } else {
                    pageNum = page - 2 + i;
                  }
                  return (
                    <button
                      key={pageNum}
                      onClick={() => setPage(pageNum)}
                      className={`px-3 py-2 text-sm rounded-lg transition-colors ${
                        page === pageNum
                          ? 'bg-emerald-600 text-white'
                          : 'border border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                      }`}
                    >
                      {pageNum}
                    </button>
                  );
                })}
                <button
                  onClick={() => setPage(Math.min(totalPages, page + 1))}
                  disabled={page === totalPages}
                  className="px-3 py-2 text-sm border border-slate-200 rounded-lg bg-white text-slate-700 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
