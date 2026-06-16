import type { AxiosError } from 'axios';
import { getApiOrigin } from '@/api/client';

type ApiErrorBody = {
  error?: { message?: string };
  message?: string;
};

export function getApiErrorMessage(error: unknown, fallback = 'Something went wrong'): string {
  if (!error || typeof error !== 'object') return fallback;
  const ax = error as AxiosError<ApiErrorBody>;

  if (!ax.response && (ax.code === 'ERR_NETWORK' || ax.message === 'Network Error')) {
    const origin = getApiOrigin();
    const hint =
      origin.includes('localhost') || origin.includes('127.0.0.1')
        ? ' On a physical phone, set EXPO_PUBLIC_API_URL in apps/mobile/.env to your PC LAN IP (e.g. http://192.168.x.x:3000), not localhost.'
        : ` Trying ${origin}/api/v1 — ensure npm run dev:api is running and Windows Firewall allows port 3000.`;
    return `Cannot reach the API.${hint}`;
  }

  const data = ax.response?.data;
  if (data?.error?.message) return data.error.message;
  if (typeof data?.message === 'string') return data.message;
  if (ax.message) return ax.message;
  return fallback;
}
