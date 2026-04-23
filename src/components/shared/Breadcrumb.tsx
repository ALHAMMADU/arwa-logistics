'use client';

import React from 'react';
import { useAppStore, AppPage } from '@/lib/store';
import { useI18n } from '@/lib/i18n';
import { ChevronRightIcon, HomeIcon } from '@/components/icons';

// Map page to breadcrumb label
const PAGE_LABELS: Record<string, string> = {
  'dashboard': 'nav.dashboard',
  'analytics': 'nav.analytics',
  'create-shipment': 'nav.newShipment',
  'shipment-detail': 'shipment.detail',
  'invoice': 'invoice.title',
  'payment': 'nav.payments',
  'quotations': 'nav.quotations',
  'support-tickets': 'nav.support',
  'shipment-map': 'nav.shipmentMap',
  'profile': 'nav.profile',
  'admin': 'admin.dashboard',
  'admin-shipments': 'nav.shipments',
  'admin-routes': 'nav.routes',
  'admin-methods': 'nav.shippingMethods',
  'admin-warehouses': 'nav.warehouses',
  'admin-countries': 'nav.countries',
  'admin-users': 'nav.users',
  'admin-audit': 'nav.auditLogs',
  'admin-reports': 'nav.reports',
  'admin-finance': 'nav.finance',
  'admin-payments': 'nav.payments',
  'admin-tickets': 'nav.support',
  'admin-quotations': 'nav.quotations',
  'admin-settings': 'nav.settings',
  'warehouse-dashboard': 'warehouse.dashboard',
  'warehouse-scan': 'warehouse.scanTab',
  'warehouse-shipments': 'warehouse.allShipments',
  'warehouse': 'warehouse.portal',
};

// Map page to parent page for breadcrumb hierarchy
const PAGE_PARENTS: Record<string, AppPage> = {
  'analytics': 'dashboard',
  'create-shipment': 'dashboard',
  'shipment-detail': 'dashboard',
  'invoice': 'dashboard',
  'payment': 'dashboard',
  'quotations': 'dashboard',
  'support-tickets': 'dashboard',
  'profile': 'dashboard',
  'admin-shipments': 'admin',
  'admin-routes': 'admin',
  'admin-methods': 'admin',
  'admin-warehouses': 'admin',
  'admin-countries': 'admin',
  'admin-users': 'admin',
  'admin-audit': 'admin',
  'admin-reports': 'admin',
  'admin-finance': 'admin',
  'admin-payments': 'admin',
  'admin-tickets': 'admin',
  'admin-quotations': 'admin',
  'admin-settings': 'admin',
  'warehouse-scan': 'warehouse-dashboard',
  'warehouse-shipments': 'warehouse-dashboard',
};

export function Breadcrumb() {
  const { currentPage, setCurrentPage, user } = useAppStore();
  const { t, isRTL } = useI18n();

  // Build breadcrumb path
  const crumbs: { page: AppPage; label: string }[] = [];

  // Add home/root
  const rootPage: AppPage = user?.role === 'ADMIN' ? 'admin' : user?.role === 'WAREHOUSE_STAFF' ? 'warehouse-dashboard' : 'dashboard';
  crumbs.push({ page: rootPage, label: t(PAGE_LABELS[rootPage] || 'nav.dashboard') });

  // Add intermediate parent if exists
  const parent = PAGE_PARENTS[currentPage];
  if (parent && parent !== rootPage) {
    crumbs.push({ page: parent, label: t(PAGE_LABELS[parent] || parent) });
  }

  // Add current page (if not root)
  if (currentPage !== rootPage) {
    crumbs.push({ page: currentPage, label: t(PAGE_LABELS[currentPage] || currentPage) });
  }

  // Don't render breadcrumb if only one item (root only)
  if (crumbs.length <= 1) return null;

  return (
    <nav aria-label="Breadcrumb" className="flex items-center gap-1 text-sm mb-4 overflow-x-auto">
      {crumbs.map((crumb, i) => {
        const isLast = i === crumbs.length - 1;
        return (
          <React.Fragment key={crumb.page}>
            {i > 0 && (
              <ChevronRightIcon className={`w-3.5 h-3.5 text-slate-300 dark:text-slate-600 flex-shrink-0 ${isRTL ? 'rotate-180' : ''}`} />
            )}
            {isLast ? (
              <span className="text-slate-900 dark:text-slate-100 font-medium whitespace-nowrap">
                {crumb.label}
              </span>
            ) : (
              <button
                onClick={() => setCurrentPage(crumb.page)}
                className="text-slate-500 dark:text-slate-400 hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors whitespace-nowrap"
              >
                {i === 0 ? (
                  <span className="flex items-center gap-1">
                    <HomeIcon className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline">{crumb.label}</span>
                  </span>
                ) : (
                  crumb.label
                )}
              </button>
            )}
          </React.Fragment>
        );
      })}
    </nav>
  );
}
