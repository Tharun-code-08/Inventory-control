import { useEffect, useRef, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Bell, ChevronDown, Menu, RefreshCw } from 'lucide-react';
import { ProfileMenuLinks } from '@/components/ProfileMenuLinks';
import { AppShellControls } from '@/components/AppShellControls';
import { CommandSpotlight } from '@/components/CommandSpotlight';
import { useQueryClient } from '@tanstack/react-query';
import { resetClientSessionState } from '@/lib/reset-session-state';
import { Sidebar } from './Sidebar';
import { Toaster } from '@/components/ui/sonner';
import { useAuthStore } from '@/store/authStore';
import { api } from '@/api/client';
import { cn } from '@/lib/cn';
import { useAlerts, useMarkAlertRead } from '@/hooks/use-alerts';
import { animalAvatarForUser } from '@/lib/profile-avatar';
import { AppFooter } from '@/components/AppFooter';
import { OrganisationIdBadge } from '@/components/OrganisationIdBadge';

const pageTitles: Record<string, string> = {
  '/dashboard': 'Dashboard',
  '/companies': 'Companies',
  '/plants': 'Plants',
  '/storage-locations': 'Storage Locations',
  '/suppliers': 'Suppliers',
  '/rfqs': 'RFQs',
  '/quotations': 'Sales Quotations',
  '/contracts': 'Contracts',
  '/customers': 'Customers',
  '/supplier-portal': 'Supplier Portal',
  '/sales': 'Sales Orders',
  '/invoices': 'Invoices',
  '/payments': 'Payments',
  '/notifications': 'Notifications',
  '/warehouse': 'Warehouse',
  '/products': 'Products',
  '/goods-receipts': 'Goods Receipt',
  '/goods-issues': 'Goods Issues',
  '/goods-issues/new': 'Create Goods Issue',
  '/purchase-orders': 'Purchase Orders',
  '/reports': 'Reports',
  '/settings': 'Settings',
  '/upgrade': 'Upgrade',
  '/profile': 'Profile',
  '/help': 'Help & Support',
};

function resolveTitle(pathname: string): string {
  if (pageTitles[pathname]) return pageTitles[pathname];
  for (const [path, title] of Object.entries(pageTitles)) {
    if (pathname === path || pathname.startsWith(`${path}/`)) return title;
  }
  return 'Dashboard';
}

function useIsMobile() {
  const [isMobile, setIsMobile] = useState(() =>
    typeof window !== 'undefined' ? window.innerWidth < 768 : false,
  );

  useEffect(() => {
    const mql = window.matchMedia('(max-width: 767px)');
    const onChange = (event: MediaQueryListEvent) => setIsMobile(event.matches);
    setIsMobile(mql.matches);
    mql.addEventListener('change', onChange);
    return () => mql.removeEventListener('change', onChange);
  }, []);

  return isMobile;
}

type AppLayoutProps = {
  children: React.ReactNode;
  active?: string;
};

export function AppLayout({ children, active }: AppLayoutProps) {
  const location = useLocation();
  const nav = useNavigate();
  const queryClient = useQueryClient();
  const user = useAuthStore((s) => s.user);
  const clear = useAuthStore((s) => s.clear);
  const isMobile = useIsMobile();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(() =>
    typeof window !== 'undefined' ? false : true,
  );
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [spotlightOpen, setSpotlightOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [showLogoutSplash, setShowLogoutSplash] = useState(false);
  const [logoutFadeOut, setLogoutFadeOut] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const profileRef = useRef<HTMLDivElement>(null);
  const notificationsRef = useRef<HTMLDivElement>(null);
  const alertsQuery = useAlerts();
  const markRead = useMarkAlertRead();
  const alerts = alertsQuery.data ?? [];
  const unreadCount = alerts.filter((alert) => !alert.isRead).length;

  const pageTitle = active ?? resolveTitle(location.pathname);

  useEffect(() => {
    function close(e: MouseEvent) {
      if (profileRef.current && !profileRef.current.contains(e.target as Node)) {
        setProfileOpen(false);
      }
      if (notificationsRef.current && !notificationsRef.current.contains(e.target as Node)) {
        setNotificationsOpen(false);
      }
    }
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, []);

  useEffect(() => {
    setProfileOpen(false);
    setNotificationsOpen(false);
    if (isMobile) {
      setMobileSidebarOpen(false);
    }
  }, [isMobile, location.pathname]);

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setSpotlightOpen(true);
      }
    }
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, []);

  useEffect(() => {
    if (!isMobile) {
      setMobileSidebarOpen(false);
      setSidebarCollapsed(false);
    }
  }, [isMobile]);

  useEffect(() => {
    if (!isMobile || !mobileSidebarOpen) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [isMobile, mobileSidebarOpen]);

  async function handleLogout() {
    if (showLogoutSplash) return;
    setLogoutFadeOut(false);
    setShowLogoutSplash(true);
    try {
      await api.post('/auth/logout');
    } catch {
      /* best-effort */
    }
    window.setTimeout(() => {
      setLogoutFadeOut(true);
    }, 800);
    window.setTimeout(() => {
      delete api.defaults.headers.common.Authorization;
      resetClientSessionState(queryClient);
      clear();
      nav('/login', { replace: true });
    }, 1120);
  }

  async function handleRefresh() {
    if (isRefreshing) return;
    setIsRefreshing(true);
    try {
      await queryClient.invalidateQueries();
      await queryClient.refetchQueries({ type: 'active' });
    } finally {
      window.setTimeout(() => setIsRefreshing(false), 300);
    }
  }

  const avatar = animalAvatarForUser(user);

  return (
    <div className="flex min-h-screen bg-transparent text-slate-800 dark:text-slate-100">
      <CommandSpotlight open={spotlightOpen} onOpenChange={setSpotlightOpen} />
      {showLogoutSplash && (
        <div className={cn(
          "fixed inset-0 z-[100] flex items-center justify-center bg-[radial-gradient(circle_at_35%_20%,rgba(99,102,241,0.32),transparent_35%),radial-gradient(circle_at_70%_90%,rgba(56,189,248,0.22),transparent_40%),rgba(2,6,23,0.94)] transition-opacity duration-300",
          logoutFadeOut ? 'opacity-0' : 'opacity-100',
        )}>
          <div className="relative flex min-w-[280px] max-w-sm flex-col items-center gap-5 rounded-3xl border border-white/20 bg-white/10 px-8 py-8 text-center shadow-[0_28px_70px_rgba(2,6,23,0.45)] backdrop-blur-xl">
            <div className="pointer-events-none absolute -right-6 -top-6 h-20 w-20 rounded-full bg-indigo-300/40 blur-2xl" />
            <div className="pointer-events-none absolute -left-6 bottom-4 h-16 w-16 rounded-full bg-cyan-300/35 blur-2xl" />
            <div className={cn('relative flex h-24 w-24 items-center justify-center rounded-full bg-gradient-to-br', avatar.bgClass)}>
              <div className="absolute inset-0 animate-ping rounded-full bg-white/20" />
              <span aria-label={`${avatar.kind} avatar`} role="img" className="text-5xl">
                {avatar.emoji}
              </span>
            </div>
            <div className="space-y-1">
              <p className="text-base font-semibold text-white">Signing you out securely</p>
              <p className="text-xs text-slate-200/90">Clearing session tokens and workspace context...</p>
            </div>
            <div className="h-1.5 w-full overflow-hidden rounded-full bg-white/20">
              <div className="h-full w-1/2 animate-[pulse_1.2s_ease-in-out_infinite] rounded-full bg-white" />
            </div>
            <p className="text-[11px] uppercase tracking-[0.2em] text-slate-300">Please wait</p>
          </div>
        </div>
      )}
      <Sidebar
        collapsed={sidebarCollapsed}
        onCollapsedChange={setSidebarCollapsed}
        isMobile={isMobile}
        mobileOpen={mobileSidebarOpen}
        onMobileOpenChange={setMobileSidebarOpen}
      />

      <div
        className={cn(
          'flex min-h-screen min-w-0 flex-1 flex-col transition-[margin] duration-300 ease-in-out',
          !isMobile && (sidebarCollapsed ? 'md:ml-[72px]' : 'md:ml-[240px]'),
        )}
      >
        <header className="sticky top-0 z-30 border-b border-slate-200/90 bg-white/95 shadow-sm backdrop-blur supports-[backdrop-filter]:bg-white/90 dark:border-slate-800 dark:bg-slate-950/90 dark:shadow-slate-950/50">
          <div className="flex h-16 items-center gap-2 px-4 sm:gap-3 sm:px-6">
            <div className="flex min-w-0 flex-1 items-center gap-3">
              <button
                type="button"
                onClick={() =>
                  isMobile ? setMobileSidebarOpen(true) : setSidebarCollapsed((c) => !c)
                }
                className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-100"
                aria-label={
                  isMobile
                    ? 'Open navigation'
                    : sidebarCollapsed
                      ? 'Expand sidebar'
                      : 'Collapse sidebar'
                }
              >
                <Menu className="h-5 w-5" />
              </button>
              <h2 className="premium-title truncate text-base font-semibold sm:text-lg">{pageTitle}</h2>
            </div>

            <OrganisationIdBadge className="hidden shrink-0 sm:flex" />

            <div className="flex flex-1 items-center justify-end gap-2 sm:gap-3">
              <AppShellControls onOpenSpotlight={() => setSpotlightOpen(true)} />

              <button
                type="button"
                onClick={handleRefresh}
                className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-100"
                aria-label="Refresh data"
                disabled={isRefreshing}
              >
                <RefreshCw className={cn('h-5 w-5', isRefreshing && 'animate-spin')} />
              </button>

              <button
                type="button"
                onClick={() => setNotificationsOpen((open) => !open)}
                className="relative rounded-lg p-2 text-slate-500 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-100"
                aria-label="Notifications"
              >
                <Bell className="h-5 w-5" />
                {unreadCount > 0 && (
                  <span className="absolute right-1 top-1 h-2 w-2 rounded-full bg-red-500" />
                )}
              </button>
              {notificationsOpen && (
                <>
                  <button
                    type="button"
                    aria-label="Close notifications"
                    onClick={() => setNotificationsOpen(false)}
                    className="fixed inset-0 z-30 bg-slate-900/25 dark:bg-black/40"
                  />
                  <div
                    ref={notificationsRef}
                    className="absolute right-2 top-14 z-40 w-96 max-w-[calc(100vw-1rem)] overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl dark:border-slate-700 dark:bg-slate-900 sm:right-16 sm:max-w-[calc(100vw-2rem)]"
                  >
                    <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3 dark:border-slate-700">
                      <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">Notifications</p>
                      <button
                        type="button"
                        className="text-xs text-muted-foreground hover:text-foreground"
                        onClick={() => nav('/notifications')}
                      >
                        Manage
                      </button>
                    </div>
                    <div className="max-h-80 overflow-y-auto">
                      {alerts.length === 0 ? (
                        <div className="px-4 py-6 text-center text-sm text-muted-foreground">No notifications</div>
                      ) : (
                        alerts.slice(0, 8).map((alert) => (
                          <button
                            key={alert.id}
                            type="button"
                            onClick={() => {
                              if (!alert.isRead) {
                                markRead.mutate(alert.id);
                              }
                            }}
                            className={cn(
                              'w-full border-b border-slate-100 px-4 py-3 text-left last:border-b-0 hover:bg-slate-50 dark:border-slate-800 dark:hover:bg-slate-800/80',
                              !alert.isRead && 'bg-indigo-50 dark:bg-indigo-950/40',
                            )}
                          >
                            <p className="text-sm font-medium text-slate-900 dark:text-slate-100">{alert.title}</p>
                            <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">{alert.message}</p>
                          </button>
                        ))
                      )}
                    </div>
                  </div>
                </>
              )}

              <div className="relative" ref={profileRef}>
                <button
                  type="button"
                  onClick={() => setProfileOpen((open) => !open)}
                  className="flex items-center gap-2 rounded-xl p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800"
                >
                  <div className={cn('flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br text-sm shadow-md', avatar.bgClass)}>
                    <span aria-label={`${avatar.kind} avatar`} role="img">{avatar.emoji}</span>
                  </div>
                  <div className="hidden text-left md:block">
                    <div className="text-sm font-medium leading-tight text-slate-900 dark:text-slate-100">{user?.name}</div>
                    <div className="text-xs text-slate-500 dark:text-slate-400">{user?.role}</div>
                  </div>
                  <ChevronDown className="hidden h-4 w-4 text-slate-500 md:block" />
                </button>

                {profileOpen && (
                  <div className="absolute right-0 top-full mt-2 w-64 max-w-[calc(100vw-2rem)] overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl dark:border-slate-700 dark:bg-slate-900">
                    <div className="border-b border-slate-200 px-4 py-3 dark:border-slate-700">
                      <div className="text-sm font-medium text-slate-900 dark:text-slate-100">{user?.name}</div>
                      <div className="text-xs text-slate-500">{user?.email}</div>
                      {user?.shop && (
                        <div className="mt-0.5 text-xs text-indigo-600">{user.shop.shopName}</div>
                      )}
                    </div>
                    <ProfileMenuLinks
                      variant="header"
                      onNavigate={(path) => {
                        setProfileOpen(false);
                        nav(path);
                      }}
                      onLogout={handleLogout}
                    />
                  </div>
                )}
              </div>
            </div>
          </div>

        </header>

        <main className="flex min-w-0 flex-1 flex-col p-4 sm:p-6">
          <div className="mx-auto w-full max-w-[1400px] flex-1">{children}</div>
          <AppFooter />
        </main>
      </div>

      <Toaster />
    </div>
  );
}
