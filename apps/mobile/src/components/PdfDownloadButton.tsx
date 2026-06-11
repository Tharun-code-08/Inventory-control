import { useState } from 'react';
import { Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Button } from './ui';
import { downloadAndSharePdf } from '@/lib/pdf-download';

export function PdfDownloadButton({
  url,
  filename,
  label = 'Download PDF',
}: {
  url: string;
  filename: string;
  label?: string;
}) {
  const [loading, setLoading] = useState(false);

  async function onPress() {
    setLoading(true);
    try {
      await downloadAndSharePdf(url, filename);
    } catch (err) {
      Alert.alert('PDF Error', err instanceof Error ? err.message : 'Could not download PDF.');
    } finally {
      setLoading(false);
    }
  }

  return <Button label={label} variant="secondary" onPress={onPress} loading={loading} />;
}
