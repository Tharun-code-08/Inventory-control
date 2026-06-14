import { AppLayout } from '@/components/AppLayout';
import { ExecutiveDashboard } from '@/components/dashboard';
import { useAuthStore } from '@/store/authStore';
import { productListShopId } from '@/lib/shop-scope';

/**
 * Month 1 — Executive Dashboard.
 *
 * The default landing page after login for org admins. Renders the four
 * executive cards (Financial, Inventory, Attention, Recommendations) inside the
 * app shell so navigation stays available.
 */
export function DashboardPage() {
  const user = useAuthStore((s) => s.user);
  // Default to the user's full scope; pass undefined for "all plants".
  const shopId = productListShopId(user, 'all');

  return (
    <AppLayout active="Dashboard">
      <ExecutiveDashboard shopId={shopId} />
    </AppLayout>
  );
}

export default DashboardPage;
