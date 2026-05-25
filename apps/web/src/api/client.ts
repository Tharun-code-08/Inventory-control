import { AxiosHeaders, type InternalAxiosRequestConfig } from 'axios';
import axios from 'axios';
import { readBrowserCookie } from '@/lib/browser-cookies';
import { CSRF_COOKIE_NAME } from '@/lib/cookie-consent';
import { useAuthStore, type AuthUser } from '@/store/authStore';

const CSRF_HEADER_NAME = 'x-csrf-token';

function apiBaseUrl(): string {
  const configured = import.meta.env.VITE_API_URL?.trim();
  if (!configured) {
    return '/api/v1';
  }
  const origin = configured.replace(/\/$/, '');
  return `${origin}/api/v1`;
}

function requestHadAuthorization(config: InternalAxiosRequestConfig | undefined): boolean {
  if (!config?.headers) return false;
  const h = config.headers;
  const v =
    typeof (h as { get?: (k: string) => unknown }).get === 'function'
      ? (h as { get: (k: string) => unknown }).get('Authorization')
      : (h as { Authorization?: string }).Authorization;
  return typeof v === 'string' && v.length > 0;
}

function isPublicAuthEndpoint(config: InternalAxiosRequestConfig | undefined): boolean {
  const path = `${config?.baseURL ?? ''}${config?.url ?? ''}`;
  return path.includes('/auth/login') || path.includes('/auth/refresh');
}

type AuthEnvelope = {
  data?: {
    accessToken?: string;
    user?: AuthUser;
  };
  accessToken?: string;
  user?: AuthUser;
};

export const api = axios.create({
  baseURL: apiBaseUrl(),
  withCredentials: true,
});

api.interceptors.request.use((config) => {
  const requestId =
    typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
      ? crypto.randomUUID()
      : `req-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
  config.headers = AxiosHeaders.from(config.headers ?? {});
  config.headers.set('x-request-id', requestId);
  const csrfToken = readBrowserCookie(CSRF_COOKIE_NAME);
  if (csrfToken) {
    config.headers.set(CSRF_HEADER_NAME, csrfToken);
  }
  return config;
});

export function applyAccessToken(accessToken: string | null) {
  if (accessToken) {
    api.defaults.headers.common.Authorization = `Bearer ${accessToken}`;
    return;
  }
  delete api.defaults.headers.common.Authorization;
}

export function extractAuthPayload(payload: unknown): { accessToken: string; user: AuthUser } | null {
  const envelope = payload as AuthEnvelope;
  const data = envelope?.data ?? envelope;
  if (!data || typeof data.accessToken !== 'string' || !data.user) {
    return null;
  }
  return {
    accessToken: data.accessToken,
    user: data.user,
  };
}

function setRequestAuthorization(config: InternalAxiosRequestConfig | undefined, accessToken: string) {
  if (!config) return;
  const value = `Bearer ${accessToken}`;
  const headers = config.headers as
    | (InternalAxiosRequestConfig['headers'] & {
        set?: (key: string, value: string) => void;
        Authorization?: string;
      })
    | undefined;

  if (headers && typeof headers.set === 'function') {
    headers.set('Authorization', value);
    return;
  }

  config.headers = AxiosHeaders.from(config.headers ?? {});
  config.headers.set('Authorization', value);
}

function gatewayErrorMessage(status: number | undefined): string | undefined {
  if (status === 502) {
    return 'Backend API is unavailable (502). Start the API with npm run dev:api (listens on port 3000) and keep your Cloudflare tunnel running.';
  }
  if (status === 504) {
    return 'Request timed out (504). Email with PDF can take up to a minute—try again in a moment.';
  }
  return undefined;
}

api.interceptors.response.use(
  (res) => res,
  async (error) => {
    const status = error.response?.status;
    const gatewayMsg = gatewayErrorMessage(status);
    if (gatewayMsg) {
      error.message = gatewayMsg;
    }
    const original = error.config as InternalAxiosRequestConfig & { __isRetry?: boolean };

    if (status === 401 && !original?.__isRetry && requestHadAuthorization(original) && !isPublicAuthEndpoint(original)) {
      original.__isRetry = true;
      try {
        const refreshResponse = await api.post('/auth/refresh');
        const refreshed = extractAuthPayload(refreshResponse.data);
        if (!refreshed) {
          throw new Error('Unexpected refresh response');
        }
        applyAccessToken(refreshed.accessToken);
        useAuthStore.getState().setSession(refreshed.accessToken, refreshed.user);
        setRequestAuthorization(original, refreshed.accessToken);
        return api.request(original);
      } catch {
        applyAccessToken(null);
        useAuthStore.getState().clear();
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  },
);
