'use client';

import React, { useState } from 'react';
import { useAppStore } from '@/lib/store';
import { apiFetch } from '@/lib/api';
import { ShipIcon, ArrowLeftIcon, EyeIcon, EyeOffIcon } from '@/components/icons';
import { toast } from 'sonner';
import { useI18n } from '@/lib/i18n';

export default function LoginPage() {
  const { setCurrentPage, setUser } = useAppStore();
  const { t } = useI18n();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const res = await apiFetch('/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email, password }),
      });
      if (res.success) {
        setUser(res.data.user, res.data.token);
        const role = res.data.user.role;
        setCurrentPage(role === 'ADMIN' ? 'admin' : role === 'WAREHOUSE_STAFF' ? 'warehouse' : 'dashboard');
        toast.success(t('auth.welcomeBackToast'));
      } else {
        const errMsg = res.error || t('auth.registrationFailed');
        if (errMsg.includes('deactivated')) {
          setError(t('auth.accountDeactivated'));
        } else if (errMsg.includes('Invalid')) {
          setError(t('auth.invalidCredentials'));
        } else {
          setError(errMsg);
        }
      }
    } catch {
      setError(t('errors.networkError'));
    }
    setLoading(false);
  };

  const handleForgotPassword = () => {
    setCurrentPage('forgot-password');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-emerald-900 flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-emerald-500 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg shadow-emerald-500/20">
            <ShipIcon className="w-9 h-9 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-white">{t('auth.loginTitle')}</h1>
          <p className="text-slate-400 mt-2">{t('auth.signInTo')}</p>
        </div>

        {/* Form */}
        <form onSubmit={handleLogin} className="bg-white/5 border border-white/10 rounded-xl p-6 sm:p-8 backdrop-blur-sm space-y-5">
          {error && (
            <div className="bg-red-500/10 border border-red-500/20 text-red-400 px-4 py-3 rounded-lg text-sm flex items-start gap-3">
              <svg className="w-5 h-5 flex-shrink-0 mt-0.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10" />
                <line x1="12" x2="12" y1="8" y2="12" />
                <line x1="12" x2="12.01" y1="16" y2="16" />
              </svg>
              <span>{error}</span>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">{t('auth.email')}</label>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 transition-colors"
              placeholder={t('auth.enterEmail')}
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">{t('auth.password')}</label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={e => setPassword(e.target.value)}
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
          </div>

          {/* Remember Me & Forgot Password */}
          <div className="flex items-center justify-between">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={rememberMe}
                onChange={e => setRememberMe(e.target.checked)}
                className="h-4 w-4 rounded border-slate-600 text-emerald-600 focus:ring-emerald-500 bg-white/5"
              />
              <span className="text-sm text-slate-400">{t('auth.rememberMe')}</span>
            </label>
            <button
              type="button"
              onClick={handleForgotPassword}
              className="text-sm text-emerald-400 hover:text-emerald-300 transition-colors"
            >
              {t('auth.forgotPassword')}
            </button>
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
                {t('auth.signingIn')}
              </>
            ) : t('auth.loginButton')}
          </button>

          {/* Register Link */}
          <div className="text-center">
            <button
              type="button"
              onClick={() => setCurrentPage('register')}
              className="text-sm text-emerald-400 hover:text-emerald-300 transition-colors"
            >
              {t('auth.noAccount')} {t('auth.registerButton')}
            </button>
          </div>

          {/* Demo Accounts */}
          <div className="border-t border-white/10 pt-4">
            <p className="text-xs text-slate-500 text-center mb-3">{t('auth.demoAccounts')}</p>
            <div className="space-y-1.5">
              <button
                type="button"
                onClick={() => { setEmail('admin@arwalogistics.com'); setPassword('admin123'); }}
                className="w-full text-left px-3 py-2 text-xs text-slate-400 bg-white/5 rounded-lg hover:bg-white/10 transition-colors flex items-center justify-between"
              >
                <span>Admin: admin@arwalogistics.com</span>
                <span className="text-slate-600">{t('auth.clickToFill')}</span>
              </button>
              <button
                type="button"
                onClick={() => { setEmail('customer@arwalogistics.com'); setPassword('customer123'); }}
                className="w-full text-left px-3 py-2 text-xs text-slate-400 bg-white/5 rounded-lg hover:bg-white/10 transition-colors flex items-center justify-between"
              >
                <span>Customer: customer@arwalogistics.com</span>
                <span className="text-slate-600">{t('auth.clickToFill')}</span>
              </button>
              <button
                type="button"
                onClick={() => { setEmail('warehouse@arwalogistics.com'); setPassword('warehouse123'); }}
                className="w-full text-left px-3 py-2 text-xs text-slate-400 bg-white/5 rounded-lg hover:bg-white/10 transition-colors flex items-center justify-between"
              >
                <span>Warehouse: warehouse@arwalogistics.com</span>
                <span className="text-slate-600">{t('auth.clickToFill')}</span>
              </button>
            </div>
          </div>
        </form>

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
