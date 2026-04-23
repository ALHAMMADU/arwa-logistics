'use client';

import React, { useState, useEffect, useRef, Suspense, lazy } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { useAppStore, AppPage } from '@/lib/store';
import { apiFetch } from '@/lib/api';
import { I18nProvider, useI18n } from '@/lib/i18n';

// Lazy-loaded page components for code splitting
const LandingPage = lazy(() => import('@/components/landing/LandingPage'));
const LoginPage = lazy(() => import('@/components/auth/LoginPage'));
const RegisterPage = lazy(() => import('@/components/auth/RegisterPage'));
const ForgotPasswordPage = lazy(() => import('@/components/auth/ForgotPasswordPage'));
const ResetPasswordPage = lazy(() => import('@/components/auth/ResetPasswordPage'));
const DashboardLayout = lazy(() => import('@/components/dashboard/DashboardLayout'));
const CustomerDashboard = lazy(() => import('@/components/dashboard/CustomerDashboard'));
const CreateShipmentPage = lazy(() => import('@/components/dashboard/CreateShipmentPage'));
const ShipmentDetailPage = lazy(() => import('@/components/dashboard/ShipmentDetailPage'));
const InvoicePage = lazy(() => import('@/components/dashboard/InvoicePage'));
const PaymentPage = lazy(() => import('@/components/dashboard/PaymentPage'));
const ProfilePage = lazy(() => import('@/components/dashboard/ProfilePage'));
const CustomerAnalytics = lazy(() => import('@/components/dashboard/CustomerAnalytics'));
const AdminDashboard = lazy(() => import('@/components/admin/AdminDashboard'));
const AdminShipments = lazy(() => import('@/components/admin/AdminShipments'));
const AdminRoutes = lazy(() => import('@/components/admin/AdminRoutes'));
const AdminCountries = lazy(() => import('@/components/admin/AdminCountries'));
const AdminWarehouses = lazy(() => import('@/components/admin/AdminWarehouses'));
const AdminUsers = lazy(() => import('@/components/admin/AdminUsers'));
const AdminAuditLogs = lazy(() => import('@/components/admin/AdminAuditLogs'));
const AdminShippingMethods = lazy(() => import('@/components/admin/AdminShippingMethods'));
const AdminReports = lazy(() => import('@/components/admin/AdminReports'));
const AdminSettings = lazy(() => import('@/components/admin/AdminSettings'));
const AdminPayments = lazy(() => import('@/components/admin/AdminPayments'));
const AdminFinanceDashboard = lazy(() => import('@/components/admin/AdminFinanceDashboard'));
const AdminTickets = lazy(() => import('@/components/admin/AdminTickets'));
const AdminQuotations = lazy(() => import('@/components/admin/AdminQuotations'));
const SupportTickets = lazy(() => import('@/components/dashboard/SupportTickets'));
const QuotationPage = lazy(() => import('@/components/dashboard/QuotationPage'));
const WarehouseDashboard = lazy(() => import('@/components/warehouse/WarehouseDashboard'));
const WarehousePortal = lazy(() => import('@/components/warehouse/WarehousePortal'));
const PublicTrackingPage = lazy(() => import('@/components/tracking/PublicTrackingPage'));
const ErrorBoundary = lazy(() => import('@/components/shared/ErrorBoundary'));
const AIChatWidget = lazy(() => import('@/components/shared/AIChatWidget'));
const RealtimeProvider = lazy(() => import('@/components/shared/RealtimeProvider'));
const ShipmentMap = lazy(() => import('@/components/shared/ShipmentMap'));
// These are small shared components — eager import is fine
import { ShippingLabelPage } from '@/components/shared/ShippingLabel';
import { BackToTopButton } from '@/components/shared/BackToTopButton';

// Icons for nav
import {
  PackageIcon, BarChartIcon, GlobeIcon, MapPinIcon,
  UsersIcon, ShieldIcon, FileTextIcon, QRIcon, UserIcon,
  TruckIcon, SettingsIcon, CreditCardIcon, MapIcon, ChatIcon,
} from '@/components/icons';

// Nav items per role
const customerNavItems = [
  { page: 'dashboard' as AppPage, label: 'nav.myShipments', icon: <PackageIcon className="w-5 h-5" /> },
  { page: 'analytics' as AppPage, label: 'nav.analytics', icon: <BarChartIcon className="w-5 h-5" /> },
  { page: 'create-shipment' as AppPage, label: 'nav.newShipment', icon: <PackageIcon className="w-5 h-5" /> },
  { page: 'shipment-map' as AppPage, label: 'nav.shipmentMap', icon: <MapIcon className="w-5 h-5" /> },
  { page: 'payment' as AppPage, label: 'nav.payments', icon: <CreditCardIcon className="w-5 h-5" /> },
  { page: 'quotations' as AppPage, label: 'nav.quotations', icon: <CreditCardIcon className="w-5 h-5" /> },
  { page: 'support-tickets' as AppPage, label: 'nav.support', icon: <ChatIcon className="w-5 h-5" /> },
  { page: 'profile' as AppPage, label: 'nav.profile', icon: <UserIcon className="w-5 h-5" /> },
];

const adminNavItems = [
  { page: 'admin' as AppPage, label: 'nav.dashboard', icon: <BarChartIcon className="w-5 h-5" /> },
  { page: 'admin-shipments' as AppPage, label: 'nav.shipments', icon: <PackageIcon className="w-5 h-5" /> },
  { page: 'admin-routes' as AppPage, label: 'nav.routes', icon: <GlobeIcon className="w-5 h-5" /> },
  { page: 'admin-methods' as AppPage, label: 'nav.shippingMethods', icon: <TruckIcon className="w-5 h-5" /> },
  { page: 'admin-warehouses' as AppPage, label: 'nav.warehouses', icon: <MapPinIcon className="w-5 h-5" /> },
  { page: 'admin-countries' as AppPage, label: 'nav.countries', icon: <GlobeIcon className="w-5 h-5" /> },
  { page: 'admin-users' as AppPage, label: 'nav.users', icon: <UsersIcon className="w-5 h-5" /> },
  { page: 'admin-audit' as AppPage, label: 'nav.auditLogs', icon: <FileTextIcon className="w-5 h-5" /> },
  { page: 'admin-reports' as AppPage, label: 'nav.reports', icon: <FileTextIcon className="w-5 h-5" /> },
  { page: 'admin-finance' as AppPage, label: 'nav.finance', icon: <CreditCardIcon className="w-5 h-5" /> },
  { page: 'admin-payments' as AppPage, label: 'nav.payments', icon: <CreditCardIcon className="w-5 h-5" /> },
  { page: 'admin-tickets' as AppPage, label: 'nav.support', icon: <ChatIcon className="w-5 h-5" /> },
  { page: 'admin-quotations' as AppPage, label: 'nav.quotations', icon: <FileTextIcon className="w-5 h-5" /> },
  { page: 'shipment-map' as AppPage, label: 'nav.shipmentMap', icon: <MapIcon className="w-5 h-5" /> },
  { page: 'admin-settings' as AppPage, label: 'nav.settings', icon: <SettingsIcon className="w-5 h-5" /> },
  { page: 'profile' as AppPage, label: 'nav.profile', icon: <UserIcon className="w-5 h-5" /> },
];

const warehouseNavItems = [
  { page: 'warehouse-dashboard' as AppPage, label: 'nav.dashboard', icon: <BarChartIcon className="w-5 h-5" /> },
  { page: 'warehouse-scan' as AppPage, label: 'nav.quickScan', icon: <QRIcon className="w-5 h-5" /> },
  { page: 'warehouse-shipments' as AppPage, label: 'nav.shipments', icon: <PackageIcon className="w-5 h-5" /> },
  { page: 'profile' as AppPage, label: 'nav.profile', icon: <UserIcon className="w-5 h-5" /> },
];

// Page loading fallback
function PageLoader() {
  return (
    <div className="flex items-center justify-center min-h-[40vh]">
      <div className="flex flex-col items-center gap-3">
        <div className="w-8 h-8 border-3 border-emerald-500 border-t-transparent rounded-full animate-spin" />
        <span className="text-slate-400 text-sm">Loading...</span>
      </div>
    </div>
  );
}

function AdminContent({ currentPage }: { currentPage: AppPage }) {
  switch (currentPage) {
    case 'admin-shipments': return <AdminShipments />;
    case 'admin-routes': return <AdminRoutes />;
    case 'admin-methods': return <AdminShippingMethods />;
    case 'admin-warehouses': return <AdminWarehouses />;
    case 'admin-countries': return <AdminCountries />;
    case 'admin-users': return <AdminUsers />;
    case 'admin-audit': return <AdminAuditLogs />;
    case 'admin-reports': return <AdminReports />;
    case 'admin-finance': return <AdminFinanceDashboard />;
    case 'admin-settings': return <AdminSettings />;
    case 'admin-payments': return <AdminPayments />;
    case 'admin-tickets': return <AdminTickets />;
    case 'admin-quotations': return <AdminQuotations />;
    case 'shipment-map': return <ShipmentMap />;
    case 'profile': return <ProfilePage />;
    default: return <AdminDashboard />;
  }
}

function WarehouseContent({ currentPage }: { currentPage: AppPage }) {
  switch (currentPage) {
    case 'warehouse-scan':
      return <WarehouseDashboard initialView="scan" />;
    case 'warehouse-shipments':
      return <WarehouseDashboard initialView="shipments" />;
    case 'warehouse':
      return <WarehousePortal />;
    default:
      return <WarehouseDashboard />;
  }
}

function CustomerContent({ currentPage }: { currentPage: AppPage }) {
  switch (currentPage) {
    case 'analytics': return <CustomerAnalytics />;
    case 'create-shipment': return <CreateShipmentPage />;
    case 'shipment-detail': return <ShipmentDetailPage />;
    case 'invoice': return <InvoicePage />;
    case 'payment': return <PaymentPage />;
    case 'quotations': return <QuotationPage />;
    case 'support-tickets': return <SupportTickets />;
    case 'shipment-map': return <ShipmentMap />;
    case 'profile': return <ProfilePage />;
    default: return <CustomerDashboard />;
  }
}

// Shipping Label Page - rendered without sidebar for printing
function ShippingLabelPageWrapper() {
  const { labelShipmentIds, setCurrentPage } = useAppStore();
  const { t } = useI18n();
  const [labels, setLabels] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (labelShipmentIds.length === 0) {
      setCurrentPage('dashboard');
      return;
    }
    Promise.all(
      labelShipmentIds.map(id =>
        apiFetch(`/shipments/${id}/label?format=json`).then(r => r.success ? r.data : null)
      )
    ).then(results => {
      setLabels(results.filter(Boolean));
      setLoading(false);
    }).catch(() => {
      setLoading(false);
    });
  }, [labelShipmentIds]);

  if (loading) return (
    <div className="min-h-screen bg-white dark:bg-slate-900 flex items-center justify-center">
      <div className="flex flex-col items-center gap-3">
        <div className="w-8 h-8 border-3 border-emerald-500 border-t-transparent rounded-full animate-spin" />
        <p className="text-slate-400 text-sm">{t('labels.loadingLabels')}</p>
      </div>
    </div>
  );

  return <ShippingLabelPage labels={labels} onClose={() => setCurrentPage('dashboard')} />;
}

// Session restoring loader
function SessionLoader({ children }: { children: React.ReactNode }) {
  const { token, user, setUser } = useAppStore();
  const [restoring, setRestoring] = useState(!!(token && !user));

  useEffect(() => {
    if (token && !user) {
      apiFetch('/auth/me').then(res => {
        if (res.success && res.data?.user) {
          setUser(res.data.user, token);
        } else {
          setUser(null, null);
        }
      }).catch(() => {
        setUser(null, null);
      }).finally(() => {
        setRestoring(false);
      });
    }
  }, [token, user, setUser]);

  if (restoring) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-slate-50 dark:bg-[#0f172a]">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 bg-emerald-500 rounded-xl flex items-center justify-center">
            <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16V6a1 1 0 00-1-1H4a1 1 0 00-1 1v10a1 1 0 001 1h1m8-1a1 1 0 01-1 1H9m4-1V8a1 1 0 011-1h2.586a1 1 0 01.707.293l3.414 3.414a1 1 0 01.293.707V16a1 1 0 01-1 1h-1m-6-1a1 1 0 001 1h1M5 17a2 2 0 104 0m-4 0a2 2 0 114 0m6 0a2 2 0 104 0m-4 0a2 2 0 114 0" />
            </svg>
          </div>
          <div className="flex flex-col items-center gap-2">
            <div className="w-6 h-6 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
            <span className="text-slate-400 text-sm">Restoring session...</span>
          </div>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}

// Page transition variants
const pageVariants = {
  initial: { opacity: 0, y: 8 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -4 },
};

const pageTransition = {
  type: 'tween' as const,
  ease: [0.4, 0, 0.2, 1] as [number, number, number, number],
  duration: 0.25,
};

export default function App() {
  const { currentPage, user, token, setUser, setCurrentPage } = useAppStore();
  const mainRef = useRef<HTMLDivElement>(null);
  const prevPageRef = useRef<AppPage>(currentPage);

  // Scroll to top on page change
  useEffect(() => {
    if (prevPageRef.current !== currentPage) {
      prevPageRef.current = currentPage;
      // Scroll the main content area
      const mainEl = mainRef.current?.querySelector('main') || document.querySelector('main');
      if (mainEl) {
        mainEl.scrollTo({ top: 0, behavior: 'smooth' });
      }
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }, [currentPage]);

  // Determine which page to show
  const publicPages: AppPage[] = ['landing', 'login', 'register', 'forgot-password', 'reset-password', 'public-tracking'];

  let content: React.ReactNode;

  // Shipping label page - full screen without sidebar
  if (currentPage === 'shipping-label') {
    content = <ShippingLabelPageWrapper />;
  } else if (publicPages.includes(currentPage)) {
    switch (currentPage) {
      case 'login':
        content = <LoginPage />;
        break;
      case 'register':
        content = <RegisterPage />;
        break;
      case 'forgot-password':
        content = <ForgotPasswordPage />;
        break;
      case 'reset-password':
        content = <ResetPasswordPage />;
        break;
      case 'public-tracking':
        content = <PublicTrackingPage />;
        break;
      default:
        content = <LandingPage />;
    }
  } else {
    // Authenticated pages
    const role = user?.role;

    // Admin pages
    if (role === 'ADMIN' && ['admin', 'admin-shipments', 'admin-routes', 'admin-methods', 'admin-warehouses', 'admin-countries', 'admin-users', 'admin-audit', 'admin-reports', 'admin-finance', 'admin-payments', 'admin-tickets', 'admin-quotations', 'shipment-map', 'admin-settings', 'profile'].includes(currentPage)) {
      content = (
        <DashboardLayout navItems={adminNavItems}>
          <AdminContent currentPage={currentPage} />
        </DashboardLayout>
      );
    }
    // Warehouse pages
    else if (role === 'WAREHOUSE_STAFF' && ['warehouse', 'warehouse-dashboard', 'warehouse-scan', 'warehouse-shipments'].includes(currentPage)) {
      content = (
        <DashboardLayout navItems={warehouseNavItems}>
          <WarehouseContent currentPage={currentPage} />
        </DashboardLayout>
      );
    }
    // Customer pages (default)
    else {
      content = (
        <DashboardLayout navItems={customerNavItems}>
          <CustomerContent currentPage={currentPage} />
        </DashboardLayout>
      );
    }
  }

  return (
    <I18nProvider>
      <ErrorBoundary>
        <SessionLoader>
          <RealtimeProvider>
            <div ref={mainRef} id="main-content">
              <AnimatePresence mode="wait">
                <motion.div
                  key={currentPage}
                  variants={pageVariants}
                  initial="initial"
                  animate="animate"
                  exit="exit"
                  transition={pageTransition}
                >
                  <Suspense fallback={<PageLoader />}>
                    {content}
                  </Suspense>
                </motion.div>
              </AnimatePresence>
            </div>
            <Suspense fallback={null}>
              <AIChatWidget />
            </Suspense>
            <BackToTopButton />
          </RealtimeProvider>
        </SessionLoader>
      </ErrorBoundary>
    </I18nProvider>
  );
}
