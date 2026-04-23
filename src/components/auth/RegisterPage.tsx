'use client';

import React, { useState } from 'react';
import { useAppStore } from '@/lib/store';
import { apiFetch } from '@/lib/api';
import { ShipIcon, ArrowLeftIcon, CheckCircleIcon, UserIcon, BuildingIcon } from '@/components/icons';
import { toast } from 'sonner';
import { useI18n } from '@/lib/i18n';

function getPasswordStrength(password: string, t: (key: string) => string): { level: string; label: string; color: string; percent: number } {
  let score = 0;
  if (password.length >= 6) score++;
  if (password.length >= 10) score++;
  if (/[0-9]/.test(password)) score++;
  if (/[^A-Za-z0-9]/.test(password)) score++;
  if (/[A-Z]/.test(password) && /[a-z]/.test(password)) score++;

  if (score <= 2) return { level: 'Weak', label: t('auth.weakPassword'), color: 'bg-red-500', percent: score <= 1 ? 20 : 33 };
  if (score <= 3) return { level: 'Medium', label: t('auth.mediumPassword'), color: 'bg-amber-500', percent: 66 };
  return { level: 'Strong', label: t('auth.strongPassword'), color: 'bg-emerald-500', percent: 100 };
}

export default function RegisterPage() {
  const { setCurrentPage, setUser } = useAppStore();
  const { t } = useI18n();
  const [step, setStep] = useState(1); // 1=Account Info, 2=Personal Info, 3=Done
  const [form, setForm] = useState({
    email: '',
    password: '',
    confirmPassword: '',
    name: '',
    phone: '',
    company: '',
    accountType: 'CUSTOMER' as 'CUSTOMER' | 'WAREHOUSE_STAFF',
    termsAccepted: false,
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const strength = getPasswordStrength(form.password, t);

  const inputClass =
    'w-full px-4 py-2.5 bg-white/5 border border-white/10 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 transition-colors';

  const handleNext = () => {
    setError('');
    if (step === 1) {
      if (!form.email) { setError(t('auth.emailRequired')); return; }
      if (!form.password) { setError(t('auth.passwordRequired')); return; }
      if (form.password.length < 6) { setError(t('auth.passwordMinLength')); return; }
      if (form.password !== form.confirmPassword) { setError(t('validation.passwordsMismatch')); return; }
      setStep(2);
    }
  };

  const handleBack = () => {
    setError('');
    setStep(1);
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name) { setError(t('auth.fullNameRequired')); return; }
    if (!form.termsAccepted) { setError(t('auth.mustAcceptTerms')); return; }

    setLoading(true);
    setError('');
    try {
      const res = await apiFetch('/auth/register', {
        method: 'POST',
        body: JSON.stringify({
          email: form.email,
          password: form.password,
          name: form.name,
          phone: form.phone,
          company: form.company,
          role: form.accountType,
        }),
      });
      if (res.success) {
        setUser(res.data.user, res.data.token);
        setStep(3);
        toast.success(t('auth.accountCreatedToast'));
      } else {
        setError(res.error || t('auth.registrationFailed'));
      }
    } catch {
      setError(t('auth.networkError'));
    }
    setLoading(false);
  };

  // Success State
  if (step === 3) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-emerald-900 flex items-center justify-center px-4">
        <div className="w-full max-w-md text-center">
          <div className="w-20 h-20 bg-emerald-500/20 rounded-full flex items-center justify-center mx-auto mb-6">
            <CheckCircleIcon className="w-10 h-10 text-emerald-400" />
          </div>
          <h1 className="text-3xl font-bold text-white mb-3">{t('auth.accountCreated')}</h1>
          <p className="text-slate-400 mb-8 leading-relaxed">
            {t('auth.accountCreatedWelcome')}
          </p>
          <div className="bg-white/5 border border-white/10 rounded-xl p-6 text-left mb-6 backdrop-blur-sm">
            <h3 className="text-sm font-semibold text-white mb-4">{t('auth.nextSteps')}</h3>
            <div className="space-y-3">
              <div className="flex items-start gap-3">
                <div className="w-6 h-6 bg-emerald-500/20 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                  <span className="text-xs font-bold text-emerald-400">1</span>
                </div>
                <div>
                  <p className="text-sm text-white font-medium">{t('auth.step1CreateShipment')}</p>
                  <p className="text-xs text-slate-400">{t('auth.step1Desc')}</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="w-6 h-6 bg-emerald-500/20 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                  <span className="text-xs font-bold text-emerald-400">2</span>
                </div>
                <div>
                  <p className="text-sm text-white font-medium">{t('auth.step2TrackRealtime')}</p>
                  <p className="text-xs text-slate-400">{t('auth.step2Desc')}</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="w-6 h-6 bg-emerald-500/20 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                  <span className="text-xs font-bold text-emerald-400">3</span>
                </div>
                <div>
                  <p className="text-sm text-white font-medium">{t('auth.step3CompleteProfile')}</p>
                  <p className="text-xs text-slate-400">{t('auth.step3Desc')}</p>
                </div>
              </div>
            </div>
          </div>
          <button
            onClick={() => setCurrentPage('dashboard')}
            className="w-full py-3 bg-emerald-600 text-white rounded-xl font-semibold hover:bg-emerald-500 transition-colors"
          >
            {t('auth.goToDashboard')}
          </button>
          <button
            onClick={() => setCurrentPage('landing')}
            className="flex items-center gap-2 text-slate-400 hover:text-white mt-4 mx-auto text-sm transition-colors"
          >
            <ArrowLeftIcon className="w-4 h-4" /> {t('auth.backToHome')}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-emerald-900 flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="w-14 h-14 bg-emerald-500 rounded-xl flex items-center justify-center mx-auto mb-4">
            <ShipIcon className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-white">{t('auth.registerTitle')}</h1>
          <p className="text-slate-400 mt-2">{t('auth.startShipping')}</p>
        </div>

        {/* Steps Indicator */}
        <div className="flex items-center justify-center gap-2 mb-6">
          <div className="flex items-center gap-2">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-colors ${step >= 1 ? 'bg-emerald-500 text-white' : 'bg-white/10 text-slate-400'}`}>
              {step > 1 ? <CheckCircleIcon className="w-4 h-4" /> : '1'}
            </div>
            <span className={`text-xs font-medium ${step >= 1 ? 'text-emerald-400' : 'text-slate-500'}`}>{t('auth.accountInfo')}</span>
          </div>
          <div className={`w-8 h-px ${step >= 2 ? 'bg-emerald-500' : 'bg-white/10'}`} />
          <div className="flex items-center gap-2">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-colors ${step >= 2 ? 'bg-emerald-500 text-white' : 'bg-white/10 text-slate-400'}`}>
              2
            </div>
            <span className={`text-xs font-medium ${step >= 2 ? 'text-emerald-400' : 'text-slate-500'}`}>{t('auth.personalInfoStep')}</span>
          </div>
          <div className={`w-8 h-px ${step >= 3 ? 'bg-emerald-500' : 'bg-white/10'}`} />
          <div className="flex items-center gap-2">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-colors ${step >= 3 ? 'bg-emerald-500 text-white' : 'bg-white/10 text-slate-400'}`}>
              3
            </div>
            <span className={`text-xs font-medium ${step >= 3 ? 'text-emerald-400' : 'text-slate-500'}`}>{t('auth.done')}</span>
          </div>
        </div>

        {/* Form Card */}
        <form onSubmit={handleRegister} className="bg-white/5 border border-white/10 rounded-xl p-6 sm:p-8 backdrop-blur-sm space-y-4">
          {error && (
            <div className="bg-red-500/10 border border-red-500/20 text-red-400 px-4 py-3 rounded-lg text-sm">
              {error}
            </div>
          )}

          {/* Step 1: Account Info */}
          {step === 1 && (
            <>
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1.5">{t('auth.email')} *</label>
                <input
                  type="email"
                  value={form.email}
                  onChange={e => setForm({ ...form, email: e.target.value })}
                  className={inputClass}
                  placeholder="your@email.com"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1.5">{t('auth.password')} *</label>
                <input
                  type="password"
                  value={form.password}
                  onChange={e => setForm({ ...form, password: e.target.value })}
                  className={inputClass}
                  placeholder={t('auth.minPasswordChars')}
                  required
                  minLength={6}
                />
                {form.password && (
                  <div className="mt-2">
                    <div className="h-1.5 bg-white/10 rounded-full overflow-hidden">
                      <div
                        className={`h-full ${strength.color} rounded-full transition-all duration-300`}
                        style={{ width: `${strength.percent}%` }}
                      />
                    </div>
                    <p className={`text-xs mt-1 ${strength.level === 'Weak' ? 'text-red-400' : strength.level === 'Medium' ? 'text-amber-400' : 'text-emerald-400'}`}>
                      {t('auth.passwordStrength')}: {strength.label}
                    </p>
                  </div>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1.5">{t('auth.confirmPassword')} *</label>
                <input
                  type="password"
                  value={form.confirmPassword}
                  onChange={e => setForm({ ...form, confirmPassword: e.target.value })}
                  className={inputClass}
                  placeholder={t('auth.reenterPassword')}
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1.5">{t('auth.accountType')} *</label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setForm({ ...form, accountType: 'CUSTOMER' })}
                    className={`p-3 rounded-lg border text-center transition-all ${
                      form.accountType === 'CUSTOMER'
                        ? 'border-emerald-500 bg-emerald-500/10 text-white'
                        : 'border-white/10 text-slate-400 hover:border-white/20'
                    }`}
                  >
                    <UserIcon className="w-5 h-5 mx-auto mb-1.5" />
                    <div className="text-sm font-medium">{t('auth.customerAccount')}</div>
                    <div className="text-xs text-slate-500 mt-0.5">{t('auth.customerAccountDesc')}</div>
                  </button>
                  <button
                    type="button"
                    onClick={() => setForm({ ...form, accountType: 'WAREHOUSE_STAFF' })}
                    className={`p-3 rounded-lg border text-center transition-all ${
                      form.accountType === 'WAREHOUSE_STAFF'
                        ? 'border-emerald-500 bg-emerald-500/10 text-white'
                        : 'border-white/10 text-slate-400 hover:border-white/20'
                    }`}
                  >
                    <BuildingIcon className="w-5 h-5 mx-auto mb-1.5" />
                    <div className="text-sm font-medium">{t('auth.warehouseStaffAccount')}</div>
                    <div className="text-xs text-slate-500 mt-0.5">{t('auth.warehouseStaffAccountDesc')}</div>
                  </button>
                </div>
              </div>
              <button
                type="button"
                onClick={handleNext}
                className="w-full py-3 bg-emerald-600 text-white rounded-lg font-semibold hover:bg-emerald-500 transition-colors mt-2"
              >
                {t('auth.continueStep')}
              </button>
            </>
          )}

          {/* Step 2: Personal Info */}
          {step === 2 && (
            <>
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1.5">{t('profile.fullName')} *</label>
                <input
                  type="text"
                  value={form.name}
                  onChange={e => setForm({ ...form, name: e.target.value })}
                  className={inputClass}
                  placeholder="John Doe"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1.5">{t('profile.phone')}</label>
                <input
                  type="tel"
                  value={form.phone}
                  onChange={e => setForm({ ...form, phone: e.target.value })}
                  className={inputClass}
                  placeholder="+1 (555) 000-0000"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1.5">{t('profile.company')}</label>
                <input
                  type="text"
                  value={form.company}
                  onChange={e => setForm({ ...form, company: e.target.value })}
                  className={inputClass}
                  placeholder="Your Company Ltd."
                />
              </div>
              <div className="flex items-start gap-3 pt-2">
                <input
                  type="checkbox"
                  id="terms"
                  checked={form.termsAccepted}
                  onChange={e => setForm({ ...form, termsAccepted: e.target.checked })}
                  className="mt-1 h-4 w-4 rounded border-slate-600 text-emerald-600 focus:ring-emerald-500 bg-white/5"
                />
                <label htmlFor="terms" className="text-sm text-slate-400 leading-relaxed">
                  {t('auth.agreeTerms')}
                </label>
              </div>
              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={handleBack}
                  className="px-6 py-3 bg-white/5 border border-white/10 text-white rounded-lg font-semibold hover:bg-white/10 transition-colors"
                >
                  {t('common.back')}
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 py-3 bg-emerald-600 text-white rounded-lg font-semibold hover:bg-emerald-500 disabled:opacity-50 transition-colors"
                >
                  {loading ? (
                    <span className="flex items-center justify-center gap-2">
                      <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                      </svg>
                      {t('auth.creatingAccount')}
                    </span>
                  ) : t('auth.registerButton')}
                </button>
              </div>
            </>
          )}

          {/* Link to Login */}
          <div className="text-center pt-2">
            <button
              type="button"
              onClick={() => setCurrentPage('login')}
              className="text-sm text-emerald-400 hover:text-emerald-300 transition-colors"
            >
              {t('auth.hasAccount')} {t('auth.loginButton')}
            </button>
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
