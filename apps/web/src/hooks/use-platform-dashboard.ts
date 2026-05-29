import { useQuery } from '@tanstack/react-query';
import { api } from '@/api/client';

export type PlatformDashboard = {
  kpis: {
    totalTrials: number;
    activeTrials: number;
    expiringTrials: number;
    paidSubscribers: number;
    conversions30d: number;
    conversionRate30d: number;
    mrrInr: number;
    arrInr: number;
    churnExpired: number;
  };
  upcomingRenewals: Array<{
    companyId: string;
    companyName: string;
    plan: string;
    renewsAt: string | null;
  }>;
  failedPayments: Array<{
    id: string;
    companyName: string;
    plan: string;
    amountPaise: number;
    failureReason: string | null;
    renewalAttempt: number;
    createdAt: string;
  }>;
  emailAnalytics: Array<{
    templateId: string;
    sent: number;
    clicks: number;
    opens: number;
  }>;
  lifecycleStages: Array<{
    companyName: string;
    stage: string;
    trialProgressPct: number;
    snapshotDate: string;
  }>;
  recentSubscribers: Array<{
    id: string;
    companyName: string;
    plan: string;
    status: string;
    createdAt: string;
  }>;
};

async function fetchPlatformDashboard(): Promise<PlatformDashboard> {
  const res = await api.get('/platform/subscriptions/dashboard');
  return res.data?.data ?? res.data;
}

export function usePlatformDashboard() {
  return useQuery({
    queryKey: ['platform', 'subscriptions', 'dashboard'],
    queryFn: fetchPlatformDashboard,
    retry: false,
  });
}
