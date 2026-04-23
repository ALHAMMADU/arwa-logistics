'use client';

import React, { useState } from 'react';
import { useAppStore } from '@/lib/store';
import { apiFetch } from '@/lib/api';
import { ShipIcon, ArrowLeftIcon, MailIcon } from '@/components/icons';
import { toast } from 'sonner';
import { useI18n } from '@/lib/i18n';

export default function ForgotPasswordPage() {
  const { setCurrentPage } = useAppStore();
  const { t } = useI18n();
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const res = await apiFetch('/auth/forgot-password', {
        method: 'POST',
        body: JSON.stringify({ email }),
      });
      if (res.success) {
        setSent(true);
        toast.success(t('auth.resetLinkSent') || 'Reset link sent');
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
          <h1 className="text-3xl font-bold text-white">{t('auth.forgotPasswordTitle')}</h1>
          <p className="text-slate-400 mt-2">{t('auth.forgotPasswordDesc')}</p>
        </div>

        {!sent ? (
          <form onSubmit={handleSubmit} className="bg-white/5 border border-white/10 rounded-xl p-6 sm:p-8 backdrop-blur-sm space-y-5">
            {error && (
              <div className="bg-red-500/10 border border-red-500/20 text-red-400 px-4 py-3 rounded-lg text-sm">
                {error}
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">{t('auth.email')}</label>
              <div className="relative">
                <input
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  className="w-full px-4 py-3 pl-11 bg-white/5 border border-white/10 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 transition-colors"
                  placeholder={t('auth.enterEmail')}
                  required
                />
                <MailIcon className="w-5 h-5 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 bg-emerald-600 text-white rounded-lg font-semibold hover:bg-emerald-500 disabled:opacity-50 transition-colors flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  {t('auth.sendResetLink')}
                </>
              ) : t('auth.sendResetLink')}
            </button>

            <div className="text-center">
              <button
                type="button"
                onClick={() => setCurrentPage('login')}
                className="text-sm text-emerald-400 hover:text-emerald-300 transition-colors"
              >
                {t('auth.backToLogin')}
              </button>
            </div>
          </form>
        ) : (
          <div className="bg-white/5 border border-white/10 rounded-xl p-6 sm:p-8 backdrop-blur-sm text-center space-y-4">
            <div className="w-16 h-16 bg-emerald-500/20 rounded-full flex items-center justify-center mx-auto">
              <MailIcon className="w-8 h-8 text-emerald-400" />
            </div>
            <h3 className="text-xl font-semibold text-white">{t('auth.checkYourEmail') || 'Check Your Email'}</h3>
            <p className="text-slate-400 text-sm">
              {t('auth.resetEmailSentDesc') || 'If an account with that email exists, a password reset link has been sent. Please check your inbox and spam folder.'}
            </p>
            <p className="text-slate-500 text-xs">
              {t('auth.resetTokenDemoNote') || 'For demo purposes, check the server console for the reset token.'}
            </p>
            <button
              onClick={() => setCurrentPage('login')}
              className="mt-4 px-6 py-2.5 bg-emerald-600 text-white rounded-lg font-semibold hover:bg-emerald-500 transition-colors"
            >
              {t('auth.backToLogin')}
            </button>
          </div>
        )}

        <button
          onClick={() => setCurrentPage('landing')}
          className="flex items-center gap-2 text-slate-400 hover:text-white mt-6 mx-auto text-sm transition-colors"
        >
          <ArrowLeftIcon className="w-4 h-4" /> {t('auth.backToHome')}
        </button>
      </div>
    </div>
  );
}
