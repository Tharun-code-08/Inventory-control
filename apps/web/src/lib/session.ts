import { api, applyAccessToken, extractAuthPayload } from '@/api/client';
import { useAuthStore } from '@/store/authStore';

export async function initializeSessionFromAuthResponse(payload: unknown) {
  const authPayload = extractAuthPayload(payload);
  if (!authPayload) {
    throw new Error('Unexpected response from server');
  }

  applyAccessToken(authPayload.accessToken);
  useAuthStore.getState().setSession(authPayload.accessToken, authPayload.user);

  let currentUser = authPayload.user;

  try {
    const meResponse = await api.get('/auth/me');
    currentUser = meResponse.data.data as typeof currentUser;
    useAuthStore.getState().setUser(currentUser);
  } catch {
    useAuthStore.getState().setUser(currentUser);
  }

  return currentUser;
}
