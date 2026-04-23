import { create } from 'zustand';

export type AppPage = 'landing' | 'login' | 'register' | 'forgot-password' | 'reset-password' | 'dashboard' | 'analytics' | 'admin' | 'admin-shipments' | 'admin-routes' | 'admin-methods' | 'admin-warehouses' | 'admin-countries' | 'admin-users' | 'admin-audit' | 'admin-reports' | 'admin-finance' | 'admin-settings' | 'admin-payments' | 'admin-tickets' | 'admin-quotations' | 'warehouse' | 'warehouse-dashboard' | 'warehouse-scan' | 'warehouse-shipments' | 'create-shipment' | 'shipment-detail' | 'shipment-map' | 'public-tracking' | 'profile' | 'invoice' | 'payment' | 'quotations' | 'support-tickets' | 'shipping-label' | 'ai-chat';

interface User {
  id: string;
  email: string;
  name: string;
  role: string;
  phone?: string;
  company?: string;
}

interface AppState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  currentPage: AppPage;
  selectedShipmentId: string | null;
  trackingNumber: string | null;
  labelShipmentIds: string[];
  sidebarOpen: boolean;
  loading: boolean;
  theme: 'light' | 'dark';
  locale: 'ar' | 'en' | 'zh';

  setUser: (user: User | null, token: string | null) => void;
  logout: () => void;
  setCurrentPage: (page: AppPage) => void;
  setSelectedShipmentId: (id: string | null) => void;
  setTrackingNumber: (tn: string | null) => void;
  setLabelShipmentIds: (ids: string[]) => void;
  setSidebarOpen: (open: boolean) => void;
  setLoading: (loading: boolean) => void;
  toggleTheme: () => void;
  setLocale: (locale: 'ar' | 'en' | 'zh') => void;
}

export const useAppStore = create<AppState>((set, get) => ({
  user: null,
  token: typeof window !== 'undefined' ? localStorage.getItem('arwa_token') : null,
  isAuthenticated: false,
  currentPage: 'landing',
  selectedShipmentId: null,
  trackingNumber: null,
  labelShipmentIds: [],
  sidebarOpen: true,
  loading: false,
  theme: typeof window !== 'undefined' ? (localStorage.getItem('arwa_theme') as 'light' | 'dark') || 'light' : 'light',
  locale: typeof window !== 'undefined' ? (localStorage.getItem('arwa_locale') as 'ar' | 'en' | 'zh') || 'en' : 'en',

  setUser: (user, token) => {
    if (token && typeof window !== 'undefined') {
      localStorage.setItem('arwa_token', token);
    }
    set({ user, token, isAuthenticated: !!user });
  },

  logout: () => {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('arwa_token');
    }
    set({ user: null, token: null, isAuthenticated: false, currentPage: 'landing' });
  },

  setCurrentPage: (page) => set({ currentPage: page }),
  setSelectedShipmentId: (id) => set({ selectedShipmentId: id }),
  setTrackingNumber: (tn) => set({ trackingNumber: tn }),
  setLabelShipmentIds: (ids) => set({ labelShipmentIds: ids }),
  setSidebarOpen: (open) => set({ sidebarOpen: open }),
  setLoading: (loading) => set({ loading }),

  toggleTheme: () => {
    const newTheme = get().theme === 'light' ? 'dark' : 'light';
    if (typeof window !== 'undefined') {
      localStorage.setItem('arwa_theme', newTheme);
    }
    set({ theme: newTheme });
  },

  setLocale: (locale) => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('arwa_locale', locale);
    }
    set({ locale });
  },
}));
