import { cacheDirectory, downloadAsync } from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import { api } from '@/api/client';

export async function downloadAndSharePdf(url: string, filename: string): Promise<void> {
  const token = (await import('@/store/authStore')).useAuthStore.getState().accessToken;
  const baseURL = api.defaults.baseURL ?? '';
  const fullUrl = url.startsWith('http') ? url : `${baseURL}${url}`;

  const fileUri = `${cacheDirectory}${filename}`;

  const result = await downloadAsync(fullUrl, fileUri, {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (result.status !== 200) {
    throw new Error(`PDF download failed (${result.status})`);
  }

  if (!(await Sharing.isAvailableAsync())) {
    throw new Error('Sharing is not available on this device');
  }

  await Sharing.shareAsync(fileUri, { mimeType: 'application/pdf', UTI: 'com.adobe.pdf' });
}
