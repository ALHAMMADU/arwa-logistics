'use client';

import React, { useState, useEffect } from 'react';
import { useAppStore, AppPage } from '@/lib/store';
import { ShipIcon, LogOutIcon, MenuIcon, SearchIcon, UserIcon, XIcon } from '@/components/icons';
import NotificationCenter from '@/components/shared/NotificationCenter';
import GlobalSearch from '@/components/shared/GlobalSearch';
import ThemeToggle from '@/components/shared/ThemeToggle';
import LanguageSwitcher from '@/components/shared/LanguageSwitcher';
import { Breadcrumb } from '@/components/shared/Breadcrumb';
import { useRealtimeStatus } from '@/components/shared/RealtimeProvider';
import { Tooltip, TooltipTrigger, TooltipContent } from '@/components/ui/tooltip';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet';
import { useI18n } from '@/lib/i18n';

interface DashboardLayoutProps {
  children: React.ReactNode;
  navItems: { page: AppPage; label: string; icon: React.ReactNode }[];
}

function MoreIcon({ className = "w-5 h-5" }: { className?: string }) {
  return (
    <svg className={className} role="img" aria-hidden="true" viewBox="0 0 24 24" fill="currentColor">
      <circle cx="5" cy="12" r="2" />
      <circle cx="12" cy="12" r="2" />
      <circle cx="19" cy="12" r="2" />
    </svg>
  );
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

// ─── User Avatar ─────────────────────────────────────────
function UserAvatar({ name, size = 'sm' }: { name: string; size?: 'sm' | 'md' }) {
  const sizeClass = size === 'md' ? 'w-10 h-10 text-sm' : 'w-8 h-8 text-xs';
  const initials = name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  return (
    <div className={`${sizeClass} rounded-full bg-gradient-to-br from-emerald-400 to-emerald-600 flex items-center justify-center text-white font-bold flex-shrink-0 shadow-sm`}>
      {initials}
    </div>
  );
}

export default function DashboardLayout({ children, navItems }: DashboardLayoutProps) {
  const { user, logout, currentPage, setCurrentPage, sidebarOpen, setSidebarOpen, theme } = useAppStore();
  const { dir, isRTL, t } = useI18n();
  const [searchOpen, setSearchOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [moreMenuOpen, setMoreMenuOpen] = useState(false);

  const visibleNavItems = navItems.slice(0, 4);
  const hiddenNavItems = navItems.slice(4);

  // Check if current page is in the "more" list
  const isActiveInMore = hiddenNavItems.some(item => item.page === currentPage);

  // Close mobile menu on page change
  const handleNavigate = (page: AppPage) => {
    setCurrentPage(page);
    setMobileMenuOpen(false);
  };

  // Handle navigate from "more" menu
  const handleMoreNavigate = (page: AppPage) => {
    setCurrentPage(page);
    setMoreMenuOpen(false);
  };

  // Close mobile menu when resizing to desktop
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth >= 768) {
        setMobileMenuOpen(false);
        setMoreMenuOpen(false);
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

  // Keyboard shortcut: Cmd+K / Ctrl+K to open GlobalSearch
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setSearchOpen(true);
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, []);

  return (
    <div className={`min-h-screen bg-slate-50 dark:bg-[#0f172a] flex ${theme === 'dark' ? 'dark' : ''} ${isRTL ? 'rtl' : 'ltr'}`} dir={dir}>
      {/* Mobile overlay */}
      {mobileMenuOpen && (
        <div
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-30 md:hidden transition-opacity"
          onClick={() => setMobileMenuOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* Sidebar - Desktop */}
      <aside className={`hidden md:flex ${sidebarOpen ? 'w-64' : 'w-16'} bg-gradient-to-b from-slate-900 via-slate-900 to-slate-950 text-white transition-all duration-300 flex-col fixed h-full z-40 ${isRTL ? 'right-0' : 'left-0'} shadow-xl`}>
        {/* Logo Section */}
        <div className="p-4 border-b border-white/10 flex items-center gap-3">
          <div className="w-8 h-8 bg-gradient-to-br from-emerald-400 to-emerald-600 rounded-lg flex items-center justify-center flex-shrink-0 shadow-lg shadow-emerald-500/20">
            <ShipIcon className="w-5 h-5 text-white" />
          </div>
          {sidebarOpen && (
            <div className="overflow-hidden">
              <span className="font-bold text-sm tracking-wide whitespace-nowrap">ARWA LOGISTICS</span>
            </div>
          )}
        </div>

        {/* Navigation */}
        <nav role="navigation" aria-label="Main navigation" className="flex-1 p-2 space-y-0.5 overflow-y-auto sidebar-scroll">
          {navItems.map(item => {
            const isActive = currentPage === item.page;
            return (
              <button
                key={item.page}
                onClick={() => setCurrentPage(item.page)}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-all duration-200 relative group ${
                  isActive
                    ? 'bg-emerald-600/90 text-white shadow-md shadow-emerald-600/20'
                    : 'text-slate-400 hover:bg-white/[0.06] hover:text-white'
                }`}
              >
                {/* Active indicator bar */}
                {isActive && (
                  <span className={`absolute ${isRTL ? 'right-0' : 'left-0'} top-1/2 -translate-y-1/2 w-[3px] h-5 bg-white rounded-full`} />
                )}
                <span className={`flex-shrink-0 ${isActive ? 'text-white' : 'text-slate-400 group-hover:text-slate-200'} transition-colors`}>
                  {item.icon}
                </span>
                {sidebarOpen && (
                  <span className="truncate">{t(item.label)}</span>
                )}
                {/* Tooltip for collapsed sidebar */}
                {!sidebarOpen && (
                  <span className={`absolute ${isRTL ? 'right-full mr-3' : 'left-full ml-3'} px-2 py-1 bg-slate-800 text-white text-xs rounded-md opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity whitespace-nowrap z-50 shadow-lg`}>
                    {t(item.label)}
                  </span>
                )}
              </button>
            );
          })}
        </nav>

        {/* User Section */}
        <div className="p-3 border-t border-white/10">
          {sidebarOpen && user && (
            <div className="flex items-center gap-3 mb-3 p-2 rounded-lg bg-white/[0.04] hover:bg-white/[0.06] transition-colors">
              <UserAvatar name={user.name} />
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-white truncate">{user.name}</p>
                <div className="flex items-center gap-1.5">
                  <span className="inline-block px-1.5 py-0.5 bg-emerald-500/20 text-emerald-400 text-[10px] rounded font-medium">
                    {user.role}
                  </span>
                </div>
              </div>
            </div>
          )}
          {!sidebarOpen && user && (
            <div className="flex justify-center mb-2">
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className="cursor-pointer">
                    <UserAvatar name={user.name} size="sm" />
                  </div>
                </TooltipTrigger>
                <TooltipContent side="right">
                  {user.name} ({user.role})
                </TooltipContent>
              </Tooltip>
            </div>
          )}
          <button
            onClick={logout}
            className={`w-full flex items-center gap-2 px-3 py-2 text-slate-400 hover:text-red-400 hover:bg-red-500/10 rounded-lg text-sm transition-all duration-200 ${!sidebarOpen ? 'justify-center' : ''}`}
          >
            <LogOutIcon className="w-4 h-4 flex-shrink-0" />
            {sidebarOpen && <span>{t('nav.signOut')}</span>}
          </button>
        </div>
      </aside>

      {/* Sidebar - Mobile */}
      <aside className={`fixed inset-y-0 ${isRTL ? 'right-0' : 'left-0'} z-40 w-72 bg-gradient-to-b from-slate-900 via-slate-900 to-slate-950 text-white flex-col transform transition-transform duration-300 ease-in-out md:hidden ${mobileMenuOpen ? 'translate-x-0 flex' : (isRTL ? 'translate-x-full' : '-translate-x-full')}`}>
        <div className="p-4 border-b border-white/10 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-gradient-to-br from-emerald-400 to-emerald-600 rounded-lg flex items-center justify-center flex-shrink-0 shadow-lg shadow-emerald-500/20">
              <ShipIcon className="w-5 h-5 text-white" />
            </div>
            <span className="font-bold text-sm tracking-wide">ARWA LOGISTICS</span>
          </div>
          <button
            onClick={() => setMobileMenuOpen(false)}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg transition-colors hover:bg-white/10"
            aria-label="Close menu"
          >
            <XIcon className="w-5 h-5" />
          </button>
        </div>
        <nav role="navigation" aria-label="Mobile navigation" className="flex-1 p-2 space-y-0.5 overflow-y-auto sidebar-scroll">
          {navItems.map(item => {
            const isActive = currentPage === item.page;
            return (
              <button
                key={item.page}
                onClick={() => handleNavigate(item.page)}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-all duration-200 relative ${
                  isActive
                    ? 'bg-emerald-600/90 text-white shadow-md shadow-emerald-600/20'
                    : 'text-slate-400 hover:bg-white/[0.06] hover:text-white'
                }`}
              >
                {isActive && (
                  <span className={`absolute ${isRTL ? 'right-0' : 'left-0'} top-1/2 -translate-y-1/2 w-[3px] h-5 bg-white rounded-full`} />
                )}
                {item.icon}
                <span>{t(item.label)}</span>
              </button>
            );
          })}
        </nav>
        <div className="p-3 border-t border-white/10">
          {user && (
            <div className="flex items-center gap-3 mb-3 p-2 rounded-lg bg-white/[0.04]">
              <UserAvatar name={user.name} size="md" />
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-white truncate">{user.name}</p>
                <span className="inline-block px-1.5 py-0.5 bg-emerald-500/20 text-emerald-400 text-[10px] rounded font-medium">
                  {user.role}
                </span>
              </div>
            </div>
          )}
          <button
            onClick={() => { logout(); setMobileMenuOpen(false); }}
            className="w-full flex items-center gap-2 px-3 py-2 text-slate-400 hover:text-red-400 hover:bg-red-500/10 rounded-lg text-sm transition-all duration-200"
          >
            <LogOutIcon className="w-4 h-4" /> {t('nav.signOut')}
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <div className={`flex-1 hidden md:block ${isRTL ? (sidebarOpen ? 'md:mr-64' : 'md:mr-16') : (sidebarOpen ? 'md:ml-64' : 'md:ml-16')} transition-all duration-300`}>
        <header className="bg-white/80 dark:bg-[#1e293b]/80 backdrop-blur-md border-b border-slate-200 dark:border-slate-700 px-6 py-3 flex items-center justify-between sticky top-0 z-20 shadow-sm">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-all duration-200 hover:shadow-sm"
              aria-label={t('nav.toggleSidebar') || 'Toggle sidebar'}
            >
              <MenuIcon className="w-5 h-5 text-slate-600 dark:text-slate-300" />
            </button>
            <button
              onClick={() => setSearchOpen(true)}
              className="flex items-center gap-2 px-3 py-1.5 text-sm text-slate-400 bg-slate-50 dark:bg-slate-700 hover:bg-slate-100 dark:hover:bg-slate-600 rounded-lg border border-slate-200 dark:border-slate-600 transition-all duration-200 min-w-[180px] sm:min-w-[220px] hover:shadow-sm"
            >
              <SearchIcon className="w-4 h-4" />
              <span className="flex-1 text-left">{t('nav.search')}</span>
              <kbd className="hidden sm:inline-flex items-center gap-0.5 rounded border border-slate-200 dark:border-slate-500 bg-white dark:bg-slate-600 px-1 py-0.5 text-[10px] font-medium text-slate-400 dark:text-slate-300">
                ⌘K
              </kbd>
            </button>
          </div>
          <div className="flex items-center gap-2">
            <LiveIndicator />
            <div className="w-px h-5 bg-slate-200 dark:bg-slate-600 hidden sm:block" />
            <LanguageSwitcher />
            <ThemeToggle />
            <NotificationCenter />
            <div className="w-px h-5 bg-slate-200 dark:bg-slate-600 hidden sm:block" />
            <button
              onClick={() => setCurrentPage('public-tracking')}
              className="hidden lg:flex items-center gap-2 px-3 py-1.5 text-sm text-slate-600 dark:text-slate-300 hover:text-emerald-600 dark:hover:text-emerald-400 bg-slate-100 dark:bg-slate-700 hover:bg-emerald-50 dark:hover:bg-emerald-900/30 rounded-lg transition-all duration-200"
            >
              <SearchIcon className="w-4 h-4" /> {t('nav.tracking')}
            </button>
            <button
              onClick={() => setCurrentPage('profile')}
              className="flex items-center gap-2 px-3 py-1.5 text-sm text-slate-600 dark:text-slate-300 hover:text-emerald-600 dark:hover:text-emerald-400 rounded-lg transition-all duration-200"
            >
              {user ? <UserAvatar name={user.name} size="sm" /> : <UserIcon className="w-4 h-4" />}
              <span className="hidden lg:inline">{t('nav.profile')}</span>
            </button>
          </div>
        </header>
        <main className="p-6"><Breadcrumb />{children}</main>
      </div>

      {/* Main Content - Mobile */}
      <div className="flex-1 md:hidden">
        {/* Mobile Header */}
        <header className="bg-white/80 dark:bg-[#1e293b]/80 backdrop-blur-md border-b border-slate-200 dark:border-slate-700 px-4 py-3 flex items-center justify-between sticky top-0 z-20 shadow-sm">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setMobileMenuOpen(true)}
              className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors"
              aria-label="Open menu"
            >
              <MenuIcon className="w-5 h-5 text-slate-600 dark:text-slate-300" />
            </button>
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 bg-gradient-to-br from-emerald-400 to-emerald-600 rounded-md flex items-center justify-center shadow-sm shadow-emerald-500/20">
                <ShipIcon className="w-4 h-4 text-white" />
              </div>
              <span className="font-bold text-sm text-slate-900 dark:text-slate-100">ARWA</span>
            </div>
          </div>
          <div className="flex items-center gap-1.5">
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
              className="rounded-full overflow-hidden"
              aria-label="Profile"
            >
              {user ? <UserAvatar name={user.name} size="sm" /> : (
                <div className="w-8 h-8 bg-emerald-100 dark:bg-emerald-900/30 rounded-full flex items-center justify-center">
                  <UserIcon className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                </div>
              )}
            </button>
          </div>
        </header>
        <main className="p-4 pb-20 md:pb-4"><Breadcrumb />{children}</main>

        {/* Mobile Bottom Navigation */}
        <div className="fixed bottom-0 left-0 right-0 z-30 md:hidden bg-white/90 dark:bg-slate-800/90 backdrop-blur-md border-t border-slate-200 dark:border-slate-700 safe-area-bottom">
          <div dir={dir} className="flex items-center justify-around px-2 py-1">
            {visibleNavItems.map(item => {
              const isActive = currentPage === item.page;
              return (
                <button
                  key={item.page}
                  onClick={() => setCurrentPage(item.page)}
                  className={`flex flex-col items-center gap-0.5 px-3 py-1.5 rounded-xl transition-all duration-200 min-w-0 relative ${
                    isActive
                      ? 'text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/20'
                      : 'text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300'
                  }`}
                >
                  {isActive && (
                    <span className="absolute -top-1 left-1/2 -translate-x-1/2 w-6 h-1 bg-emerald-500 rounded-full" />
                  )}
                  {item.icon}
                  <span className="text-[10px] font-medium truncate">{t(item.label)}</span>
                </button>
              );
            })}
            {hiddenNavItems.length > 0 && (
              <button
                onClick={() => setMoreMenuOpen(true)}
                className={`flex flex-col items-center gap-0.5 px-3 py-1.5 rounded-xl transition-all duration-200 min-w-0 ${
                  isActiveInMore
                    ? 'text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/20'
                    : 'text-slate-400 dark:text-slate-500'
                }`}
                aria-label="More navigation items"
              >
                <MoreIcon className="w-5 h-5" />
                <span className="text-[10px] font-medium truncate">{t('nav.more') || 'More'}</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* More Menu - Bottom Sheet */}
      <Sheet open={moreMenuOpen} onOpenChange={setMoreMenuOpen}>
        <SheetContent side="bottom" className="rounded-t-2xl max-h-[70vh]">
          <SheetHeader className="pb-2">
            <SheetTitle className="text-left">{t('nav.morePages') || 'More Pages'}</SheetTitle>
            <SheetDescription className="text-left sr-only">
              {t('nav.morePagesDesc') || 'Additional navigation items'}
            </SheetDescription>
          </SheetHeader>
          <nav className="flex flex-col gap-1 overflow-y-auto max-h-[50vh] p-4 pt-0">
            {hiddenNavItems.map(item => {
              const isActive = currentPage === item.page;
              return (
                <button
                  key={item.page}
                  onClick={() => handleMoreNavigate(item.page)}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm transition-all duration-200 ${
                    isActive
                      ? 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 font-medium'
                      : 'text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700'
                  }`}
                >
                  {item.icon}
                  <span>{t(item.label)}</span>
                </button>
              );
            })}
          </nav>
        </SheetContent>
      </Sheet>

      {/* Global Search Modal */}
      <GlobalSearch open={searchOpen} onOpenChange={setSearchOpen} />
    </div>
  );
}
