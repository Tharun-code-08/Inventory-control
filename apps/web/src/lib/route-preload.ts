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

/** Preload the most frequently visited routes once the browser is idle. */
export function preloadCommonRoutesWhenIdle(): void {
  const common = ['/products', '/goods-receipts', '/reports', '/settings'];
  const run = () => common.forEach(preloadRoute);
  const ric = (window as unknown as { requestIdleCallback?: (cb: () => void) => void })
    .requestIdleCallback;
  if (typeof ric === 'function') {
    ric(run);
  } else {
    window.setTimeout(run, 2000);
  }
}
