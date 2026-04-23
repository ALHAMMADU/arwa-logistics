export type Locale = 'ar' | 'en' | 'zh';

export const locales: Locale[] = ['ar', 'en', 'zh'];
export const defaultLocale: Locale = 'en';

export const localeNames: Record<Locale, string> = {
  ar: 'العربية',
  en: 'English',
  zh: '中文',
};

export const localeFlags: Record<Locale, string> = {
  ar: '🇸🇦',
  en: '🇬🇧',
  zh: '🇨🇳',
};

export const rtlLocales: Locale[] = ['ar'];

export function isRTL(locale: Locale): boolean {
  return rtlLocales.includes(locale);
}
