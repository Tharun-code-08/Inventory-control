import { useMemo } from 'react';
import { matchPath, useLocation } from 'react-router-dom';
import { useAuthStore, type AuthUser } from '@/store/authStore';
import { isOrgAdminUser } from '@/lib/roles';
import { useRfq } from '@/hooks/use-rfqs';
import { useSalesOrder } from '@/hooks/use-sales-orders';
import { breadcrumbRoutes, type BreadcrumbLabelMap } from '@/lib/breadcrumbs';

type BreadcrumbResult = {
  items: { label: string; href?: string }[];
  subtitle?: string;
};

function resolveHomeHref(user: AuthUser | null): string {
  if (isOrgAdminUser(user)) return '/dashboard';
  return '/products';
}

export function useBreadcrumbs(): BreadcrumbResult {
  const location = useLocation();
  const user = useAuthStore((s) => s.user);
  const homeHref = resolveHomeHref(user);

  const rfqDetailMatch =
    matchPath({ path: '/rfqs/:id/compare', end: true }, location.pathname) ??
    matchPath({ path: '/rfqs/:id', end: true }, location.pathname);
  const rfqId = rfqDetailMatch?.params?.id;
  const resolvedRfqId = rfqId && rfqId !== 'new' ? rfqId : undefined;
  const rfqQuery = useRfq(resolvedRfqId);

  const salesMatch = matchPath({ path: '/sales/:id', end: true }, location.pathname);
  const salesId = salesMatch?.params?.id;
  const salesQuery = useSalesOrder(salesId ?? '', Boolean(salesId && salesId !== 'new'));

  const labels: BreadcrumbLabelMap = useMemo(
    () => ({
      rfqNumber: rfqQuery.data?.rfqNumber,
      salesOrderNumber: salesQuery.data?.soNumber,
    }),
    [rfqQuery.data?.rfqNumber, salesQuery.data?.soNumber],
  );

  return useMemo(() => {
    const searchParams = new URLSearchParams(location.search);
    for (const route of breadcrumbRoutes) {
      const match = matchPath({ path: route.path, end: true }, location.pathname);
      if (!match) continue;
      const ctx = { homeHref, params: match.params, searchParams, labels };
      return {
        items: route.buildItems(ctx),
        subtitle: route.subtitle ? route.subtitle(ctx) : undefined,
      };
    }
    return { items: [], subtitle: undefined };
  }, [homeHref, labels, location.pathname, location.search]);
}
