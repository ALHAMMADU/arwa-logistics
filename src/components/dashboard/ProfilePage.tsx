'use client';

import React, { useState, useEffect } from 'react';
import { useAppStore } from '@/lib/store';
import { apiFetch } from '@/lib/api';
import { toast } from 'sonner';
import { UserIcon, ShieldIcon, SaveIcon, KeyIcon, EyeIcon, EyeOffIcon } from '@/components/icons';

function getPasswordStrength(password: string): { label: string; color: string; width: string } {
  if (!password) return { label: '', color: '', width: '0%' };
  let score = 0;
  if (password.length >= 8) score++;
  if (password.length >= 12) score++;
  if (/[A-Z]/.test(password)) score++;
  if (/[0-9]/.test(password)) score++;
  if (/[^A-Za-z0-9]/.test(password)) score++;

  if (score <= 1) return { label: 'Weak', color: 'bg-red-500', width: '20%' };
  if (score === 2) return { label: 'Fair', color: 'bg-amber-500', width: '40%' };
  if (score === 3) return { label: 'Good', color: 'bg-yellow-500', width: '60%' };
  if (score === 4) return { label: 'Strong', color: 'bg-emerald-500', width: '80%' };
  return { label: 'Very Strong', color: 'bg-emerald-600', width: '100%' };
}

export default function ProfilePage() {
  const { user, setUser, token } = useAppStore();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [changingPassword, setChangingPassword] = useState(false);

  // Profile form state
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [company, setCompany] = useState('');
  const [email, setEmail] = useState('');
  const [role, setRole] = useState('');

  // Password form state
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // Fetch profile on mount
  useEffect(() => {
    async function fetchProfile() {
      try {
        const res = await apiFetch('/auth/profile');
        if (res.success && res.data) {
          const profile = res.data;
          setName(profile.name || '');
          setPhone(profile.phone || '');
          setCompany(profile.company || '');
          setEmail(profile.email || '');
          setRole(profile.role || '');
        } else if (user) {
          // Fallback to store data
          setName(user.name || '');
          setPhone(user.phone || '');
          setCompany(user.company || '');
          setEmail(user.email || '');
          setRole(user.role || '');
        }
      } catch {
        // Fallback to store data
        if (user) {
          setName(user.name || '');
          setPhone(user.phone || '');
          setCompany(user.company || '');
          setEmail(user.email || '');
          setRole(user.role || '');
        }
      } finally {
        setLoading(false);
      }
    }
    fetchProfile();
  }, [user]);

  // Save profile
  const handleSaveProfile = async () => {
    if (!name.trim()) {
      toast.error('Name is required');
      return;
    }
    setSaving(true);
    try {
      const res = await apiFetch('/auth/profile', {
        method: 'PUT',
        body: JSON.stringify({ name: name.trim(), phone: phone.trim(), company: company.trim() }),
      });
      if (res.success) {
        toast.success('Profile updated successfully');
        // Update the store user if data returned
        if (res.data && user && token) {
          setUser({ ...user, name: name.trim(), phone: phone.trim(), company: company.trim() }, token);
        }
      } else {
        toast.error(res.message || 'Failed to update profile');
      }
    } catch {
      toast.error('Network error. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  // Change password
  const handleChangePassword = async () => {
    if (!currentPassword) {
      toast.error('Current password is required');
      return;
    }
    if (!newPassword) {
      toast.error('New password is required');
      return;
    }
    if (newPassword.length < 8) {
      toast.error('New password must be at least 8 characters');
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }
    setChangingPassword(true);
    try {
      const res = await apiFetch('/auth/change-password', {
        method: 'POST',
        body: JSON.stringify({ currentPassword, newPassword }),
      });
      if (res.success) {
        toast.success('Password changed successfully');
        setCurrentPassword('');
        setNewPassword('');
        setConfirmPassword('');
      } else {
        toast.error(res.message || 'Failed to change password');
      }
    } catch {
      toast.error('Network error. Please try again.');
    } finally {
      setChangingPassword(false);
    }
  };

  // Get initials for avatar
  const getInitials = (nameStr: string) => {
    if (!nameStr) return '??';
    const parts = nameStr.trim().split(/\s+/);
    if (parts.length === 1) return parts[0].charAt(0).toUpperCase();
    return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
  };

  // Role badge color
  const getRoleBadge = (roleStr: string) => {
    switch (roleStr) {
      case 'ADMIN': return 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400';
      case 'WAREHOUSE_STAFF': return 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400';
      default: return 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400';
    }
  };

  const getRoleLabel = (roleStr: string) => {
    switch (roleStr) {
      case 'ADMIN': return 'Administrator';
      case 'WAREHOUSE_STAFF': return 'Warehouse Staff';
      case 'CUSTOMER': return 'Customer';
      default: return roleStr;
    }
  };

  if (loading) {
    return (
      <div className="max-w-3xl mx-auto">
        <div className="mb-6">
          <div className="h-8 w-56 animate-pulse rounded bg-slate-200 dark:bg-slate-700" />
          <div className="mt-2 h-4 w-72 animate-pulse rounded bg-slate-200 dark:bg-slate-700" />
        </div>
        {/* Profile Card Skeleton */}
        <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden mb-6">
          <div className="bg-gradient-to-r from-emerald-600 to-teal-600 px-6 py-8">
            <div className="flex items-center gap-4">
              <div className="w-20 h-20 rounded-full bg-white/20 animate-pulse" />
              <div className="space-y-2">
                <div className="h-6 w-40 animate-pulse rounded bg-white/20" />
                <div className="h-4 w-56 animate-pulse rounded bg-white/20" />
                <div className="h-5 w-24 animate-pulse rounded-full bg-white/20" />
              </div>
            </div>
          </div>
          <div className="p-6 space-y-4">
            <div className="h-6 w-48 animate-pulse rounded bg-slate-200 dark:bg-slate-700" />
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <div className="h-4 w-20 animate-pulse rounded bg-slate-200 dark:bg-slate-700" />
                <div className="h-10 w-full animate-pulse rounded-lg bg-slate-200 dark:bg-slate-700" />
              </div>
              <div className="space-y-2">
                <div className="h-4 w-12 animate-pulse rounded bg-slate-200 dark:bg-slate-700" />
                <div className="h-10 w-full animate-pulse rounded-lg bg-slate-200 dark:bg-slate-700" />
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <div className="h-4 w-28 animate-pulse rounded bg-slate-200 dark:bg-slate-700" />
                <div className="h-10 w-full animate-pulse rounded-lg bg-slate-200 dark:bg-slate-700" />
              </div>
              <div className="space-y-2">
                <div className="h-4 w-16 animate-pulse rounded bg-slate-200 dark:bg-slate-700" />
                <div className="h-10 w-full animate-pulse rounded-lg bg-slate-200 dark:bg-slate-700" />
              </div>
            </div>
            <div className="space-y-2">
              <div className="h-4 w-10 animate-pulse rounded bg-slate-200 dark:bg-slate-700" />
              <div className="h-10 w-full animate-pulse rounded-lg bg-slate-200 dark:bg-slate-700" />
            </div>
            <div className="flex justify-end">
              <div className="h-10 w-32 animate-pulse rounded-lg bg-slate-200 dark:bg-slate-700" />
            </div>
          </div>
        </div>
        {/* Password Card Skeleton */}
        <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden">
          <div className="p-6 space-y-4">
            <div className="h-6 w-44 animate-pulse rounded bg-slate-200 dark:bg-slate-700" />
            <div className="space-y-2">
              <div className="h-4 w-28 animate-pulse rounded bg-slate-200 dark:bg-slate-700" />
              <div className="h-10 w-full animate-pulse rounded-lg bg-slate-200 dark:bg-slate-700" />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <div className="h-4 w-24 animate-pulse rounded bg-slate-200 dark:bg-slate-700" />
                <div className="h-10 w-full animate-pulse rounded-lg bg-slate-200 dark:bg-slate-700" />
              </div>
              <div className="space-y-2">
                <div className="h-4 w-36 animate-pulse rounded bg-slate-200 dark:bg-slate-700" />
                <div className="h-10 w-full animate-pulse rounded-lg bg-slate-200 dark:bg-slate-700" />
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const passwordStrength = getPasswordStrength(newPassword);

  return (
    <div className="max-w-3xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Profile & Settings</h1>
        <p className="text-slate-500 dark:text-slate-400 mt-1">Manage your account information and security</p>
      </div>

      {/* Profile Card */}
      <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden mb-6">
        <div className="bg-gradient-to-r from-emerald-600 to-teal-600 px-6 py-8">
          <div className="flex items-center gap-4">
            <div className="w-20 h-20 rounded-full bg-white/20 backdrop-blur-sm border-2 border-white/40 flex items-center justify-center flex-shrink-0">
              <span className="text-2xl font-bold text-white">{getInitials(name)}</span>
            </div>
            <div className="min-w-0">
              <h2 className="text-xl font-bold text-white truncate">{name || 'User'}</h2>
              <p className="text-emerald-100 truncate">{email}</p>
              <span className={`inline-block mt-2 px-2.5 py-0.5 text-xs font-medium rounded-full ${getRoleBadge(role)}`}>
                {getRoleLabel(role)}
              </span>
            </div>
          </div>
        </div>

        <div className="p-6">
          <div className="flex items-center gap-2 mb-5">
            <UserIcon className="w-5 h-5 text-emerald-600" />
            <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100">Personal Information</h3>
          </div>

          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">Full Name</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-3 py-2.5 border border-slate-300 dark:border-slate-600 rounded-lg text-sm bg-white dark:bg-slate-700 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-colors"
                  placeholder="Enter your name"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">Email</label>
                <input
                  type="email"
                  value={email}
                  disabled
                  className="w-full px-3 py-2.5 border border-slate-200 dark:border-slate-600 rounded-lg text-sm bg-slate-50 dark:bg-slate-700 text-slate-500 dark:text-slate-400 cursor-not-allowed"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">Phone Number</label>
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full px-3 py-2.5 border border-slate-300 dark:border-slate-600 rounded-lg text-sm bg-white dark:bg-slate-700 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-colors"
                  placeholder="Enter your phone number"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">Company</label>
                <input
                  type="text"
                  value={company}
                  onChange={(e) => setCompany(e.target.value)}
                  className="w-full px-3 py-2.5 border border-slate-300 dark:border-slate-600 rounded-lg text-sm bg-white dark:bg-slate-700 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-colors"
                  placeholder="Enter your company name"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">Role</label>
              <input
                type="text"
                value={getRoleLabel(role)}
                disabled
                className="w-full px-3 py-2.5 border border-slate-200 dark:border-slate-600 rounded-lg text-sm bg-slate-50 dark:bg-slate-700 text-slate-500 dark:text-slate-400 cursor-not-allowed"
              />
            </div>
          </div>

          <div className="mt-6 flex justify-end">
            <button
              onClick={handleSaveProfile}
              disabled={saving}
              className="flex items-center gap-2 px-5 py-2.5 bg-emerald-600 text-white rounded-lg font-medium hover:bg-emerald-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {saving ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />
                  Saving...
                </>
              ) : (
                <>
                  <SaveIcon className="w-4 h-4" />
                  Save Changes
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Password Change Card */}
      <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden">
        <div className="p-6">
          <div className="flex items-center gap-2 mb-5">
            <ShieldIcon className="w-5 h-5 text-emerald-600" />
            <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100">Change Password</h3>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">Current Password</label>
              <div className="relative">
                <input
                  type={showCurrentPassword ? 'text' : 'password'}
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  className="w-full px-3 py-2.5 pr-10 border border-slate-300 dark:border-slate-600 rounded-lg text-sm bg-white dark:bg-slate-700 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-colors"
                  placeholder="Enter current password"
                />
                <button
                  type="button"
                  onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors"
                >
                  {showCurrentPassword ? <EyeOffIcon className="w-4 h-4" /> : <EyeIcon className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">New Password</label>
                <div className="relative">
                  <input
                    type={showNewPassword ? 'text' : 'password'}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="w-full px-3 py-2.5 pr-10 border border-slate-300 dark:border-slate-600 rounded-lg text-sm bg-white dark:bg-slate-700 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-colors"
                    placeholder="Enter new password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewPassword(!showNewPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors"
                  >
                    {showNewPassword ? <EyeOffIcon className="w-4 h-4" /> : <EyeIcon className="w-4 h-4" />}
                  </button>
                </div>
                {newPassword && (
                  <div className="mt-2">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs text-slate-600 dark:text-slate-400">Password strength:</span>
                      <span className={`text-xs font-medium ${
                        passwordStrength.label === 'Weak' ? 'text-red-500' :
                        passwordStrength.label === 'Fair' ? 'text-amber-500' :
                        passwordStrength.label === 'Good' ? 'text-yellow-500' :
                        'text-emerald-500'
                      }`}>{passwordStrength.label}</span>
                    </div>
                    <div className="w-full h-1.5 bg-slate-200 dark:bg-slate-600 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-300 ${passwordStrength.color}`}
                        style={{ width: passwordStrength.width }}
                      />
                    </div>
                  </div>
                )}
                {newPassword && newPassword.length < 8 && (
                  <p className="mt-1 text-xs text-amber-600 dark:text-amber-400">Password must be at least 8 characters</p>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">Confirm New Password</label>
                <div className="relative">
                  <input
                    type={showConfirmPassword ? 'text' : 'password'}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="w-full px-3 py-2.5 pr-10 border border-slate-300 dark:border-slate-600 rounded-lg text-sm bg-white dark:bg-slate-700 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-colors"
                    placeholder="Confirm new password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors"
                  >
                    {showConfirmPassword ? <EyeOffIcon className="w-4 h-4" /> : <EyeIcon className="w-4 h-4" />}
                  </button>
                </div>
                {confirmPassword && newPassword !== confirmPassword && (
                  <p className="mt-1 text-xs text-red-500 dark:text-red-400">Passwords do not match</p>
                )}
              </div>
            </div>
          </div>

          <div className="mt-6 flex items-center justify-between">
            <div className="flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400">
              <KeyIcon className="w-4 h-4" />
              <span>Minimum 8 characters required</span>
            </div>
            <button
              onClick={handleChangePassword}
              disabled={changingPassword}
              className="flex items-center gap-2 px-5 py-2.5 bg-slate-900 dark:bg-slate-700 text-white rounded-lg font-medium hover:bg-slate-800 dark:hover:bg-slate-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {changingPassword ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />
                  Changing...
                </>
              ) : (
                <>
                  <KeyIcon className="w-4 h-4" />
                  Change Password
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
