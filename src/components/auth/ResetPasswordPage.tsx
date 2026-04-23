'use client';

import React, { useState, useEffect } from 'react';
import { useAppStore } from '@/lib/store';
import { apiFetch } from '@/lib/api';
import { ShipIcon, ArrowLeftIcon, EyeIcon, EyeOffIcon, CheckCircleIcon } from '@/components/icons';
import { toast } from 'sonner';
import { useI18n } from '@/lib/i18n';

export default function ResetPasswordPage() {
  const { setCurrentPage } = useAppStore();
  const { t } = useI18n();
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [token, setToken] = useState('');

  useEffect(() => {
    // Extract token from URL hash or query params
    const hash = window.location.hash;
    const params = new URLSearchParams(window.location.search);
    const urlToken = params.get('token') || (hash.startsWith('#token=') ? hash.slice(7) : '');
    if (urlToken) {
      setToken(urlToken);
    }
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!token) {
      setError(t('auth.invalidResetToken') || 'Invalid or missing reset token');
      return;
    }

    if (newPassword.length < 6) {
      setError(t('auth.passwordMinLength'));
      return;
    }

    if (newPassword !== confirmPassword) {
      setError(t('validation.passwordsMismatch'));
      return;
    }

    setLoading(true);
    try {
      const res = await apiFetch('/auth/reset-password', {
        method: 'POST',
        body: JSON.stringify({ token, newPassword }),
      });
      if (res.success) {
        setSuccess(true);
        toast.success(t('auth.passwordResetSuccess') || 'Password reset successfully');
      } else {
        setError(res.error || t('errors.serverError'));
      }
    } catch {
      setError(t('errors.networkError'));
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-emerald-900 flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-emerald-500 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg shadow-emerald-500/20">
            <ShipIcon className="w-9 h-9 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-white">{t('auth.resetPasswordTitle') || 'Reset Password'}</h1>
          <p className="text-slate-400 mt-2">{t('auth.resetPasswordDesc') || 'Enter your new password below'}</p>
        </div>

        {!success ? (
          <form onSubmit={handleSubmit} className="bg-white/5 border border-white/10 rounded-xl p-6 sm:p-8 backdrop-blur-sm space-y-5">
            {error && (
              <div className="bg-red-500/10 border border-red-500/20 text-red-400 px-4 py-3 rounded-lg text-sm">
                {error}
              </div>
            )}

            {!token && (
              <div className="bg-amber-500/10 border border-amber-500/20 text-amber-400 px-4 py-3 rounded-lg text-sm">
                {t('auth.noResetToken') || 'No reset token found. Please request a new password reset link.'}
              </div>
            )}

            {/* Token input for manual entry (demo/testing) */}
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                {t('auth.resetToken') || 'Reset Token'}
              </label>
              <input
                type="text"
                value={token}
                onChange={e => setToken(e.target.value)}
                className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 transition-colors text-sm font-mono"
                placeholder={t('auth.enterResetToken') || 'Paste your reset token here'}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">{t('auth.newPassword') || 'New Password'}</label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={newPassword}
                  onChange={e => setNewPassword(e.target.value)}
                  className="w-full px-4 py-3 pr-12 bg-white/5 border border-white/10 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 transition-colors"
                  placeholder={t('auth.enterPassword')}
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-300 transition-colors"
                >
                  {showPassword ? <EyeOffIcon className="w-4 h-4" /> : <EyeIcon className="w-4 h-4" />}
                </button>
              </div>
              {/* Password strength indicator */}
              {newPassword && (
                <div className="mt-2 flex gap-1">
                  {[1, 2, 3, 4].map(i => (
                    <div
                      key={i}
                      className={`h-1 flex-1 rounded-full ${
                        newPassword.length >= i * 3
                          ? i <= 1 ? 'bg-red-500' : i <= 2 ? 'bg-amber-500' : i <= 3 ? 'bg-emerald-400' : 'bg-emerald-500'
                          : 'bg-slate-700'
                      }`}
                    />
                  ))}
                </div>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">{t('auth.confirmPassword')}</label>
              <input
                type={showPassword ? 'text' : 'password'}
                value={confirmPassword}
                onChange={e => setConfirmPassword(e.target.value)}
                className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 transition-colors"
                placeholder={t('auth.reenterPassword')}
                required
              />
              {confirmPassword && newPassword !== confirmPassword && (
                <p className="text-red-400 text-xs mt-1">{t('validation.passwordsMismatch')}</p>
              )}
            </div>

            <button
              type="submit"
              disabled={loading || !token}
              className="w-full py-3 bg-emerald-600 text-white rounded-lg font-semibold hover:bg-emerald-500 disabled:opacity-50 transition-colors flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  {t('auth.resettingPassword') || 'Resetting...'}
                </>
              ) : (t('auth.resetPasswordButton') || 'Reset Password')}
            </button>
          </form>
        ) : (
          <div className="bg-white/5 border border-white/10 rounded-xl p-6 sm:p-8 backdrop-blur-sm text-center space-y-4">
            <div className="w-16 h-16 bg-emerald-500/20 rounded-full flex items-center justify-center mx-auto">
              <CheckCircleIcon className="w-8 h-8 text-emerald-400" />
            </div>
            <h3 className="text-xl font-semibold text-white">{t('auth.passwordResetSuccess') || 'Password Reset Successfully'}</h3>
            <p className="text-slate-400 text-sm">
              {t('auth.passwordResetSuccessDesc') || 'Your password has been reset. You can now sign in with your new password.'}
            </p>
            <button
              onClick={() => setCurrentPage('login')}
              className="mt-4 px-6 py-2.5 bg-emerald-600 text-white rounded-lg font-semibold hover:bg-emerald-500 transition-colors"
            >
              {t('auth.loginButton')}
            </button>
          </div>
        )}

        <button
          onClick={() => setCurrentPage('login')}
          className="flex items-center gap-2 text-slate-400 hover:text-white mt-6 mx-auto text-sm transition-colors"
        >
          <ArrowLeftIcon className="w-4 h-4" /> {t('auth.backToLogin')}
        </button>
      </div>
    </div>
  );
}
