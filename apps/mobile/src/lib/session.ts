import { applyAccessToken, extractMobileAuthPayload, api } from '@/api/client';
import { clearSession, loadSession, saveSession } from '@/lib/secure-storage';
import { useAuthStore, type AuthUser } from '@/store/authStore';
import { registerDevice } from '@/lib/device-info';

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
  } catch {
    applyAccessToken(null);
    useAuthStore.getState().clear();
    await clearSession();
  }
  useAuthStore.getState().setInitialized(true);
}

export async function loginWithCredentials(email: string, password: string): Promise<void> {
  const res = await api.post('/auth/mobile/login', { email, password });
  const auth = extractMobileAuthPayload(res.data);
  if (!auth) throw new Error('Unexpected login response');
  useAuthStore.getState().setSession(auth.accessToken, auth.refreshToken, auth.user);
  applyAccessToken(auth.accessToken);
  await saveSession(auth.accessToken, auth.refreshToken, JSON.stringify(auth.user));

  // Register device (non-blocking)
  registerDevice().catch(err => console.error('Device registration failed:', err));
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
  await clearSession();
}
