import { Suspense } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import { useAuthStore } from '@/store/authStore';
import { isOrgAdminUser } from '@/lib/roles';
import { Skeleton } from '@/components/ui/skeleton';
import { lazyPage } from '@/lib/lazy-page';
import { AppErrorBoundary } from '@/components/AppErrorBoundary';
import { useSubscription } from '@/hooks/use-subscription';
import { TrialFeatureGate } from '@/components/TrialFeatureGate';
const HomePage = lazyPage(() => import('@/pages/HomePage'), 'HomePage');
const LoginPage = lazyPage(() => import('@/pages/LoginPage'), 'LoginPage');
const SignupPage = lazyPage(() => import('@/pages/SignupPage'), 'SignupPage');
const ForgotPasswordPage = lazyPage(
  () => import('@/pages/ForgotPasswordPage'),
  'ForgotPasswordPage',
);
const ResetPasswordPage = lazyPage(() => import('@/pages/ResetPasswordPage'), 'ResetPasswordPage');
const DashboardPage = lazyPage(() => import('@/pages/DashboardPage'), 'DashboardPage');
const ProductsPage = lazyPage(() => import('@/pages/ProductsPage'), 'ProductsPage');
const GoodsReceiptPage = lazyPage(() => import('@/pages/GoodsReceiptPage'), 'GoodsReceiptPage');
const GoodsIssuePage = lazyPage(() => import('@/pages/GoodsIssuePage'), 'GoodsIssuePage');
const GoodsIssueCreatePage = lazyPage(
  () => import('@/pages/GoodsIssueCreatePage'),
  'GoodsIssueCreatePage',
);
const PurchaseOrdersPage = lazyPage(() => import('@/pages/PurchaseOrdersPage'), 'PurchaseOrdersPage');
const ReportsPage = lazyPage(() => import('@/pages/ReportsPage'), 'ReportsPage');
const SettingsPage = lazyPage(() => import('@/pages/SettingsPage'), 'SettingsPage');
const CompaniesPage = lazyPage(() => import('@/pages/CompaniesPage'), 'CompaniesPage');
const PlantsPage = lazyPage(() => import('@/pages/PlantsPage'), 'PlantsPage');
const StorageLocationsPage = lazyPage(
  () => import('@/pages/StorageLocationsPage'),
  'StorageLocationsPage',
);
const SuppliersPage = lazyPage(() => import('@/pages/SuppliersPage'), 'SuppliersPage');
const RfqsPage = lazyPage(() => import('@/pages/RfqsPage'), 'RfqsPage');
const RfqDetailPage = lazyPage(() => import('@/pages/RfqDetailPage'), 'RfqDetailPage');
const RfqComparePage = lazyPage(() => import('@/pages/RfqComparePage'), 'RfqComparePage');
const QuotationsPage = lazyPage(() => import('@/pages/QuotationsPage'), 'QuotationsPage');
const ContractsPage = lazyPage(() => import('@/pages/ContractsPage'), 'ContractsPage');
const CustomersPage = lazyPage(() => import('@/pages/CustomersPage'), 'CustomersPage');
const SupplierPortalPage = lazyPage(() => import('@/pages/SupplierPortalPage'), 'SupplierPortalPage');
const SupplierPortalSubmitPage = lazyPage(
  () => import('@/pages/SupplierPortalSubmitPage'),
  'SupplierPortalSubmitPage',
);
const SupplierDeleteConfirmPage = lazyPage(
  () => import('@/pages/SupplierDeleteConfirmPage'),
  'SupplierDeleteConfirmPage',
);
const QuotationPortalPage = lazyPage(
  () => import('@/pages/QuotationPortalPage'),
  'QuotationPortalPage',
);
const InviteAcceptPage = lazyPage(() => import('@/pages/InviteAcceptPage'), 'InviteAcceptPage');
const SalesPage = lazyPage(() => import('@/pages/SalesPage'), 'SalesPage');
const SalesOrderDetailPage = lazyPage(
  () => import('@/pages/SalesOrderDetailPage'),
  'SalesOrderDetailPage',
);
const WarehousePage = lazyPage(() => import('@/pages/WarehousePage'), 'WarehousePage');
const InvoicesPage = lazyPage(() => import('@/pages/InvoicesPage'), 'InvoicesPage');
const PaymentsPage = lazyPage(() => import('@/pages/PaymentsPage'), 'PaymentsPage');
const SupplierBillsPage = lazyPage(() => import('@/pages/SupplierBillsPage'), 'SupplierBillsPage');
const SupplierPaymentsPage = lazyPage(
  () => import('@/pages/SupplierPaymentsPage'),
  'SupplierPaymentsPage',
);
const StockTransfersPage = lazyPage(
  () =>
    import('@/pages/StockTransfersPage') as Promise<
      Record<string, import('react').ComponentType<unknown>>
    >,
  'StockTransfersPage',
);
const ReturnsPage = lazyPage(() => import('@/pages/ReturnsPage'), 'ReturnsPage');
const ReturnAcknowledgementPage = lazyPage(
  () => import('@/pages/ReturnAcknowledgementPage'),
  'ReturnAcknowledgementPage',
);
const NotificationsPage = lazyPage(() => import('@/pages/NotificationsPage'), 'NotificationsPage');
const HelpSupportPage = lazyPage(() => import('@/pages/HelpSupportPage'), 'HelpSupportPage');
const UpgradePage = lazyPage(() => import('@/pages/UpgradePage'), 'UpgradePage');

function Protected({ children }: { children: React.ReactNode }) {
  const initialized = useAuthStore((s) => s.initialized);
  const token = useAuthStore((s) => s.accessToken);
  const user = useAuthStore((s) => s.user);
  if (!initialized) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="space-y-3 w-64">
          <Skeleton className="h-8 w-full" />
          <Skeleton className="h-4 w-3/4" />
          <Skeleton className="h-4 w-1/2" />
        </div>
      </div>
    );
  }
  if (!token || !user) return <Navigate to="/login" replace />;
  return <>{children}</>;
}

function AdminOnly({ children }: { children: React.ReactNode }) {
  const user = useAuthStore((s) => s.user);
  if (!isOrgAdminUser(user)) {
    return <Navigate to="/products" replace />;
  }
  return <>{children}</>;
}

function PageFallback() {
  return (
    <div className="flex min-h-screen items-center justify-center">
      <div className="space-y-3 w-64">
        <Skeleton className="h-8 w-full" />
        <Skeleton className="h-4 w-3/4" />
        <Skeleton className="h-4 w-1/2" />
      </div>
    </div>
  );
}

export function AppRoutes() {
  const user = useAuthStore((s) => s.user);
  const { data: subscription } = useSubscription(Boolean(user));
  return (
    <AppErrorBoundary>
      <Suspense fallback={<PageFallback />}>
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/signup" element={<SignupPage />} />
          <Route path="/forgot-password" element={<ForgotPasswordPage />} />
          <Route path="/reset-password" element={<ResetPasswordPage />} />
          <Route path="/supplier-portal/submit" element={<SupplierPortalSubmitPage />} />
          <Route path="/quotation-portal/review" element={<QuotationPortalPage />} />
          <Route path="/returns/acknowledge" element={<ReturnAcknowledgementPage />} />
          <Route path="/supplier-delete/confirm" element={<SupplierDeleteConfirmPage />} />
          <Route path="/invite/accept" element={<InviteAcceptPage />} />
          <Route
            path="/dashboard"
            element={
              <Protected>
                <AdminOnly>
                  <DashboardPage />
                </AdminOnly>
              </Protected>
            }
          />
          <Route path="/products" element={<Protected><ProductsPage /></Protected>} />
          <Route path="/companies" element={<Protected><CompaniesPage /></Protected>} />
          <Route path="/companies/new" element={<Protected><CompaniesPage createOnly /></Protected>} />
          <Route path="/plants" element={<Protected><PlantsPage /></Protected>} />
          <Route path="/storage-locations" element={<Protected><StorageLocationsPage /></Protected>} />
          <Route path="/suppliers" element={<Protected><SuppliersPage /></Protected>} />
          <Route
            path="/rfqs"
            element={
              <Protected>
                <TrialFeatureGate subscription={subscription} feature="rfqs">
                  <RfqsPage />
                </TrialFeatureGate>
              </Protected>
            }
          />
          <Route
            path="/rfqs/:id/compare"
            element={
              <Protected>
                <TrialFeatureGate subscription={subscription} feature="rfqs">
                  <RfqComparePage />
                </TrialFeatureGate>
              </Protected>
            }
          />
          <Route
            path="/rfqs/:id"
            element={
              <Protected>
                <TrialFeatureGate subscription={subscription} feature="rfqs">
                  <RfqDetailPage />
                </TrialFeatureGate>
              </Protected>
            }
          />
          <Route
            path="/quotations"
            element={
              <Protected>
                <TrialFeatureGate subscription={subscription} feature="salesQuotations">
                  <QuotationsPage />
                </TrialFeatureGate>
              </Protected>
            }
          />
          <Route
            path="/contracts"
            element={
              <Protected>
                <TrialFeatureGate subscription={subscription} feature="contracts">
                  <ContractsPage />
                </TrialFeatureGate>
              </Protected>
            }
          />
          <Route path="/customers" element={<Protected><CustomersPage /></Protected>} />
          <Route
            path="/supplier-portal"
            element={
              <Protected>
                <TrialFeatureGate subscription={subscription} feature="supplierPortal">
                  <SupplierPortalPage />
                </TrialFeatureGate>
              </Protected>
            }
          />
          <Route
            path="/portal"
            element={
              <Protected>
                <TrialFeatureGate subscription={subscription} feature="supplierPortal">
                  <SupplierPortalPage />
                </TrialFeatureGate>
              </Protected>
            }
          />
          <Route
            path="/sales"
            element={
              <Protected>
                <TrialFeatureGate subscription={subscription} feature="salesOrders">
                  <SalesPage />
                </TrialFeatureGate>
              </Protected>
            }
          />
          <Route
            path="/sales/:id"
            element={
              <Protected>
                <TrialFeatureGate subscription={subscription} feature="salesOrders">
                  <SalesOrderDetailPage />
                </TrialFeatureGate>
              </Protected>
            }
          />
          <Route
            path="/invoices"
            element={
              <Protected>
                <TrialFeatureGate subscription={subscription} feature="invoices">
                  <InvoicesPage />
                </TrialFeatureGate>
              </Protected>
            }
          />
          <Route
            path="/returns"
            element={
              <Protected>
                <ReturnsPage />
              </Protected>
            }
          />
          <Route
            path="/payments"
            element={
              <Protected>
                <TrialFeatureGate subscription={subscription} feature="payments">
                  <PaymentsPage />
                </TrialFeatureGate>
              </Protected>
            }
          />
          <Route path="/notifications" element={<Protected><NotificationsPage /></Protected>} />
          <Route path="/warehouse" element={<Protected><WarehousePage /></Protected>} />
          <Route path="/supplier-bills" element={<Protected><SupplierBillsPage /></Protected>} />
          <Route path="/supplier-payments" element={<Protected><SupplierPaymentsPage /></Protected>} />
          <Route path="/stock-transfers" element={<Protected><StockTransfersPage /></Protected>} />
          <Route
            path="/stock-transfers/new"
            element={<Protected><StockTransfersPage createOnly /></Protected>}
          />
          <Route path="/goods-receipts" element={<Protected><GoodsReceiptPage /></Protected>} />
          <Route path="/goods-receipts/new" element={<Protected><GoodsReceiptPage createOnly /></Protected>} />
          <Route path="/goods-issues" element={<Protected><GoodsIssuePage /></Protected>} />
          <Route path="/goods-issues/new" element={<Protected><GoodsIssueCreatePage /></Protected>} />
          <Route
            path="/purchase-orders"
            element={
              <Protected>
                <TrialFeatureGate subscription={subscription} feature="purchaseOrders">
                  <PurchaseOrdersPage />
                </TrialFeatureGate>
              </Protected>
            }
          />
          <Route
            path="/purchase-orders/new"
            element={
              <Protected>
                <TrialFeatureGate subscription={subscription} feature="purchaseOrders">
                  <PurchaseOrdersPage createOnly />
                </TrialFeatureGate>
              </Protected>
            }
          />
          <Route path="/payments/new" element={<Protected><PaymentsPage createOnly /></Protected>} />
          <Route path="/plants/new" element={<Protected><PlantsPage createOnly /></Protected>} />
          <Route
            path="/reports"
            element={
              <Protected>
                <TrialFeatureGate subscription={subscription} feature="reports">
                  <ReportsPage />
                </TrialFeatureGate>
              </Protected>
            }
          />
          <Route path="/settings" element={<Protected><SettingsPage /></Protected>} />
          <Route path="/upgrade" element={<Protected><UpgradePage /></Protected>} />
          <Route path="/help" element={<Protected><HelpSupportPage /></Protected>} />
          <Route path="/profile" element={<Navigate to="/settings" replace />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Suspense>
    </AppErrorBoundary>
  );
}
