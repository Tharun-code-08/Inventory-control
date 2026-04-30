import { useEffect, useRef, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Bell, ChevronDown, LogOut, Menu, Search, UserCircle } from 'lucide-react';
import { Sidebar } from './Sidebar';
import { Toaster } from '@/components/ui/sonner';
import { useAuthStore } from '@/store/authStore';
import { api } from '@/api/client';
import { cn } from '@/lib/cn';
import { useAlerts, useMarkAlertRead } from '@/hooks/use-alerts';

const pageTitles: Record<string, string> = {
  '/dashboard': 'Dashboard',
  '/companies': 'Companies',
  '/plants': 'Plants',
  '/storage-locations': 'Storage Locations',
  '/suppliers': 'Suppliers',
  '/rfqs': 'RFQs',
  '/quotations': 'Quotations',
  '/contracts': 'Contracts',
  '/customers': 'Customers',
  '/supplier-portal': 'Supplier Portal',
  '/sales': 'Sales',
  '/invoices': 'Invoices',
  '/payments': 'Payments',
  '/notifications': 'Notifications',
  '/warehouse': 'Warehouse',
  '/products': 'Products',
  '/goods-receipts': 'Goods Receipt',
  '/goods-issues': 'Goods Issue',
  '/purchase-orders': 'Purchase Orders',
  '/reports': 'Reports',
  '/settings': 'Settings',
  '/profile': 'Profile',
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
    function onResize() {
      setIsMobile(window.innerWidth < 768);
    }

    onResize();
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
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
  const user = useAuthStore((s) => s.user);
  const clear = useAuthStore((s) => s.clear);
  const isMobile = useIsMobile();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(() =>
    typeof window !== 'undefined' ? false : true,
  );
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [mobileSearchOpen, setMobileSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
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
    setMobileSearchOpen(false);
    if (isMobile) {
      setMobileSidebarOpen(false);
    }
  }, [isMobile, location.pathname]);

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
    try {
      await api.post('/auth/logout');
    } catch {
      /* best-effort */
    }
    delete api.defaults.headers.common.Authorization;
    clear();
    nav('/login', { replace: true });
  }

  const initials =
    user?.name
      ?.split(' ')
      .map((w) => w[0])
      .join('')
      .slice(0, 2)
      .toUpperCase() ?? 'U';

  return (
    <div className="flex min-h-screen bg-transparent">
      <Sidebar
        collapsed={sidebarCollapsed}
        onCollapsedChange={setSidebarCollapsed}
        isMobile={isMobile}
        mobileOpen={mobileSidebarOpen}
        onMobileOpenChange={setMobileSidebarOpen}
      />

      <div
        className={cn(
          'flex min-h-screen min-w-0 flex-1 flex-col',
          !isMobile && (sidebarCollapsed ? 'md:ml-[72px]' : 'md:ml-[240px]'),
        )}
      >
        <header className="sticky top-0 z-30 border-b border-white/35 bg-white/55 shadow-sm backdrop-blur-xl supports-[backdrop-filter]:bg-white/40">
          <div className="flex h-16 items-center justify-between gap-3 px-4 sm:px-6">
            <div className="flex min-w-0 items-center gap-3">
              <button
                type="button"
                onClick={() => setMobileSidebarOpen(true)}
                className="rounded-md p-2 text-muted-foreground hover:bg-accent hover:text-accent-foreground md:hidden"
                aria-label="Open navigation"
              >
                <Menu className="h-5 w-5" />
              </button>
              <h2 className="truncate text-base font-semibold sm:text-lg">{pageTitle}</h2>
            </div>

            <div className="flex shrink-0 items-center gap-2 sm:gap-4">
              <div className="relative hidden lg:block">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search..."
                  className="h-10 w-72 rounded-xl border border-white/45 bg-white/70 pl-9 pr-3 text-sm placeholder:text-slate-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/35"
                />
              </div>

              <button
                type="button"
                onClick={() => setMobileSearchOpen((open) => !open)}
                className="rounded-md p-2 text-muted-foreground hover:bg-accent hover:text-accent-foreground lg:hidden"
                aria-label="Toggle search"
              >
                <Search className="h-5 w-5" />
              </button>

              <button
                type="button"
                onClick={() => setNotificationsOpen((open) => !open)}
                className="relative rounded-md p-2 text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                aria-label="Notifications"
              >
                <Bell className="h-5 w-5" />
                {unreadCount > 0 && (
                  <span className="absolute right-1 top-1 h-2 w-2 rounded-full bg-red-500" />
                )}
              </button>
              {notificationsOpen && (
                <div
                  ref={notificationsRef}
                  className="absolute right-16 top-14 z-40 w-96 max-w-[calc(100vw-2rem)] overflow-hidden rounded-2xl border border-white/60 bg-white/95 shadow-xl backdrop-blur-xl"
                >
                  <div className="flex items-center justify-between border-b px-4 py-3">
                    <p className="text-sm font-semibold">Notifications</p>
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
                            'w-full border-b px-4 py-3 text-left last:border-b-0 hover:bg-accent/40',
                            !alert.isRead && 'bg-blue-50/60',
                          )}
                        >
                          <p className="text-sm font-medium">{alert.title}</p>
                          <p className="mt-0.5 text-xs text-muted-foreground">{alert.message}</p>
                        </button>
                      ))
                    )}
                  </div>
                </div>
              )}

              <div className="relative" ref={profileRef}>
                <button
                  type="button"
                  onClick={() => setProfileOpen((open) => !open)}
                  className="flex items-center gap-2 rounded-xl p-1.5 hover:bg-white/65"
                >
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-blue-600 to-indigo-600 text-xs font-semibold text-primary-foreground shadow-md">
                    {initials}
                  </div>
                  <div className="hidden text-left md:block">
                    <div className="text-sm font-medium leading-tight">{user?.name}</div>
                    <div className="text-xs text-muted-foreground">{user?.role}</div>
                  </div>
                  <ChevronDown className="hidden h-4 w-4 text-muted-foreground md:block" />
                </button>

                {profileOpen && (
                  <div className="absolute right-0 top-full mt-2 w-64 max-w-[calc(100vw-2rem)] overflow-hidden rounded-2xl border border-white/60 bg-white/85 shadow-xl backdrop-blur-xl">
                    <div className="border-b px-4 py-3">
                      <div className="text-sm font-medium">{user?.name}</div>
                      <div className="text-xs text-muted-foreground">{user?.email}</div>
                      {user?.shop && (
                        <div className="mt-0.5 text-xs text-amber-600">{user.shop.shopName}</div>
                      )}
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setProfileOpen(false);
                        nav('/profile');
                      }}
                      className="flex w-full items-center gap-2 px-4 py-2.5 text-sm text-foreground hover:bg-accent"
                    >
                      <UserCircle className="h-4 w-4" /> Profile
                    </button>
                    <button
                      type="button"
                      onClick={handleLogout}
                      className="flex w-full items-center gap-2 px-4 py-2.5 text-sm text-destructive hover:bg-destructive/10"
                    >
                      <LogOut className="h-4 w-4" /> Logout
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>

          {mobileSearchOpen && (
            <div className="border-t px-4 py-3 lg:hidden">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search..."
                  className="h-10 w-full rounded-md border border-input bg-background pl-9 pr-3 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                />
              </div>
            </div>
          )}
        </header>

        <main className="min-w-0 flex-1 p-4 sm:p-6">{children}</main>
      </div>

      <Toaster />
    </div>
  );
}
