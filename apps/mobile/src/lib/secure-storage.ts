import * as SecureStore from 'expo-secure-store';

const KEYS = {
  accessToken: 'retail_ims_access_token',
  refreshToken: 'retail_ims_refresh_token',
  user: 'retail_ims_user',
} as const;

export async function saveSession(accessToken: string, refreshToken: string, userJson: string) {
  await Promise.all([
    SecureStore.setItemAsync(KEYS.accessToken, accessToken),
    SecureStore.setItemAsync(KEYS.refreshToken, refreshToken),
    SecureStore.setItemAsync(KEYS.user, userJson),
  ]);
}

export async function loadSession(): Promise<{
  accessToken: string | null;
  refreshToken: string | null;
  userJson: string | null;
}> {
  const [accessToken, refreshToken, userJson] = await Promise.all([
    SecureStore.getItemAsync(KEYS.accessToken),
    SecureStore.getItemAsync(KEYS.refreshToken),
    SecureStore.getItemAsync(KEYS.user),
  ]);
  return { accessToken, refreshToken, userJson };
}

export async function clearSession() {
  await Promise.all([
    SecureStore.deleteItemAsync(KEYS.accessToken),
    SecureStore.deleteItemAsync(KEYS.refreshToken),
    SecureStore.deleteItemAsync(KEYS.user),
  ]);
}
