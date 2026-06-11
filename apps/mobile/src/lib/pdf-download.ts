import { File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { api } from '@/api/client';
import { useAuthStore } from '@/store/authStore';

export async function downloadAndSharePdf(url: string, filename: string): Promise<void> {
  const token = useAuthStore.getState().accessToken;
  const baseURL = api.defaults.baseURL ?? '';
  const fullUrl = url.startsWith('http') ? url : `${baseURL}${url}`;

  const destination = new File(Paths.cache, filename);
  if (destination.exists) {
    destination.delete();
  }

  const file = await File.downloadFileAsync(fullUrl, destination, {
    headers: token ? { Authorization: `Bearer ${token}` } : undefined,
  });

  if (!(await Sharing.isAvailableAsync())) {
    throw new Error('Sharing is not available on this device');
  }

  await Sharing.shareAsync(file.uri, { mimeType: 'application/pdf', UTI: 'com.adobe.pdf' });
}
