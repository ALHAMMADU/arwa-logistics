'use client';

import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import { Locale, defaultLocale, isRTL, locales } from './config';
import en from './translations/en';
import ar from './translations/ar';
import zh from './translations/zh';
import type { Translations } from './translations/en';

const STORAGE_KEY = 'arwa_locale';

const translationsMap: Record<Locale, Translations> = { en, ar, zh };

interface I18nContextValue {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  t: (key: string, params?: Record<string, string>) => string;
  dir: 'ltr' | 'rtl';
  isRTL: boolean;
  translations: Translations;
}

const I18nContext = createContext<I18nContextValue | null>(null);

function getNestedValue(obj: Record<string, unknown>, path: string): string | undefined {
  const keys = path.split('.');
  let current: unknown = obj;
  for (const key of keys) {
    if (current === null || current === undefined || typeof current !== 'object') {
      return undefined;
    }
    current = (current as Record<string, unknown>)[key];
  }
  return typeof current === 'string' ? current : undefined;
}

function interpolate(template: string, params?: Record<string, string>): string {
  if (!params) return template;
  return template.replace(/\{(\w+)\}/g, (match, key) => {
    return params[key] !== undefined ? params[key] : match;
  });
}

export function I18nProvider({ children }: { children: React.ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved && locales.includes(saved as Locale)) {
        return saved as Locale;
      }
    }
    return defaultLocale;
  });

  const setLocale = useCallback((newLocale: Locale) => {
    setLocaleState(newLocale);
    if (typeof window !== 'undefined') {
      localStorage.setItem(STORAGE_KEY, newLocale);
    }
  }, []);

  const t = useCallback((key: string, params?: Record<string, string>): string => {
    const translations = translationsMap[locale];
    const value = getNestedValue(translations as unknown as Record<string, unknown>, key);
    if (value !== undefined) {
      return interpolate(value, params);
    }
    // Fallback to English
    const fallbackValue = getNestedValue(en as unknown as Record<string, unknown>, key);
    if (fallbackValue !== undefined) {
      return interpolate(fallbackValue, params);
    }
    // Return the key itself as last resort
    return key;
  }, [locale]);

  const rtl = isRTL(locale);
  const dir = rtl ? 'rtl' : 'ltr';

  // Update document dir and lang attribute
  useEffect(() => {
    if (typeof document !== 'undefined') {
      document.documentElement.dir = dir;
      document.documentElement.lang = locale;
    }
  }, [dir, locale]);

  const contextValue = useMemo<I18nContextValue>(() => ({
    locale,
    setLocale,
    t,
    dir,
    isRTL: rtl,
    translations: translationsMap[locale],
  }), [locale, setLocale, t, dir, rtl]);

  return (
    <I18nContext.Provider value={contextValue}>
      {children}
    </I18nContext.Provider>
  );
}

export function useI18n(): I18nContextValue {
  const context = useContext(I18nContext);
  if (!context) {
    throw new Error('useI18n must be used within an I18nProvider');
  }
  return context;
}
