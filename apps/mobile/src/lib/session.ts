import { applyAccessToken, extractMobileAuthPayload, api } from '@/api/client';
import { clearSession, loadSession, saveSession } from '@/lib/secure-storage';
import { useAuthStore, type AuthUser } from '@/store/authStore';
import { useNotificationStore } from '@/store/notificationStore';
import { clearQueryCache } from '@/lib/query-client';

export async function bootstrapSession(): Promise<void> {
  const { accessToken, refreshToken, userJson } = await loadSession();
  if (!accessToken || !refreshToken || !userJson) {
    useAuthStore.getState().setInitialized(true);
    return;
  }
  let user: AuthUser;
  try {
    user = JSON.parse(userJson) as AuthUser;
  } catch {
    await clearSession();
    useAuthStore.getState().setInitialized(true);
    return;
  }
  useAuthStore.getState().setSession(accessToken, refreshToken, user);
  applyAccessToken(accessToken);
  try {
    const res = await api.post('/auth/mobile/refresh', { refreshToken });
    const refreshed = extractMobileAuthPayload(res.data);
    if (refreshed) {
      useAuthStore.getState().setSession(refreshed.accessToken, refreshed.refreshToken, refreshed.user);
      applyAccessToken(refreshed.accessToken);
      await saveSession(
        refreshed.accessToken,
        refreshed.refreshToken,
        JSON.stringify(refreshed.user),
      );
    }
  } catch (err) {
    // Offline or a server error keeps the stored session; only a rejected
    // refresh token signs the user out.
    const status = (err as { response?: { status?: number } }).response?.status;
    if (status === 401 || status === 403) {
      applyAccessToken(null);
      useAuthStore.getState().clear();
      useNotificationStore.getState().clearNotifications();
      await clearQueryCache();
      await clearSession();
    }
  }
  useAuthStore.getState().setInitialized(true);
}

export async function loginWithCredentials(email: string, password: string, companyCode?: string): Promise<void> {
  const res = await api.post('/auth/mobile/login', { email, password, companyCode });
  const auth = extractMobileAuthPayload(res.data);
  if (!auth) throw new Error('Unexpected login response');
  useAuthStore.getState().setSession(auth.accessToken, auth.refreshToken, auth.user);
  applyAccessToken(auth.accessToken);
  await saveSession(auth.accessToken, auth.refreshToken, JSON.stringify(auth.user));
  // Device + push registration runs from useNotificationSetup once the
  // authenticated app shell mounts (it needs a push token).
}

export async function logoutSession(): Promise<void> {
  const { refreshToken, accessToken } = useAuthStore.getState();
  try {
    if (accessToken && refreshToken) {
      await api.post('/auth/mobile/logout', { refreshToken });
    }
  } catch {
    // ignore revoke errors
  }
  applyAccessToken(null);
  useAuthStore.getState().clear();
  // Cached company data and notifications belong to the user signing out.
  useNotificationStore.getState().clearNotifications();
  await clearQueryCache();
  await clearSession();
}
