'use client';

import React, { useState, useEffect } from 'react';
import { useAppStore, AppPage } from '@/lib/store';
import { apiFetch } from '@/lib/api';
import { toast } from 'sonner';
import { I18nProvider, useI18n } from '@/lib/i18n';

// Page components
import LandingPage from '@/components/landing/LandingPage';
import LoginPage from '@/components/auth/LoginPage';
import RegisterPage from '@/components/auth/RegisterPage';
import ForgotPasswordPage from '@/components/auth/ForgotPasswordPage';
import ResetPasswordPage from '@/components/auth/ResetPasswordPage';
import DashboardLayout from '@/components/dashboard/DashboardLayout';
import CustomerDashboard from '@/components/dashboard/CustomerDashboard';
import CreateShipmentPage from '@/components/dashboard/CreateShipmentPage';
import ShipmentDetailPage from '@/components/dashboard/ShipmentDetailPage';
import InvoicePage from '@/components/dashboard/InvoicePage';
import PaymentPage from '@/components/dashboard/PaymentPage';
import ProfilePage from '@/components/dashboard/ProfilePage';
import CustomerAnalytics from '@/components/dashboard/CustomerAnalytics';
import AdminDashboard from '@/components/admin/AdminDashboard';
import AdminShipments from '@/components/admin/AdminShipments';
import AdminRoutes from '@/components/admin/AdminRoutes';
import AdminCountries from '@/components/admin/AdminCountries';
import AdminWarehouses from '@/components/admin/AdminWarehouses';
import AdminUsers from '@/components/admin/AdminUsers';
import AdminAuditLogs from '@/components/admin/AdminAuditLogs';
import AdminShippingMethods from '@/components/admin/AdminShippingMethods';
import AdminReports from '@/components/admin/AdminReports';
import AdminSettings from '@/components/admin/AdminSettings';
import AdminPayments from '@/components/admin/AdminPayments';
import AdminFinanceDashboard from '@/components/admin/AdminFinanceDashboard';
import AdminTickets from '@/components/admin/AdminTickets';
import AdminQuotations from '@/components/admin/AdminQuotations';
import SupportTickets from '@/components/dashboard/SupportTickets';
import QuotationPage from '@/components/dashboard/QuotationPage';
import WarehouseDashboard from '@/components/warehouse/WarehouseDashboard';
import WarehousePortal from '@/components/warehouse/WarehousePortal';
import PublicTrackingPage from '@/components/tracking/PublicTrackingPage';
import ErrorBoundary from '@/components/shared/ErrorBoundary';
import AIChatWidget from '@/components/shared/AIChatWidget';
import RealtimeProvider from '@/components/shared/RealtimeProvider';
import ShipmentMap from '@/components/shared/ShipmentMap';
import { ShippingLabelPage } from '@/components/shared/ShippingLabel';

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
    <div className="min-h-screen bg-white flex items-center justify-center">
      <div className="flex flex-col items-center gap-3">
        <div className="w-8 h-8 border-3 border-emerald-500 border-t-transparent rounded-full animate-spin" />
        <p className="text-slate-400 text-sm">{t('labels.loadingLabels')}</p>
      </div>
    </div>
  );

  return <ShippingLabelPage labels={labels} onClose={() => setCurrentPage('dashboard')} />;
}

export default function App() {
  const { currentPage, user, token, setUser, setCurrentPage } = useAppStore();

  // Restore session on mount
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
      });
    }
  }, []);

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
        <RealtimeProvider>
          {content}
          <AIChatWidget />
        </RealtimeProvider>
      </ErrorBoundary>
    </I18nProvider>
  );
}
