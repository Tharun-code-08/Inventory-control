/**
 * Route chunk preloading for the sidebar drawer.
 *
 * Pages are code-split with `lazyPage`, so the JS chunk for a route is only
 * fetched when the user first navigates to it — that first hop shows the page
 * fallback while the chunk downloads. By kicking off the dynamic import on nav
 * hover/focus (or while the browser is idle), the chunk is warm by the time the
 * user actually clicks, making navigation feel instant.
 *
 * The dynamic `import()` promise is cached by the bundler, so calling a
 * preloader repeatedly is cheap (no duplicate network requests). We also keep
 * our own guard set so we never re-invoke an importer that already ran.
 */

const importers: Record<string, () => Promise<unknown>> = {
  // Auth + public pages
  '/':                  () => import('@/pages/HomePage'),
  '/login':             () => import('@/pages/LoginPage'),
  '/signup':            () => import('@/pages/SignupPage'),
  '/forgot-password':   () => import('@/pages/ForgotPasswordPage'),
  '/reset-password':    () => import('@/pages/ResetPasswordPage'),
  // ERP pages
  '/dashboard': () => import('@/pages/DashboardPage'),
  '/companies': () => import('@/pages/CompaniesPage'),
  '/plants': () => import('@/pages/PlantsPage'),
  '/storage-locations': () => import('@/pages/StorageLocationsPage'),
  '/products': () => import('@/pages/ProductsPage'),
  '/suppliers': () => import('@/pages/SuppliersPage'),
  '/customers': () => import('@/pages/CustomersPage'),
  '/rfqs': () => import('@/pages/RfqsPage'),
  '/contracts': () => import('@/pages/ContractsPage'),
  '/purchase-orders': () => import('@/pages/PurchaseOrdersPage'),
  '/goods-receipts': () => import('@/pages/GoodsReceiptPage'),
  '/returns': () => import('@/pages/ReturnsPage'),
  '/supplier-portal': () => import('@/pages/SupplierPortalPage'),
  '/supplier-bills': () => import('@/pages/SupplierBillsPage'),
  '/supplier-payments': () => import('@/pages/SupplierPaymentsPage'),
  '/quotations': () => import('@/pages/QuotationsPage'),
  '/sales': () => import('@/pages/SalesPage'),
  '/goods-issues': () => import('@/pages/GoodsIssuePage'),
  '/invoices': () => import('@/pages/InvoicesPage'),
  '/eway-bills': () => import('@/pages/EwayBillsPage'),
  '/payments': () => import('@/pages/PaymentsPage'),
  '/stock-transfers': () => import('@/pages/StockTransfersPage'),
  '/warehouse': () => import('@/pages/WarehousePage'),
  '/reports': () => import('@/pages/ReportsPage'),
  '/notifications': () => import('@/pages/NotificationsPage'),
  '/approvals': () => import('@/pages/ApprovalsPage'),
  '/upgrade': () => import('@/pages/UpgradePage'),
  '/platform/subscriptions': () => import('@/pages/PlatformSubscriptionsPage'),
  '/barcode-print': () => import('@/pages/BarcodePrintPage'),
  '/settings': () => import('@/pages/SettingsPage'),
};

const warmed = new Set<string>();

/** Warm the JS chunk for a route. Safe to call repeatedly (deduped). */
export function preloadRoute(path: string): void {
  if (warmed.has(path)) return;
  const importer = importers[path];
  if (!importer) return;
  warmed.add(path);
  // Fire-and-forget; swallow errors (a stale-chunk reload is handled elsewhere).
  void importer().catch(() => {
    warmed.delete(path);
  });
}

type IdleScheduler = (cb: () => void) => void;

function onIdle(cb: () => void): void {
  const ric = (window as unknown as { requestIdleCallback?: IdleScheduler }).requestIdleCallback;
  if (typeof ric === 'function') {
    ric(cb);
  } else {
    window.setTimeout(cb, 1);
  }
}

const NEXT_ROUTES: Record<string, string[]> = {
  '/':               ['/login'],          // marketing visitors typically click Login / Get Started
  '/login':          ['/signup', '/forgot-password'],
  '/signup':         ['/login'],
  '/forgot-password': ['/login', '/reset-password'],
  '/reset-password': ['/login'],
};

/**
 * Warm the chunk for the current pathname + idle-preload likely next pages.
 * Called on every route change from AppRoutes. Safe to call repeatedly (deduped).
 */
export function preloadForCurrentRoute(pathname: string): void {
  preloadRoute(pathname);
  const next = NEXT_ROUTES[pathname] ?? [];
  for (const p of next) onIdle(() => preloadRoute(p));
}

/**
 * Warm every navigable route chunk once the browser is idle, a few at a time so
 * we never compete with the initial render. After this completes, switching
 * modules is instant — no Suspense fallback / white flash.
 */
export function preloadAllRoutesWhenIdle(): void {
  const paths = Object.keys(importers).filter((p) => !warmed.has(p));
  let i = 0;
  const pump = () => {
    if (i >= paths.length) return;
    // Warm a small batch per idle tick to keep the main thread responsive.
    for (let n = 0; n < 3 && i < paths.length; n += 1, i += 1) {
      preloadRoute(paths[i]);
    }
    onIdle(pump);
  };
  // Give first paint a brief head start, then begin warming on idle.
  window.setTimeout(() => onIdle(pump), 800);
}
