import { Suspense } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import { useAuthStore } from '@/store/authStore';
import { Skeleton } from '@/components/ui/skeleton';
import { lazyPage } from '@/lib/lazy-page';
import { AppErrorBoundary } from '@/components/AppErrorBoundary';
const HomePage = lazyPage(() => import('@/pages/HomePage'), 'HomePage');
const LoginPage = lazyPage(() => import('@/pages/LoginPage'), 'LoginPage');
const SignupPage = lazyPage(() => import('@/pages/SignupPage'), 'SignupPage');
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
const NotificationsPage = lazyPage(() => import('@/pages/NotificationsPage'), 'NotificationsPage');
const HelpSupportPage = lazyPage(() => import('@/pages/HelpSupportPage'), 'HelpSupportPage');

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
  const role = useAuthStore((s) => s.user?.role);
  if (role !== 'ADMIN') {
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
  return (
    <AppErrorBoundary>
      <Suspense fallback={<PageFallback />}>
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/signup" element={<SignupPage />} />
          <Route path="/supplier-portal/submit" element={<SupplierPortalSubmitPage />} />
          <Route path="/quotation-portal/review" element={<QuotationPortalPage />} />
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
          <Route path="/rfqs" element={<Protected><RfqsPage /></Protected>} />
          <Route path="/rfqs/:id/compare" element={<Protected><RfqComparePage /></Protected>} />
          <Route path="/rfqs/:id" element={<Protected><RfqDetailPage /></Protected>} />
          <Route path="/quotations" element={<Protected><QuotationsPage /></Protected>} />
          <Route path="/contracts" element={<Protected><ContractsPage /></Protected>} />
          <Route path="/customers" element={<Protected><CustomersPage /></Protected>} />
          <Route path="/supplier-portal" element={<Protected><SupplierPortalPage /></Protected>} />
          <Route path="/portal" element={<Protected><SupplierPortalPage /></Protected>} />
          <Route path="/sales" element={<Protected><SalesPage /></Protected>} />
          <Route path="/sales/:id" element={<Protected><SalesOrderDetailPage /></Protected>} />
          <Route path="/invoices" element={<Protected><InvoicesPage /></Protected>} />
          <Route path="/payments" element={<Protected><PaymentsPage /></Protected>} />
          <Route path="/notifications" element={<Protected><NotificationsPage /></Protected>} />
          <Route path="/warehouse" element={<Protected><WarehousePage /></Protected>} />
          <Route path="/goods-receipts" element={<Protected><GoodsReceiptPage /></Protected>} />
          <Route path="/goods-receipts/new" element={<Protected><GoodsReceiptPage createOnly /></Protected>} />
          <Route path="/goods-issues" element={<Protected><GoodsIssuePage /></Protected>} />
          <Route path="/goods-issues/new" element={<Protected><GoodsIssueCreatePage /></Protected>} />
          <Route path="/purchase-orders" element={<Protected><PurchaseOrdersPage /></Protected>} />
          <Route path="/purchase-orders/new" element={<Protected><PurchaseOrdersPage createOnly /></Protected>} />
          <Route path="/payments/new" element={<Protected><PaymentsPage createOnly /></Protected>} />
          <Route path="/plants/new" element={<Protected><PlantsPage createOnly /></Protected>} />
          <Route path="/reports" element={<Protected><ReportsPage /></Protected>} />
          <Route path="/settings" element={<Protected><SettingsPage /></Protected>} />
          <Route path="/help" element={<Protected><HelpSupportPage /></Protected>} />
          <Route path="/profile" element={<Navigate to="/settings" replace />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Suspense>
    </AppErrorBoundary>
  );
}
