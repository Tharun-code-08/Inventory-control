import { lazy, Suspense } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import { useAuthStore } from '@/store/authStore';
import { Skeleton } from '@/components/ui/skeleton';
import { HomePage } from '@/pages/HomePage';

const LoginPage = lazy(() => import('@/pages/LoginPage').then((m) => ({ default: m.LoginPage })));
const DashboardPage = lazy(() => import('@/pages/DashboardPage').then((m) => ({ default: m.DashboardPage })));
const ProductsPage = lazy(() => import('@/pages/ProductsPage').then((m) => ({ default: m.ProductsPage })));
const GoodsReceiptPage = lazy(() => import('@/pages/GoodsReceiptPage').then((m) => ({ default: m.GoodsReceiptPage })));
const GoodsIssuePage = lazy(() => import('@/pages/GoodsIssuePage').then((m) => ({ default: m.GoodsIssuePage })));
const PurchaseOrdersPage = lazy(() => import('@/pages/PurchaseOrdersPage').then((m) => ({ default: m.PurchaseOrdersPage })));
const ReportsPage = lazy(() => import('@/pages/ReportsPage').then((m) => ({ default: m.ReportsPage })));
const SettingsPage = lazy(() => import('@/pages/SettingsPage').then((m) => ({ default: m.SettingsPage })));
const CompaniesPage = lazy(() => import('@/pages/CompaniesPage').then((m) => ({ default: m.CompaniesPage })));
const PlantsPage = lazy(() => import('@/pages/PlantsPage').then((m) => ({ default: m.PlantsPage })));
const StorageLocationsPage = lazy(() => import('@/pages/StorageLocationsPage').then((m) => ({ default: m.StorageLocationsPage })));
const SuppliersPage = lazy(() => import('@/pages/SuppliersPage').then((m) => ({ default: m.SuppliersPage })));
const RfqsPage = lazy(() => import('@/pages/RfqsPage').then((m) => ({ default: m.RfqsPage })));
const QuotationsPage = lazy(() => import('@/pages/QuotationsPage').then((m) => ({ default: m.QuotationsPage })));
const ContractsPage = lazy(() => import('@/pages/ContractsPage').then((m) => ({ default: m.ContractsPage })));
const CustomersPage = lazy(() => import('@/pages/CustomersPage').then((m) => ({ default: m.CustomersPage })));
const SupplierPortalPage = lazy(() => import('@/pages/SupplierPortalPage').then((m) => ({ default: m.SupplierPortalPage })));
const SalesPage = lazy(() => import('@/pages/SalesPage').then((m) => ({ default: m.SalesPage })));
const WarehousePage = lazy(() => import('@/pages/WarehousePage').then((m) => ({ default: m.WarehousePage })));
const InvoicesPage = lazy(() => import('@/pages/InvoicesPage').then((m) => ({ default: m.InvoicesPage })));
const PaymentsPage = lazy(() => import('@/pages/PaymentsPage').then((m) => ({ default: m.PaymentsPage })));
const NotificationsPage = lazy(() => import('@/pages/NotificationsPage').then((m) => ({ default: m.NotificationsPage })));

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
    <Suspense fallback={<PageFallback />}>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route
          path="/dashboard"
          element={
            <Protected>
              {useAuthStore.getState().user?.role === 'ADMIN' ? (
                <DashboardPage />
              ) : (
                <Navigate to="/products" replace />
              )}
            </Protected>
          }
        />
        <Route path="/products" element={<Protected><ProductsPage /></Protected>} />
        <Route path="/companies" element={<Protected><CompaniesPage /></Protected>} />
        <Route path="/plants" element={<Protected><PlantsPage /></Protected>} />
        <Route path="/storage-locations" element={<Protected><StorageLocationsPage /></Protected>} />
        <Route path="/suppliers" element={<Protected><SuppliersPage /></Protected>} />
        <Route path="/rfqs" element={<Protected><RfqsPage /></Protected>} />
        <Route path="/quotations" element={<Protected><QuotationsPage /></Protected>} />
        <Route path="/contracts" element={<Protected><ContractsPage /></Protected>} />
        <Route path="/customers" element={<Protected><CustomersPage /></Protected>} />
        <Route path="/supplier-portal" element={<Protected><SupplierPortalPage /></Protected>} />
        <Route path="/sales" element={<Protected><SalesPage /></Protected>} />
        <Route path="/invoices" element={<Protected><InvoicesPage /></Protected>} />
        <Route path="/payments" element={<Protected><PaymentsPage /></Protected>} />
        <Route path="/notifications" element={<Protected><NotificationsPage /></Protected>} />
        <Route path="/warehouse" element={<Protected><WarehousePage /></Protected>} />
        <Route path="/goods-receipts" element={<Protected><GoodsReceiptPage /></Protected>} />
        <Route path="/goods-issues" element={<Protected><GoodsIssuePage /></Protected>} />
        <Route path="/purchase-orders" element={<Protected><PurchaseOrdersPage /></Protected>} />
        <Route path="/purchase-orders/new" element={<Protected><PurchaseOrdersPage /></Protected>} />
        <Route path="/reports" element={<Protected><ReportsPage /></Protected>} />
        <Route path="/settings" element={<Protected><SettingsPage /></Protected>} />
        <Route path="/profile" element={<Navigate to="/settings" replace />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Suspense>
  );
}
