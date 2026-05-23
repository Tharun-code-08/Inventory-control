import axios, { type InternalAxiosRequestConfig } from 'axios';
import Constants from 'expo-constants';
import { useAuthStore, type AuthUser } from '@/store/authStore';
import { clearSession, saveSession } from '@/lib/secure-storage';

export function getApiOrigin(): string {
  const configured =
    process.env.EXPO_PUBLIC_API_URL?.trim() ||
    (Constants.expoConfig?.extra as { apiUrl?: string } | undefined)?.apiUrl?.trim();
  if (!configured) return 'http://localhost:3000';
  return configured.replace(/\/$/, '');
}

function apiBaseUrl(): string {
  return `${getApiOrigin()}/api/v1`;
}

type AuthEnvelope = {
  data?: { accessToken?: string; refreshToken?: string; user?: AuthUser };
  accessToken?: string;
  refreshToken?: string;
  user?: AuthUser;
};

export function extractMobileAuthPayload(
  payload: unknown,
): { accessToken: string; refreshToken: string; user: AuthUser } | null {
  const envelope = payload as AuthEnvelope;
  const data = envelope?.data ?? envelope;
  if (
    !data ||
    typeof data.accessToken !== 'string' ||
    typeof data.refreshToken !== 'string' ||
    !data.user
  ) {
    return null;
  }
  return {
    accessToken: data.accessToken,
    refreshToken: data.refreshToken,
    user: data.user,
  };
}

export function getApiBaseUrl(): string {
  return apiBaseUrl();
}

/** Quick check that the phone can reach the API host (no auth). */
export async function testApiConnection(): Promise<{ ok: boolean; message: string }> {
  const origin = getApiOrigin();
  try {
    const res = await axios.get(`${origin}/api/v1/health`, { timeout: 8000 });
    return { ok: res.status >= 200 && res.status < 400, message: `OK (${res.status}) — ${origin}` };
  } catch (err) {
    const ax = err as { message?: string; code?: string };
    return {
      ok: false,
      message: `${ax.code ?? 'ERROR'}: ${ax.message ?? 'failed'} — ${origin}`,
    };
  }
}

export const api = axios.create({
  baseURL: apiBaseUrl(),
  timeout: 30_000,
});

let refreshPromise: Promise<string | null> | null = null;

export function applyAccessToken(accessToken: string | null) {
  if (accessToken) {
    api.defaults.headers.common.Authorization = `Bearer ${accessToken}`;
    return;
  }
  delete api.defaults.headers.common.Authorization;
}

function requestHadAuthorization(config: InternalAxiosRequestConfig | undefined): boolean {
  const h = config?.headers;
  if (!h) return false;
  const auth = (h as { Authorization?: string }).Authorization;
  return typeof auth === 'string' && auth.length > 0;
}

function isPublicAuthEndpoint(config: InternalAxiosRequestConfig | undefined): boolean {
  const path = `${config?.baseURL ?? ''}${config?.url ?? ''}`;
  return path.includes('/auth/mobile/login') || path.includes('/auth/mobile/refresh');
}

function setRequestAuthorization(config: InternalAxiosRequestConfig | undefined, accessToken: string) {
  if (!config) return;
  config.headers = config.headers ?? {};
  (config.headers as { Authorization?: string }).Authorization = `Bearer ${accessToken}`;
}

async function refreshAccessToken(): Promise<string | null> {
  const refreshToken = useAuthStore.getState().refreshToken;
  if (!refreshToken) return null;
  const res = await api.post('/auth/mobile/refresh', { refreshToken });
  const refreshed = extractMobileAuthPayload(res.data);
  if (!refreshed) return null;
  applyAccessToken(refreshed.accessToken);
  useAuthStore.getState().setSession(refreshed.accessToken, refreshed.refreshToken, refreshed.user);
  await saveSession(
    refreshed.accessToken,
    refreshed.refreshToken,
    JSON.stringify(refreshed.user),
  );
  return refreshed.accessToken;
}

api.interceptors.request.use((config) => {
  const requestId = `req-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
  config.headers = config.headers ?? {};
  (config.headers as Record<string, string>)['x-request-id'] = requestId;
  const token = useAuthStore.getState().accessToken;
  if (token) {
    (config.headers as Record<string, string>).Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (res) => res,
  async (error) => {
    const status = error.response?.status;
    const original = error.config as InternalAxiosRequestConfig & { __isRetry?: boolean };

    if (
      status === 401 &&
      !original?.__isRetry &&
      requestHadAuthorization(original) &&
      !isPublicAuthEndpoint(original)
    ) {
      original.__isRetry = true;
      try {
        if (!refreshPromise) {
          refreshPromise = refreshAccessToken().finally(() => {
            refreshPromise = null;
          });
        }
        const newToken = await refreshPromise;
        if (!newToken) throw new Error('Refresh failed');
        setRequestAuthorization(original, newToken);
        return api.request(original);
      } catch {
        applyAccessToken(null);
        useAuthStore.getState().clear();
        await clearSession();
      }
    }
    return Promise.reject(error);
  },
);
