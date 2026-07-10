import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { ChevronRight, ChevronUp, ChevronsLeft, Pin, PinOff } from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';
import { api } from '@/api/client';
import { resetClientSessionState } from '@/lib/reset-session-state';
import { cn } from '@/lib/cn';
import { ThemeToggle } from '@/components/ThemeToggle';
import { useAuthStore } from '@/store/authStore';
import { animalAvatarForUser } from '@/lib/profile-avatar';
import { ProfileMenuLinks } from '@/components/ProfileMenuLinks';
import { isOrgAdminUser, isPlatformAdminUser } from '@/lib/roles';
import { BrandLogo } from '@/components/BrandLogo';
import { usePendingApprovalCount } from '@/hooks/use-approvals';
import { preloadRoute, preloadAllRoutesWhenIdle } from '@/lib/route-preload';
import { SIDEBAR_SECTIONS, flattenLinks, type SidebarLink, type SidebarSection } from '@/lib/sidebar-navigation';
import { useSidebarStore } from '@/store/sidebarStore';
import { trackNavOpen } from '@/lib/nav-analytics';

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
  const [autoHideExpanded, setAutoHideExpanded] = useState(false);

  const isOrgAdmin = isOrgAdminUser(user);
  const isPlatformAdmin = isPlatformAdminUser(user);
  const perms = user?.permissions ?? EMPTY_PERMISSIONS;
  const pendingApprovals = usePendingApprovalCount(Boolean(user)).data ?? 0;

  // Sidebar store: section collapse state + pin mode
  const { collapsedSections, toggleSection, expandAll, collapseAll, setPinMode, pinMode } = useSidebarStore();

  type ResolvedLink = SidebarLink & { resolvedBadge?: number };

  // Build visible sections from the hierarchical model
  const visibleSections = useMemo(() => {
    const has = (perm: string) => perms.includes(perm) || isOrgAdmin;

    return SIDEBAR_SECTIONS.reduce<Array<SidebarSection & { links: ResolvedLink[] }>>((acc, section) => {
      const links: ResolvedLink[] = flattenLinks(section.children).filter((link) => {
        if (link.requireOrgAdmin && !isOrgAdmin) return false;
        if (link.requirePlatformAdmin && !isPlatformAdmin) return false;
        if (link.permission && !has(link.permission)) return false;
        return true;
      }).map((link) => ({
        ...link,
        resolvedBadge: link.badge?.type === 'approvals' ? pendingApprovals : undefined,
      }));

      if (links.length > 0) acc.push({ ...section, links });
      return acc;
    }, []);
  }, [perms, isOrgAdmin, isPlatformAdmin, pendingApprovals]);

  // Flat list of all visible links (for icon-only mode + nav indicator + preload)
  const allVisibleLinks = useMemo(
    () => visibleSections.flatMap((s) => s.links),
    [visibleSections],
  );

  const visibleSectionIds = useMemo(() => visibleSections.map((s) => s.id), [visibleSections]);

  const showLabels = !collapsed || isMobile;

  // In auto-hide mode the sidebar expands as overlay on hover (desktop only)
  const isAutoHide = !isMobile && pinMode === 'auto-hide';
  const effectivelyExpanded = isAutoHide ? autoHideExpanded : showLabels;

  // Auto-open the active item's section when the route changes
  useEffect(() => {
    const pathname = location.pathname;
    for (const section of visibleSections) {
      const hasActive = section.links.some((l) => isActive(pathname, l.path));
      if (hasActive && collapsedSections[section.id]) {
        useSidebarStore.getState().setCollapsed(section.id, false);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.pathname]);

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
    if (!mobileOpen) setDropdownOpen(false);
  }, [mobileOpen]);

  useEffect(() => {
    preloadAllRoutesWhenIdle();
  }, []);

  useEffect(() => {
    return () => {
      if (closeTimerRef.current) clearTimeout(closeTimerRef.current);
    };
  }, []);

  // Restore the nav scroll offset before paint
  useLayoutEffect(() => {
    const navEl = navScrollRef.current;
    if (!navEl) return;
    navEl.scrollTop = persistedNavScrollTop;
    const onScroll = () => { persistedNavScrollTop = navEl.scrollTop; };
    navEl.addEventListener('scroll', onScroll, { passive: true });
    return () => navEl.removeEventListener('scroll', onScroll);
  }, []);

  // Track the active item position for the sliding indicator
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
  }, [location.pathname, allVisibleLinks, effectivelyExpanded, collapsed, isMobile, mobileOpen, collapsedSections]);

  async function handleLogout() {
    if (showLogoutSplash) return;
    setLogoutFadeOut(false);
    setShowLogoutSplash(true);
    try {
      await api.post('/auth/logout');
    } catch { /* best-effort */ }
    window.setTimeout(() => { setLogoutFadeOut(true); }, 800);
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

  // Render a single nav link button (shared between expanded + icon-only modes)
  function NavLinkButton({ link, badge }: { link: SidebarLink; badge?: number }) {
    const itemActive = isActive(location.pathname, link.path);
    return (
      <button
        type="button"
        data-nav-active={itemActive ? 'true' : undefined}
        onMouseEnter={() => preloadRoute(link.path)}
        onFocus={() => preloadRoute(link.path)}
        onPointerDown={() => preloadRoute(link.path)}
        onClick={() => {
          trackNavOpen(link.path);
          nav(link.path);
          onMobileOpenChange?.(false);
          if (isAutoHide) setAutoHideExpanded(false);
        }}
        className={cn(
          'sidebar-item relative z-[1] flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium',
          itemActive
            ? 'active'
            : 'text-muted-foreground hover:text-foreground dark:text-muted-foreground dark:hover:text-slate-100',
        )}
        role="treeitem"
        aria-current={itemActive ? 'page' : undefined}
      >
        <link.icon
          className={cn(
            'h-5 w-5 shrink-0',
            itemActive ? 'selection-active-icon' : 'text-muted-foreground dark:text-muted-foreground',
          )}
        />
        {effectivelyExpanded && <span className="font-medium">{link.label}</span>}
        {badge != null && badge > 0 && (
          <span
            className={cn(
              'ml-auto flex h-5 min-w-5 items-center justify-center rounded-full bg-red-500 px-1.5 text-[10px] font-semibold leading-none text-white',
              !effectivelyExpanded && 'absolute right-1 top-1 ml-0',
            )}
          >
            {badge > 99 ? '99+' : badge}
          </span>
        )}
      </button>
    );
  }

  return (
    <>
      {showLogoutSplash && (
        <div className={cn(
          "fixed inset-0 z-[100] flex items-center justify-center bg-[radial-gradient(circle_at_35%_20%,rgba(99,102,241,0.32),transparent_35%),radial-gradient(circle_at_70%_90%,rgba(56,189,248,0.22),transparent_40%),rgba(2,6,23,0.94)] transition-opacity duration-300",
          logoutFadeOut ? 'opacity-0' : 'opacity-100',
        )}>
          <div className="relative flex min-w-[280px] max-w-sm flex-col items-center gap-5 rounded-3xl border border-white/20 bg-card/10 px-8 py-8 text-center shadow-[0_28px_70px_rgba(2,6,23,0.45)] backdrop-blur-xl">
            <div className="pointer-events-none absolute -right-6 -top-6 h-20 w-20 rounded-full bg-slate-400/30 blur-2xl" />
            <div className="pointer-events-none absolute -left-6 bottom-4 h-16 w-16 rounded-full bg-cyan-300/35 blur-2xl" />
            <div className={cn('relative flex h-24 w-24 items-center justify-center rounded-full bg-gradient-to-br', avatar.bgClass)}>
              <div className="absolute inset-0 animate-ping rounded-full bg-card/20" />
              {avatarUrl ? (
                <img src={avatarUrl} alt={`${user?.name ?? 'User'} avatar`} className="h-24 w-24 rounded-full object-cover" />
              ) : (
                <span aria-label={`${avatar.kind} avatar`} role="img" className="text-5xl">{avatar.emoji}</span>
              )}
            </div>
            <div className="space-y-1">
              <p className="text-base font-semibold text-white">Signing you out securely</p>
              <p className="text-xs text-slate-200/90">Clearing session tokens and workspace context...</p>
            </div>
            <div className="h-1.5 w-full overflow-hidden rounded-full bg-card/20">
              <div className="h-full w-1/2 animate-[pulse_1.2s_ease-in-out_infinite] rounded-full bg-card" />
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
          'sidebar no-print fixed inset-y-0 left-0 z-50 flex flex-col border-r border-border bg-card transition-[width,transform] duration-300 ease-in-out dark:border-slate-800 dark:bg-slate-950',
          isMobile
            ? ['w-[280px] max-w-[85vw] shadow-2xl md:hidden', mobileOpen ? 'translate-x-0' : '-translate-x-full']
            : isAutoHide
              ? [autoHideExpanded ? 'w-[240px] shadow-2xl' : 'w-[72px]', 'translate-x-0']
              : [collapsed ? 'w-[72px]' : 'w-[240px]', 'translate-x-0'],
        )}
        onMouseEnter={() => { if (isAutoHide) setAutoHideExpanded(true); }}
        onMouseLeave={() => { if (isAutoHide) setAutoHideExpanded(false); }}
      >
        {/* Header: logo + collapse/pin controls */}
        <div className="flex h-16 items-center justify-between gap-2 border-b border-border px-3 dark:border-slate-800">
          {effectivelyExpanded ? (
            <BrandLogo size={48} />
          ) : (
            <BrandLogo size={44} iconOnly className="mx-auto" />
          )}

          {isMobile ? (
            <button
              type="button"
              onClick={() => onMobileOpenChange?.(false)}
              className="ml-auto shrink-0 rounded p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
              aria-label="Close navigation"
            >
              <ChevronsLeft className="h-4 w-4" />
            </button>
          ) : (
            <div className="flex items-center gap-0.5">
              {/* Pin mode toggle */}
              {showLabels && (
                <button
                  type="button"
                  onClick={() => setPinMode(pinMode === 'pinned' ? 'auto-hide' : 'pinned')}
                  className="shrink-0 rounded-lg p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground"
                  aria-label={pinMode === 'pinned' ? 'Switch to auto-hide mode' : 'Pin sidebar'}
                  title={pinMode === 'pinned' ? 'Auto-hide sidebar' : 'Pin sidebar'}
                >
                  {pinMode === 'pinned' ? <Pin className="h-3.5 w-3.5" /> : <PinOff className="h-3.5 w-3.5" />}
                </button>
              )}
              {/* Collapse toggle (only in pinned mode) */}
              {!isAutoHide && (
                <button
                  type="button"
                  onClick={() => onCollapsedChange(!collapsed)}
                  className={cn(
                    'shrink-0 rounded-lg p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground',
                    !showLabels && 'mx-auto',
                  )}
                  aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
                  title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
                >
                  <ChevronsLeft className={cn('h-4 w-4 transition-transform', collapsed && 'rotate-180')} />
                </button>
              )}
            </div>
          )}
        </div>

        {/* Expand / Collapse all — only in expanded label mode */}
        {effectivelyExpanded && (
          <div className="flex items-center justify-end gap-2 px-3 pb-0 pt-2">
            <button
              type="button"
              onClick={() => expandAll(visibleSectionIds)}
              className="text-[10px] text-muted-foreground hover:text-foreground"
            >
              Expand all
            </button>
            <span className="text-[10px] text-border">·</span>
            <button
              type="button"
              onClick={() => collapseAll(visibleSectionIds)}
              className="text-[10px] text-muted-foreground hover:text-foreground"
            >
              Collapse all
            </button>
          </div>
        )}

        {/* Main nav */}
        <nav
          ref={navScrollRef}
          className="sidebar-scroll relative mt-2 flex-1 overflow-y-auto px-2 pb-3"
          role="tree"
          aria-label="Main navigation"
        >
          {navIndicator ? (
            <span
              aria-hidden="true"
              className="motion-nav-indicator pointer-events-none absolute left-2 right-2 z-0 rounded-xl bg-accent dark:bg-slate-800/50"
              style={{ top: navIndicator.top, height: navIndicator.height }}
            />
          ) : null}

          {effectivelyExpanded
            ? /* ── Expanded: sections with collapsible headers ── */
              visibleSections.map((section) => {
                // On the mobile overlay every section stays expanded so all
                // nav items are reachable in one tap; desktop keeps collapse.
                const isSectionCollapsed = !isMobile && collapsedSections[section.id] === true;
                const panelId = `sidebar-section-${section.id}`;
                return (
                  <div key={section.id} className="mb-1">
                    {/* Section header button */}
                    <button
                      type="button"
                      onClick={() => toggleSection(section.id)}
                      aria-expanded={!isSectionCollapsed}
                      aria-controls={panelId}
                      className="flex w-full items-center gap-1.5 px-3 pb-1 pt-3 text-left"
                    >
                      <ChevronRight
                        className={cn(
                          'h-3 w-3 shrink-0 text-muted-foreground/60 transition-transform duration-200',
                          !isSectionCollapsed && 'rotate-90',
                        )}
                      />
                      <span className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                        {section.title}
                      </span>
                    </button>

                    {/* Animated section panel */}
                    <div
                      id={panelId}
                      role="group"
                      className={cn(
                        'grid transition-[grid-template-rows] duration-200 ease-in-out',
                        isSectionCollapsed ? 'grid-rows-[0fr]' : 'grid-rows-[1fr]',
                      )}
                    >
                      <div className="overflow-hidden">
                        <div className="space-y-0.5 py-0.5">
                          {section.links.map((link) => (
                            <NavLinkButton
                              key={link.path}
                              link={link}
                              badge={link.resolvedBadge}
                            />
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })
            : /* ── Icon-only: flat list, no section headers ── */
              visibleSections.flatMap((s) => s.links).map((link) => (
                <NavLinkButton key={link.path} link={link} badge={link.resolvedBadge} />
              ))
          }
        </nav>

        <div className="px-2 pb-2">
          <ThemeToggle collapsed={!effectivelyExpanded} />
        </div>

        {/* User menu */}
        <div className="relative px-2 pb-4" ref={dropRef}>
          <button
            type="button"
            onClick={() => setDropdownOpen((open) => !open)}
            className="sidebar-item flex w-full items-center gap-3 rounded-lg px-3 py-2.5"
          >
            <div className={cn('avatar-ring flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gradient-to-br text-sm', avatar.bgClass)}>
              {avatarUrl ? (
                <img src={avatarUrl} alt={`${user?.name ?? 'User'} avatar`} className="h-8 w-8 rounded-full object-cover" />
              ) : (
                <span aria-label={`${avatar.kind} avatar`} role="img">{avatar.emoji}</span>
              )}
            </div>
            {effectivelyExpanded && (
              <>
                <div className="min-w-0 text-left">
                  <div className="truncate text-sm font-medium text-foreground">{user?.name}</div>
                  <div className="truncate text-[11px] text-muted-foreground">{user?.role}</div>
                </div>
                <ChevronUp className="ml-auto h-4 w-4 text-muted-foreground" />
              </>
            )}
          </button>

          {dropdownOpen && (
            <div className="absolute bottom-full left-2 right-2 z-50 mb-2 overflow-hidden rounded-2xl border border-border bg-popover shadow-xl">
              <div className="border-b border-border px-4 py-3">
                <div className="text-sm font-medium text-foreground">{user?.name}</div>
                <div className="text-xs text-muted-foreground">{user?.email}</div>
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
