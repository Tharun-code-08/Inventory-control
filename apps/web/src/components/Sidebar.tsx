import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  ChevronUp,
  ChevronsLeft,
} from 'lucide-react';
import { menuIcons } from '@/config/iconMap';
import { useQueryClient } from '@tanstack/react-query';
import { api } from '@/api/client';
import { resetClientSessionState } from '@/lib/reset-session-state';
import { cn } from '@/lib/cn';
import { useAuthStore } from '@/store/authStore';
import { animalAvatarForUser } from '@/lib/profile-avatar';
import { ProfileMenuLinks } from '@/components/ProfileMenuLinks';
import { isOrgAdminUser, isPlatformAdminUser } from '@/lib/roles';
import { BrandLogo } from '@/components/BrandLogo';
import { usePendingApprovalCount } from '@/hooks/use-approvals';
import { preloadRoute, preloadAllRoutesWhenIdle } from '@/lib/route-preload';

type NavItem = {
  label: string;
  icon: typeof LayoutDashboard;
  path: string;
  badge?: number;
};

/**
 * Nav scroll offset persisted at module scope. Because `AppLayout` (and this
 * Sidebar) is rendered inside each lazy page, the sidebar remounts on every
 * navigation — a per-instance ref would reset to 0 each time and make the drawer
 * "jump to top". Keeping it at module scope lets it survive remounts.
 */
let persistedNavScrollTop = 0;

type SidebarProps = {
  collapsed: boolean;
  onCollapsedChange: (collapsed: boolean) => void;
  isMobile?: boolean;
  mobileOpen?: boolean;
  onMobileOpenChange?: (open: boolean) => void;
};

function isActive(currentPath: string, itemPath: string) {
  if (itemPath === '/dashboard') {
    return currentPath === '/dashboard' || currentPath.startsWith('/dashboard/');
  }
  return currentPath === itemPath || currentPath.startsWith(`${itemPath}/`);
}

function sectionFor(path: string) {
  if (['/companies', '/plants', '/storage-locations', '/products', '/suppliers', '/customers'].includes(path)) return 'Master Data';
  if (
    [
      '/rfqs',
      '/contracts',
      '/purchase-orders',
      '/goods-receipts',
      '/returns',
      '/supplier-portal',
      '/supplier-bills',
      '/supplier-payments',
    ].includes(path)
  ) {
    return 'Procurement';
  }
  if (['/quotations', '/sales', '/goods-issues', '/invoices', '/eway-bills', '/payments'].includes(path)) return 'Sales & Finance';
  return 'Operations';
}

const EMPTY_PERMISSIONS: string[] = [];

export function Sidebar({
  collapsed,
  onCollapsedChange,
  isMobile = false,
  mobileOpen = false,
  onMobileOpenChange,
}: SidebarProps) {
  const nav = useNavigate();
  const queryClient = useQueryClient();
  const location = useLocation();
  const user = useAuthStore((s) => s.user);
  const clear = useAuthStore((s) => s.clear);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [showLogoutSplash, setShowLogoutSplash] = useState(false);
  const [logoutFadeOut, setLogoutFadeOut] = useState(false);
  const dropRef = useRef<HTMLDivElement>(null);
  const closeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const navScrollRef = useRef<HTMLElement>(null);
  const [navIndicator, setNavIndicator] = useState<{ top: number; height: number } | null>(null);
  const isOrgAdmin = isOrgAdminUser(user);
  const isPlatformAdmin = isPlatformAdminUser(user);
  const perms = user?.permissions ?? EMPTY_PERMISSIONS;
  const pendingApprovals = usePendingApprovalCount(Boolean(user)).data ?? 0;
  const navItems = useMemo(() => {
    const has = (perm: string) => perms.includes(perm) || isOrgAdmin;

    const items: NavItem[] = [
      ...(isOrgAdmin ? [{ label: 'Dashboard', icon: menuIcons.dashboard, path: '/dashboard' }] : []),

      // Master Data
      ...(has('company:read') ? [{ label: 'Companies', icon: menuIcons.companies, path: '/companies' }] : []),
      ...(has('shop:read') ? [{ label: 'Plants', icon: menuIcons.plants, path: '/plants' }] : []),
      ...(has('storage_location:read') ? [{ label: 'Storage Locations', icon: menuIcons.storageLocations, path: '/storage-locations' }] : []),
      ...(has('product:read') ? [{ label: 'Products', icon: menuIcons.products, path: '/products' }] : []),
      ...(has('supplier:read') ? [{ label: 'Suppliers', icon: menuIcons.suppliers, path: '/suppliers' }] : []),
      ...(has('shop:read') ? [{ label: 'Customers', icon: menuIcons.customers, path: '/customers' }] : []),

      // Procurement
      ...(has('rfq:read') ? [{ label: 'RFQs', icon: menuIcons.rfqs, path: '/rfqs' }] : []),
      ...(has('contract:read') ? [{ label: 'Contracts', icon: menuIcons.contracts, path: '/contracts' }] : []),
      ...(has('purchase_order:read') ? [{ label: 'Purchase Orders', icon: menuIcons.purchaseOrders, path: '/purchase-orders' }] : []),
      { label: 'Goods Receipt', icon: menuIcons.goodsReceipt, path: '/goods-receipts' },
      ...(has('shop:read') ? [{ label: 'Goods Returns', icon: menuIcons.goodsReturns, path: '/returns' }] : []),
      ...(has('supplier:read') ? [{ label: 'Supplier Portal', icon: menuIcons.supplierPortal, path: '/supplier-portal' }] : []),
      ...(has('shop:read') ? [{ label: 'Supplier Bills', icon: menuIcons.supplierBills, path: '/supplier-bills' }] : []),
      ...(has('shop:read') ? [{ label: 'Supplier Payments', icon: menuIcons.supplierPayments, path: '/supplier-payments' }] : []),

      // Sales
      ...(has('shop:read') ? [{ label: 'Sales Quotations', icon: menuIcons.salesQuotations, path: '/quotations' }] : []),
      ...(has('shop:read') ? [{ label: 'Sales', icon: menuIcons.sales, path: '/sales' }] : []),
      ...(has('goods_issue:read') ? [{ label: 'Goods Issue', icon: menuIcons.goodsIssue, path: '/goods-issues' }] : []),
      ...(has('shop:read') ? [{ label: 'Invoices', icon: menuIcons.invoices, path: '/invoices' }] : []),
      ...(has('shop:read') ? [{ label: 'E-Way Bills', icon: menuIcons.ewayBills, path: '/eway-bills' }] : []),
      ...(has('shop:read') ? [{ label: 'Payments', icon: menuIcons.payments, path: '/payments' }] : []),

      // Warehouse + Admin
      ...(has('stock_transfer:read')
        ? [{ label: 'Stock Transfers', icon: menuIcons.stockTransfers, path: '/stock-transfers' }]
        : []),
      ...(has('report:view') ? [{ label: 'Warehouse', icon: menuIcons.warehouseOps, path: '/warehouse' }] : []),
      ...(has('report:view') ? [{ label: 'Reports', icon: menuIcons.reports, path: '/reports' }] : []),
      ...(has('report:view') ? [{ label: 'Notifications', icon: menuIcons.notifications, path: '/notifications' }] : []),
      ...(has('shop:read')
        ? [{ label: 'Approvals', icon: menuIcons.approvals, path: '/approvals', badge: pendingApprovals }]
        : []),
      ...(has('billing:manage') ? [{ label: 'Upgrade', icon: menuIcons.upgrade, path: '/upgrade' }] : []),
      ...(isPlatformAdmin
        ? [{ label: 'Platform Admin', icon: menuIcons.platformAdmin, path: '/platform/subscriptions' }]
        : []),
      { label: 'Print Labels', icon: menuIcons.printLabels, path: '/barcode-print' },
      { label: 'Settings', icon: menuIcons.settings, path: '/settings' },
    ];
    return items;
  }, [perms, isOrgAdmin, isPlatformAdmin, pendingApprovals]);

  useEffect(() => {
    function close(e: MouseEvent) {
      if (dropRef.current && !dropRef.current.contains(e.target as Node)) {
        setDropdownOpen(false);
      }
    }

    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, []);

  useEffect(() => {
    if (!mobileOpen) {
      setDropdownOpen(false);
    }
  }, [mobileOpen]);

  // Warm the most-used route chunks once the app is idle so navigation is instant.
  useEffect(() => {
    preloadAllRoutesWhenIdle();
  }, []);

  useEffect(() => {
    return () => {
      if (closeTimerRef.current) {
        clearTimeout(closeTimerRef.current);
      }
    };
  }, []);

  const showLabels = !collapsed || isMobile;

  // Restore the nav scroll offset before paint (survives the per-navigation
  // remount) and keep it updated as the user scrolls the drawer.
  useLayoutEffect(() => {
    const navEl = navScrollRef.current;
    if (!navEl) return;
    navEl.scrollTop = persistedNavScrollTop;
    const onScroll = () => {
      persistedNavScrollTop = navEl.scrollTop;
    };
    navEl.addEventListener('scroll', onScroll, { passive: true });
    return () => navEl.removeEventListener('scroll', onScroll);
  }, []);

  useLayoutEffect(() => {
    const navEl = navScrollRef.current;
    if (!navEl) return;

    const activeEl = navEl.querySelector<HTMLElement>('[data-nav-active="true"]');
    if (!activeEl) {
      setNavIndicator(null);
      return;
    }

    const update = () => {
      const navRect = navEl.getBoundingClientRect();
      const itemRect = activeEl.getBoundingClientRect();
      const nextTop = itemRect.top - navRect.top + navEl.scrollTop;
      const nextHeight = itemRect.height;
      setNavIndicator((prev) =>
        prev?.top === nextTop && prev.height === nextHeight
          ? prev
          : { top: nextTop, height: nextHeight },
      );
    };

    update();
    navEl.addEventListener('scroll', update, { passive: true });
    window.addEventListener('resize', update);

    return () => {
      navEl.removeEventListener('scroll', update);
      window.removeEventListener('resize', update);
    };
  }, [location.pathname, navItems, showLabels, collapsed, isMobile, mobileOpen]);

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
      onMobileOpenChange?.(false);
      nav('/login', { replace: true });
    }, 1120);
  }

  const avatar = animalAvatarForUser(user);
  const avatarUrl = user?.avatarUrl ?? null;

  return (
    <>
      {showLogoutSplash && (
        <div className={cn(
          "fixed inset-0 z-[100] flex items-center justify-center bg-[radial-gradient(circle_at_35%_20%,rgba(99,102,241,0.32),transparent_35%),radial-gradient(circle_at_70%_90%,rgba(56,189,248,0.22),transparent_40%),rgba(2,6,23,0.94)] transition-opacity duration-300",
          logoutFadeOut ? 'opacity-0' : 'opacity-100',
        )}>
          <div className="relative flex min-w-[280px] max-w-sm flex-col items-center gap-5 rounded-3xl border border-white/20 bg-white/10 px-8 py-8 text-center shadow-[0_28px_70px_rgba(2,6,23,0.45)] backdrop-blur-xl">
            <div className="pointer-events-none absolute -right-6 -top-6 h-20 w-20 rounded-full bg-slate-400/30 blur-2xl" />
            <div className="pointer-events-none absolute -left-6 bottom-4 h-16 w-16 rounded-full bg-cyan-300/35 blur-2xl" />
            <div className={cn('relative flex h-24 w-24 items-center justify-center rounded-full bg-gradient-to-br', avatar.bgClass)}>
              <div className="absolute inset-0 animate-ping rounded-full bg-white/20" />
              {avatarUrl ? (
                <img
                  src={avatarUrl}
                  alt={`${user?.name ?? 'User'} avatar`}
                  className="h-24 w-24 rounded-full object-cover"
                />
              ) : (
                <span aria-label={`${avatar.kind} avatar`} role="img" className="text-5xl">
                  {avatar.emoji}
                </span>
              )}
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
      {isMobile && mobileOpen && (
        <button
          type="button"
          className="fixed inset-0 z-40 bg-slate-900/20 backdrop-blur-[1px] motion-page-enter md:hidden"
          aria-label="Close navigation"
          onClick={() => onMobileOpenChange?.(false)}
        />
      )}

      <aside
        className={cn(
          'sidebar no-print fixed inset-y-0 left-0 z-50 flex flex-col border-r border-slate-200 bg-white transition-[width,transform] duration-300 ease-in-out dark:border-slate-800 dark:bg-slate-950',
          isMobile
            ? [
                'w-[280px] max-w-[85vw] shadow-2xl md:hidden',
                mobileOpen ? 'translate-x-0' : '-translate-x-full',
              ]
            : [collapsed ? 'w-[72px]' : 'w-[240px]', 'translate-x-0'],
        )}
      >
        <div className="flex h-16 items-center justify-between gap-2 border-b border-slate-200 px-3 dark:border-slate-800">
          {showLabels ? (
            <BrandLogo size={48} />
          ) : (
            <BrandLogo size={44} iconOnly className="mx-auto" />
          )}

          {isMobile ? (
            <button
              type="button"
              onClick={() => onMobileOpenChange?.(false)}
              className="ml-auto shrink-0 rounded p-1 text-slate-500 hover:bg-slate-100 hover:text-slate-900"
              aria-label="Close navigation"
            >
              <ChevronsLeft className="h-4 w-4" />
            </button>
          ) : (
            <button
              type="button"
              onClick={() => onCollapsedChange(!collapsed)}
              className={cn(
                'shrink-0 rounded-lg p-1.5 text-slate-500 hover:bg-slate-100 hover:text-slate-900',
                !showLabels && 'mx-auto',
              )}
              aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
              title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            >
              <ChevronsLeft
                className={cn('h-4 w-4 transition-transform', collapsed && 'rotate-180')}
              />
            </button>
          )}
        </div>

        <nav ref={navScrollRef} className="sidebar-scroll relative mt-4 flex-1 space-y-1 overflow-y-auto px-2 pb-3">
          {navIndicator ? (
            <span
              aria-hidden="true"
              className="motion-nav-indicator pointer-events-none absolute left-2 right-2 z-0 rounded-xl bg-accent dark:bg-slate-800/50"
              style={{ top: navIndicator.top, height: navIndicator.height }}
            />
          ) : null}
          {navItems.map((item, index) => {
            const itemActive = isActive(location.pathname, item.path);
            const prevSection = index > 0 ? sectionFor(navItems[index - 1].path) : null;
            const section = sectionFor(item.path);
            const showSectionHeading = showLabels && section !== prevSection;
            return (
              <div key={item.label}>
                {showSectionHeading ? (
                  <p className="px-3 pb-1 pt-3 text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-400">
                    {section}
                  </p>
                ) : null}
                <button
                  type="button"
                  data-nav-active={itemActive ? 'true' : undefined}
                  onMouseEnter={() => preloadRoute(item.path)}
                  onFocus={() => preloadRoute(item.path)}
                  onPointerDown={() => preloadRoute(item.path)}
                  onClick={() => {
                    nav(item.path);
                    onMobileOpenChange?.(false);
                  }}
                  className={cn(
                    'sidebar-item relative z-[1] flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium',
                    itemActive
                      ? 'active'
                      : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100',
                  )}
                >
                  <item.icon
                    className={cn(
                      'h-5 w-5 shrink-0',
                      itemActive ? 'selection-active-icon' : 'text-slate-500 dark:text-slate-400',
                    )}
                  />
                  {showLabels && <span className="font-medium">{item.label}</span>}
                  {item.badge != null && item.badge > 0 && (
                    <span
                      className={cn(
                        'ml-auto flex h-5 min-w-5 items-center justify-center rounded-full bg-red-500 px-1.5 text-[10px] font-semibold leading-none text-white',
                        !showLabels && 'absolute right-1 top-1 ml-0',
                      )}
                    >
                      {item.badge > 99 ? '99+' : item.badge}
                    </span>
                  )}
                </button>
              </div>
            );
          })}
        </nav>

        <div className="relative px-2 pb-4" ref={dropRef}>
          <button
            type="button"
            onClick={() => setDropdownOpen((open) => !open)}
            className="sidebar-item flex w-full items-center gap-3 rounded-lg px-3 py-2.5"
          >
            <div className={cn('avatar-ring flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gradient-to-br text-sm', avatar.bgClass)}>
              {avatarUrl ? (
                <img
                  src={avatarUrl}
                  alt={`${user?.name ?? 'User'} avatar`}
                  className="h-8 w-8 rounded-full object-cover"
                />
              ) : (
                <span aria-label={`${avatar.kind} avatar`} role="img">{avatar.emoji}</span>
              )}
            </div>
            {showLabels && (
              <>
                <div className="min-w-0 text-left">
                  <div className="truncate text-sm font-medium text-slate-900">{user?.name}</div>
                  <div className="truncate text-[11px] text-slate-500">{user?.role}</div>
                </div>
                <ChevronUp className="ml-auto h-4 w-4 text-slate-500" />
              </>
            )}
          </button>

          {dropdownOpen && (
            <div className="absolute bottom-full left-2 right-2 z-50 mb-2 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xl">
              <div className="border-b border-slate-200 px-4 py-3">
                <div className="text-sm font-medium text-slate-900">{user?.name}</div>
                <div className="text-xs text-slate-500">{user?.email}</div>
                {user?.shop && (
                  <div className="mt-0.5 text-xs text-primary">{user.shop.shopName}</div>
                )}
              </div>

              <ProfileMenuLinks
                variant="sidebar"
                onNavigate={(path) => {
                  setDropdownOpen(false);
                  onMobileOpenChange?.(false);
                  nav(path);
                }}
                onLogout={handleLogout}
              />
            </div>
          )}
        </div>
      </aside>
    </>
  );
}
