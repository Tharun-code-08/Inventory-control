import { useEffect, useMemo, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  ArrowDownToLine,
  ArrowUpFromLine,
  BarChart3,
  Building2,
  ChevronUp,
  ChevronsLeft,
  ClipboardList,
  Factory,
  FileCheck,
  FileSignature,
  FileText,
  LayoutDashboard,
  Bell,
  LogOut,
  Package,
  Settings,
  ShoppingCart,
  Truck,
  UserCircle,
  Users,
  Warehouse,
} from 'lucide-react';
import { api } from '@/api/client';
import { cn } from '@/lib/cn';
import { useAuthStore } from '@/store/authStore';

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

export function Sidebar({
  collapsed,
  onCollapsedChange,
  isMobile = false,
  mobileOpen = false,
  onMobileOpenChange,
}: SidebarProps) {
  const nav = useNavigate();
  const location = useLocation();
  const user = useAuthStore((s) => s.user);
  const clear = useAuthStore((s) => s.clear);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropRef = useRef<HTMLDivElement>(null);
  const closeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isAdmin = user?.role === 'ADMIN';
  const perms = user?.permissions ?? [];
  const has = (perm: string) => perms.includes(perm) || isAdmin;

  const navItems = useMemo(
    () => [
      ...(isAdmin ? [{ label: 'Dashboard', icon: LayoutDashboard, path: '/dashboard' }] : []),

      // Master Data
      ...(has('company:read') ? [{ label: 'Companies', icon: Building2, path: '/companies' }] : []),
      ...(has('shop:read') ? [{ label: 'Plants', icon: Factory, path: '/plants' }] : []),
      ...(has('storage_location:read') ? [{ label: 'Storage Locations', icon: Warehouse, path: '/storage-locations' }] : []),
      ...(has('product:read') ? [{ label: 'Products', icon: Package, path: '/products' }] : []),
      ...(has('supplier:read') ? [{ label: 'Suppliers', icon: Truck, path: '/suppliers' }] : []),
      ...(has('shop:read') ? [{ label: 'Customers', icon: Users, path: '/customers' }] : []),

      // Procurement
      ...(has('rfq:read') ? [{ label: 'RFQs', icon: FileText, path: '/rfqs' }] : []),
      ...(has('quote:read') ? [{ label: 'Quotations', icon: FileCheck, path: '/quotations' }] : []),
      ...(has('contract:read') ? [{ label: 'Contracts', icon: FileSignature, path: '/contracts' }] : []),
      ...(has('purchase_order:read') ? [{ label: 'Purchase Orders', icon: ClipboardList, path: '/purchase-orders' }] : []),
      ...(has('goods_receipt:read') ? [{ label: 'Goods Receipt', icon: ArrowDownToLine, path: '/goods-receipts' }] : []),
      ...(has('supplier:read') ? [{ label: 'Supplier Portal', icon: Truck, path: '/supplier-portal' }] : []),

      // Sales
      ...(has('shop:read') ? [{ label: 'Sales', icon: ShoppingCart, path: '/sales' }] : []),
      ...(has('goods_issue:read') ? [{ label: 'Goods Issue', icon: ArrowUpFromLine, path: '/goods-issues' }] : []),
      ...(has('shop:read') ? [{ label: 'Invoices', icon: FileText, path: '/invoices' }] : []),
      ...(has('shop:read') ? [{ label: 'Payments', icon: FileCheck, path: '/payments' }] : []),

      // Warehouse + Admin
      ...(has('report:view') ? [{ label: 'Warehouse', icon: Warehouse, path: '/warehouse' }] : []),
      ...(has('report:view') ? [{ label: 'Reports', icon: BarChart3, path: '/reports' }] : []),
      ...(has('report:view') ? [{ label: 'Notifications', icon: Bell, path: '/notifications' }] : []),
      { label: 'Settings', icon: Settings, path: '/settings' },
    ],
    [has, isAdmin],
  );

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

  useEffect(() => {
    return () => {
      if (closeTimerRef.current) {
        clearTimeout(closeTimerRef.current);
      }
    };
  }, []);

  const showLabels = !collapsed || isMobile;

  function handleDesktopSidebarEnter() {
    return;
  }

  function handleDesktopSidebarLeave() {
    return;
  }

  async function handleLogout() {
    try {
      await api.post('/auth/logout');
    } catch {
      /* best-effort */
    }
    delete api.defaults.headers.common.Authorization;
    clear();
    onMobileOpenChange?.(false);
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
    <>
      {isMobile && mobileOpen && (
        <button
          type="button"
          className="fixed inset-0 z-40 bg-slate-950/50 backdrop-blur-[1px] md:hidden"
          aria-label="Close navigation"
          onClick={() => onMobileOpenChange?.(false)}
        />
      )}

      <aside
        onMouseEnter={handleDesktopSidebarEnter}
        onMouseLeave={handleDesktopSidebarLeave}
        className={cn(
          'sidebar no-print fixed inset-y-0 left-0 z-50 flex flex-col',
          isMobile
            ? [
                'w-[280px] max-w-[85vw] shadow-2xl md:hidden',
                mobileOpen ? 'translate-x-0' : '-translate-x-full',
              ]
            : [collapsed ? 'w-[72px]' : 'w-[240px]', 'translate-x-0'],
        )}
      >
        <div className="flex h-16 items-center justify-between px-4">
          {showLabels ? (
            <div className="flex items-center gap-2.5">
              <div className="avatar-ring flex h-10 w-10 items-center justify-center rounded-full text-sm font-bold text-white">
                IMS
              </div>
              <div>
                <div className="text-sm font-semibold text-white">Retail IMS</div>
                <div className="text-[11px] text-slate-400">Inventory Control</div>
              </div>
            </div>
          ) : (
            <div className="avatar-ring mx-auto flex h-9 w-9 items-center justify-center rounded-full text-xs font-bold text-white">
              R
            </div>
          )}

          {isMobile && (
            <button
              type="button"
              onClick={() => onMobileOpenChange?.(false)}
              className="ml-auto rounded p-1 text-slate-200 hover:bg-white/10 hover:text-white"
              aria-label="Close navigation"
            >
              <ChevronsLeft className="h-4 w-4" />
            </button>
          )}
        </div>

        <nav className="sidebar-scroll mt-4 flex-1 space-y-1 overflow-y-auto px-2 pb-2">
          {navItems.map((item) => {
            const active = isActive(location.pathname, item.path);
            return (
              <button
                key={item.label}
                type="button"
                onClick={() => {
                  nav(item.path);
                  onMobileOpenChange?.(false);
                }}
                className={cn(
                  'sidebar-item flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm',
                  active ? 'active text-white' : 'text-slate-200 hover:text-white',
                )}
              >
                <item.icon className="h-5 w-5 shrink-0" />
                {showLabels && <span>{item.label}</span>}
              </button>
            );
          })}
        </nav>

        <div className="relative px-2 pb-4" ref={dropRef}>
          <button
            type="button"
            onClick={() => setDropdownOpen((open) => !open)}
            className="sidebar-item flex w-full items-center gap-3 rounded-lg px-3 py-2.5"
          >
            <div className="avatar-ring flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-semibold text-white">
              {initials}
            </div>
            {showLabels && (
              <>
                <div className="min-w-0 text-left">
                  <div className="truncate text-sm font-medium text-white">{user?.name}</div>
                  <div className="truncate text-[11px] text-slate-300">{user?.role}</div>
                </div>
                <ChevronUp className="ml-auto h-4 w-4 text-slate-500" />
              </>
            )}
          </button>

          {dropdownOpen && (
            <div className="absolute bottom-full left-2 right-2 mb-2 overflow-hidden rounded-2xl border border-white/20 bg-slate-900/70 shadow-xl backdrop-blur-xl">
              <div className="border-b border-white/15 px-4 py-3">
                <div className="text-sm font-medium text-white">{user?.name}</div>
                <div className="text-xs text-slate-400">{user?.email}</div>
                {user?.shop && (
                  <div className="mt-0.5 text-xs text-amber-400">{user.shop.shopName}</div>
                )}
              </div>

              <button
                type="button"
                onClick={() => {
                  setDropdownOpen(false);
                  onMobileOpenChange?.(false);
                  nav('/profile');
                }}
                className="flex w-full items-center gap-2 px-4 py-2.5 text-sm text-slate-300 hover:bg-white/5 hover:text-white"
              >
                <UserCircle className="h-4 w-4" /> Profile & Settings
              </button>
              <button
                type="button"
                onClick={handleLogout}
                className="flex w-full items-center gap-2 px-4 py-2.5 text-sm text-rose-400 hover:bg-rose-500/10 hover:text-rose-300"
              >
                <LogOut className="h-4 w-4" /> Logout
              </button>
            </div>
          )}
        </div>
      </aside>
    </>
  );
}
