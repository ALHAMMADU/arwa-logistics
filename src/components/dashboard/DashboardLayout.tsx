'use client';

import React, { useState, useEffect } from 'react';
import { useAppStore, AppPage } from '@/lib/store';
import { ShipIcon, LogOutIcon, MenuIcon, SearchIcon, UserIcon, BellIcon, XIcon } from '@/components/icons';
import NotificationCenter from '@/components/shared/NotificationCenter';
import GlobalSearch from '@/components/shared/GlobalSearch';
import ThemeToggle from '@/components/shared/ThemeToggle';
import LanguageSwitcher from '@/components/shared/LanguageSwitcher';
import { Breadcrumb } from '@/components/shared/Breadcrumb';
import { useRealtimeStatus } from '@/components/shared/RealtimeProvider';
import { Tooltip, TooltipTrigger, TooltipContent } from '@/components/ui/tooltip';
import { useI18n } from '@/lib/i18n';

interface DashboardLayoutProps {
  children: React.ReactNode;
  navItems: { page: AppPage; label: string; icon: React.ReactNode }[];
}

function LiveIndicator() {
  const { connected } = useRealtimeStatus();
  const { t } = useI18n();
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <div className="flex items-center gap-1.5 px-2 py-1 rounded-md cursor-default">
          <span className="relative flex h-2.5 w-2.5">
            {connected ? (
              <>
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500" />
              </>
            ) : (
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-red-400" />
            )}
          </span>
          <span className={`text-xs font-medium ${connected ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-500 dark:text-red-400'}`}>
            {connected ? t('realtime.live') : t('realtime.offline')}
          </span>
        </div>
      </TooltipTrigger>
      <TooltipContent side="bottom">
        {connected ? t('realtime.connectionActive') : t('realtime.disconnectedDelayed')}
      </TooltipContent>
    </Tooltip>
  );
}

export default function DashboardLayout({ children, navItems }: DashboardLayoutProps) {
  const { user, logout, currentPage, setCurrentPage, sidebarOpen, setSidebarOpen, theme } = useAppStore();
  const { dir, isRTL, t } = useI18n();
  const [searchOpen, setSearchOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Close mobile menu on page change
  const handleNavigate = (page: AppPage) => {
    setCurrentPage(page);
    setMobileMenuOpen(false);
  };

  // Close mobile menu when resizing to desktop
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth >= 768) {
        setMobileMenuOpen(false);
      }
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Lock body scroll when mobile menu is open
  useEffect(() => {
    if (mobileMenuOpen) {
      document.body.classList.add('menu-open');
    } else {
      document.body.classList.remove('menu-open');
    }
    return () => document.body.classList.remove('menu-open');
  }, [mobileMenuOpen]);

  // Apply dark class to root element
  useEffect(() => {
    if (typeof document !== 'undefined') {
      if (theme === 'dark') {
        document.documentElement.classList.add('dark');
      } else {
        document.documentElement.classList.remove('dark');
      }
    }
  }, [theme]);

  return (
    <div className={`min-h-screen bg-slate-50 dark:bg-[#0f172a] flex ${theme === 'dark' ? 'dark' : ''} ${isRTL ? 'rtl' : 'ltr'}`} dir={dir}>
      {/* Mobile overlay */}
      {mobileMenuOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-30 md:hidden"
          onClick={() => setMobileMenuOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* Sidebar - Desktop */}
      <aside className={`hidden md:flex ${sidebarOpen ? 'w-64' : 'w-16'} bg-slate-900 text-white transition-all duration-300 flex-col fixed h-full z-40 ${isRTL ? 'right-0' : 'left-0'}`}>
        <div className="p-4 border-b border-white/10 flex items-center gap-3">
          <div className="w-8 h-8 bg-emerald-500 rounded-lg flex items-center justify-center flex-shrink-0">
            <ShipIcon className="w-5 h-5 text-white" />
          </div>
          {sidebarOpen && <span className="font-bold text-sm tracking-wide">ARWA LOGISTICS</span>}
        </div>
        <nav className="flex-1 p-2 space-y-1 overflow-y-auto sidebar-scroll">
          {navItems.map(item => (
            <button
              key={item.page}
              onClick={() => setCurrentPage(item.page)}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors ${
                currentPage === item.page
                  ? 'bg-emerald-600 text-white'
                  : 'text-slate-400 hover:bg-white/5 hover:text-white'
              }`}
            >
              {item.icon}
              {sidebarOpen && <span>{t(item.label)}</span>}
            </button>
          ))}
        </nav>
        <div className="p-4 border-t border-white/10">
          {sidebarOpen && user && (
            <div className="mb-3">
              <p className="text-sm font-medium text-white truncate">{user.name}</p>
              <p className="text-xs text-slate-400 truncate">{user.email}</p>
              <span className="inline-block mt-1 px-2 py-0.5 bg-emerald-500/20 text-emerald-400 text-xs rounded">
                {user.role}
              </span>
            </div>
          )}
          <button
            onClick={logout}
            className="w-full flex items-center gap-2 px-3 py-2 text-slate-400 hover:text-red-400 rounded-lg text-sm transition-colors"
          >
            <LogOutIcon className="w-4 h-4" /> {sidebarOpen && t('nav.signOut')}
          </button>
        </div>
      </aside>

      {/* Sidebar - Mobile */}
      <aside className={`fixed inset-y-0 ${isRTL ? 'right-0' : 'left-0'} z-40 w-72 bg-slate-900 text-white flex-col transform transition-transform duration-300 ease-in-out md:hidden ${mobileMenuOpen ? 'translate-x-0 flex' : (isRTL ? 'translate-x-full' : '-translate-x-full')}`}>
        <div className="p-4 border-b border-white/10 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-emerald-500 rounded-lg flex items-center justify-center flex-shrink-0">
              <ShipIcon className="w-5 h-5 text-white" />
            </div>
            <span className="font-bold text-sm tracking-wide">ARWA LOGISTICS</span>
          </div>
          <button
            onClick={() => setMobileMenuOpen(false)}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg transition-colors"
          >
            <XIcon className="w-5 h-5" />
          </button>
        </div>
        <nav className="flex-1 p-2 space-y-1 overflow-y-auto sidebar-scroll">
          {navItems.map(item => (
            <button
              key={item.page}
              onClick={() => handleNavigate(item.page)}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors ${
                currentPage === item.page
                  ? 'bg-emerald-600 text-white'
                  : 'text-slate-400 hover:bg-white/5 hover:text-white'
              }`}
            >
              {item.icon}
              <span>{t(item.label)}</span>
            </button>
          ))}
        </nav>
        <div className="p-4 border-t border-white/10">
          {user && (
            <div className="mb-3">
              <p className="text-sm font-medium text-white truncate">{user.name}</p>
              <p className="text-xs text-slate-400 truncate">{user.email}</p>
              <span className="inline-block mt-1 px-2 py-0.5 bg-emerald-500/20 text-emerald-400 text-xs rounded">
                {user.role}
              </span>
            </div>
          )}
          <button
            onClick={() => { logout(); setMobileMenuOpen(false); }}
            className="w-full flex items-center gap-2 px-3 py-2 text-slate-400 hover:text-red-400 rounded-lg text-sm transition-colors"
          >
            <LogOutIcon className="w-4 h-4" /> {t('nav.signOut')}
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <div className={`flex-1 hidden md:block ${isRTL ? (sidebarOpen ? 'md:mr-64' : 'md:mr-16') : (sidebarOpen ? 'md:ml-64' : 'md:ml-16')} transition-all duration-300`}>        <header className="bg-white dark:bg-[#1e293b] border-b border-slate-200 dark:border-slate-700 px-6 py-3 flex items-center justify-between sticky top-0 z-20">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors"
              aria-label={t('nav.toggleSidebar') || 'Toggle sidebar'}
            >
              <MenuIcon className="w-5 h-5 text-slate-600 dark:text-slate-300" />
            </button>
            <button
              onClick={() => setSearchOpen(true)}
              className="flex items-center gap-2 px-3 py-1.5 text-sm text-slate-400 bg-slate-50 dark:bg-slate-700 hover:bg-slate-100 dark:hover:bg-slate-600 rounded-lg border border-slate-200 dark:border-slate-600 transition-colors min-w-[180px] sm:min-w-[220px]"
            >
              <SearchIcon className="w-4 h-4" />
              <span className="flex-1 text-left">{t('nav.search')}</span>
              <kbd className="hidden sm:inline-flex items-center gap-0.5 rounded border border-slate-200 dark:border-slate-500 bg-white dark:bg-slate-600 px-1 py-0.5 text-[10px] font-medium text-slate-400 dark:text-slate-300">
                ⌘K
              </kbd>
            </button>
          </div>
          <div className="flex items-center gap-3">
            <LiveIndicator />
            <LanguageSwitcher />
            <ThemeToggle />
            <NotificationCenter />
            <button
              onClick={() => setCurrentPage('public-tracking')}
              className="flex items-center gap-2 px-3 py-1.5 text-sm text-slate-600 dark:text-slate-300 hover:text-emerald-600 bg-slate-100 dark:bg-slate-700 hover:bg-emerald-50 dark:hover:bg-emerald-900/30 rounded-lg transition-colors"
            >
              <SearchIcon className="w-4 h-4" /> {t('nav.tracking')}
            </button>
            <button
              onClick={() => setCurrentPage('profile')}
              className="flex items-center gap-2 px-3 py-1.5 text-sm text-slate-600 dark:text-slate-300 hover:text-emerald-600 bg-slate-100 dark:bg-slate-700 hover:bg-emerald-50 dark:hover:bg-emerald-900/30 rounded-lg transition-colors"
            >
              <UserIcon className="w-4 h-4" /> {t('nav.profile')}
            </button>
          </div>
        </header>
        <main className="p-6"><Breadcrumb />{children}</main>
      </div>

      {/* Main Content - Mobile */}
      <div className="flex-1 md:hidden">
        {/* Mobile Header */}
        <header className="bg-white dark:bg-[#1e293b] border-b border-slate-200 dark:border-slate-700 px-4 py-3 flex items-center justify-between sticky top-0 z-20">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setMobileMenuOpen(true)}
              className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors"
              aria-label="Open menu"
            >
              <MenuIcon className="w-5 h-5 text-slate-600 dark:text-slate-300" />
            </button>
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 bg-emerald-500 rounded-md flex items-center justify-center">
                <ShipIcon className="w-4 h-4 text-white" />
              </div>
              <span className="font-bold text-sm text-slate-900 dark:text-slate-100">ARWA</span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <LiveIndicator />
            <LanguageSwitcher />
            <ThemeToggle />
            <button
              onClick={() => setSearchOpen(true)}
              className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors"
              aria-label="Search"
            >
              <SearchIcon className="w-5 h-5 text-slate-500 dark:text-slate-300" />
            </button>
            <NotificationCenter />
            <button
              onClick={() => setCurrentPage('profile')}
              className="w-8 h-8 bg-emerald-100 dark:bg-emerald-900/30 rounded-full flex items-center justify-center"
              aria-label="Profile"
            >
              <UserIcon className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
            </button>
          </div>
        </header>
        <main className="p-4 pb-20 md:pb-4"><Breadcrumb />{children}</main>

        {/* Mobile Bottom Navigation */}
        <div className="fixed bottom-0 left-0 right-0 z-30 md:hidden bg-white dark:bg-slate-800 border-t border-slate-200 dark:border-slate-700 safe-area-bottom">
          <div className="flex items-center justify-around px-2 py-1">
            {navItems.slice(0, 5).map(item => (
              <button
                key={item.page}
                onClick={() => setCurrentPage(item.page)}
                className={`flex flex-col items-center gap-0.5 px-3 py-2 rounded-lg transition-colors min-w-0 ${
                  currentPage === item.page
                    ? 'text-emerald-600 dark:text-emerald-400'
                    : 'text-slate-400 dark:text-slate-500'
                }`}
              >
                {item.icon}
                <span className="text-[10px] font-medium truncate">{t(item.label)}</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Global Search Modal */}
      <GlobalSearch open={searchOpen} onOpenChange={setSearchOpen} />
    </div>
  );
}
