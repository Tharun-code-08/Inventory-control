// app/(app)/barcode-print/index.tsx
import React, { useState } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { generateBarcode } from '@/src/lib/barcodeGenerator';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { colors } from '@/theme';

// Sample data – in a real app this would come from your inventory API
const SAMPLE_ITEMS = [
  { id: '1', name: 'Item A', sku: 'SKU001' },
  { id: '2', name: 'Item B', sku: 'SKU002' },
  { id: '3', name: 'Item C', sku: 'SKU003' },
];

export default function BarcodePrintScreen() {
  const router = useRouter();
  const [loadingId, setLoadingId] = useState<string | null>(null);

  const handlePrint = async (item: typeof SAMPLE_ITEMS[0]) => {
    try {
      setLoadingId(item.id);
      const dataUrl = await generateBarcode(item.sku, 'code128');
      // Print as HTML with the barcode image
      await Print.printAsync({
        html: `<html><body style="margin:0;padding:0;display:flex;align-items:center;justify-content:center;background:#fff;"><img src="${dataUrl}" style="width:100%;max-width:300px;"/></body></html>`,
      });
    } catch (e) {
      console.error('Print error', e);
    } finally {
      setLoadingId(null);
    }
  };

  const handleShare = async (item: typeof SAMPLE_ITEMS[0]) => {
    try {
      setLoadingId(item.id);
      const dataUrl = await generateBarcode(item.sku, 'code128');
      // Convert base64 URI to a temporary file for sharing
      const base64 = dataUrl.split('base64,')[1];
      const filename = `${item.sku}.png`;
      const uri = `${FileSystem.documentDirectory}${filename}`;
      await FileSystem.writeAsStringAsync(uri, base64, { encoding: FileSystem.EncodingType.Base64 });
      await Sharing.shareAsync(uri);
    } catch (e) {
      console.error('Share error', e);
    } finally {
      setLoadingId(null);
    }
  };

  const renderItem = ({ item }: { item: typeof SAMPLE_ITEMS[0] }) => (
    <View style={styles.itemContainer}>
      <Text style={styles.itemText}>{item.name} ({item.sku})</Text>
      <View style={styles.actions}>
        <TouchableOpacity style={styles.button} onPress={() => handlePrint(item)} disabled={!!loadingId}>
          {loadingId === item.id ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>Print</Text>}
        </TouchableOpacity>
        <TouchableOpacity style={[styles.button, styles.shareButton]} onPress={() => handleShare(item)} disabled={!!loadingId}>
          {loadingId === item.id ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>Share</Text>}
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Barcode Label Printing</Text>
      <FlatList data={SAMPLE_ITEMS} renderItem={renderItem} keyExtractor={item => item.id} contentContainerStyle={styles.list} />
      <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
        <Text style={styles.backText}>← Back</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bg,
    padding: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: '600',
    color: '#fff',
    marginBottom: 12,
    fontFamily: 'Inter',
  },
  list: {
    paddingBottom: 80,
  },
  itemContainer: {
    backgroundColor: '#1e1e1e',
    borderRadius: 8,
    padding: 12,
    marginBottom: 10,
    flexDirection: 'column',
  },
  itemText: {
    color: '#fff',
    fontSize: 16,
    marginBottom: 8,
    fontFamily: 'Inter',
  },
  actions: {
    flexDirection: 'row',
    justifyContent: 'flex-start',
    gap: 8,
  },
  button: {
    backgroundColor: colors.accent,
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 6,
  },
  shareButton: {
    backgroundColor: colors.success,
  },
  buttonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
    fontFamily: 'Inter',
  },
  backButton: {
    position: 'absolute',
    bottom: 20,
    left: 20,
  },
  backText: {
    color: colors.accent,
    fontSize: 16,
    fontFamily: 'Inter',
  },
});
