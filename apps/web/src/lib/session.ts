import { api, applyAccessToken, extractAuthPayload } from '@/api/client';
import { useAuthStore } from '@/store/authStore';
import { resetClientSessionState } from '@/lib/reset-session-state';

export async function initializeSessionFromAuthResponse(
  payload: unknown,
  queryClient?: import('@tanstack/react-query').QueryClient,
) {
  const authPayload = extractAuthPayload(payload);
  if (!authPayload) {
    throw new Error('Unexpected response from server');
  }

  // Clear cached data only when a different user signs in. A page reload by
  // the same user (bootstrap refresh) must keep it, including the product
  // categories that live only in this browser.
  const previousUserId = useAuthStore.getState().user?.id;
  if (previousUserId !== authPayload.user.id) {
    resetClientSessionState(queryClient);
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

/**
 * Re-fetch the current user from `/auth/me` and update the auth store. Use after
 * a change that affects the signed-in user's own permissions (e.g. editing their
 * role) so the sidebar nav and feature gates refresh without a re-login.
 */
export async function refreshCurrentUser() {
  try {
    const meResponse = await api.get('/auth/me');
    const currentUser = meResponse.data.data;
    if (currentUser) {
      useAuthStore.getState().setUser(currentUser);
    }
    return currentUser;
  } catch {
    return null;
  }
}
