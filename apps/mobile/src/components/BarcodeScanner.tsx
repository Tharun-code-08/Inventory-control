import { useEffect, useRef, useState } from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { Ionicons } from '@expo/vector-icons';
import { Button } from '@/components/ui';
import { colors, spacing, typography } from '@/theme';

const SCAN_COOLDOWN_MS = 1500;

type Props = {
  visible: boolean;
  onClose: () => void;
  /** Called with the decoded barcode value. Return false to keep scanning (e.g. code not found). */
  onScanned: (code: string) => void | boolean;
  title?: string;
  /** Keep the scanner open after a successful scan (for scanning many items in a row). */
  continuous?: boolean;
};

export function BarcodeScanner({ visible, onClose, onScanned, title = 'Scan barcode', continuous = false }: Props) {
  const [permission, requestPermission] = useCameraPermissions();
  const [lastCode, setLastCode] = useState<string | null>(null);
  const lastScanAt = useRef(0);

  useEffect(() => {
    if (visible && permission && !permission.granted && permission.canAskAgain) {
      requestPermission();
    }
  }, [visible, permission, requestPermission]);

  useEffect(() => {
    if (!visible) setLastCode(null);
  }, [visible]);

  const handleScan = ({ data }: { data: string }) => {
    const now = Date.now();
    if (!data || now - lastScanAt.current < SCAN_COOLDOWN_MS) return;
    lastScanAt.current = now;
    setLastCode(data);
    const keepOpen = onScanned(data);
    if (!continuous && keepOpen !== false) onClose();
  };

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>{title}</Text>
          <Pressable onPress={onClose} hitSlop={12}>
            <Ionicons name="close" size={28} color="#fff" />
          </Pressable>
        </View>

        {permission?.granted ? (
          <CameraView
            style={styles.camera}
            facing="back"
            barcodeScannerSettings={{
              barcodeTypes: ['code128', 'code39', 'ean13', 'ean8', 'upc_a', 'upc_e', 'qr', 'itf14'],
            }}
            onBarcodeScanned={handleScan}
          >
            <View style={styles.overlay}>
              <View style={styles.frame} />
              <Text style={styles.hint}>Point the camera at a barcode</Text>
              {continuous && lastCode ? (
                <View style={styles.lastScan}>
                  <Ionicons name="checkmark-circle" size={18} color={colors.success} />
                  <Text style={styles.lastScanText}>{lastCode}</Text>
                </View>
              ) : null}
            </View>
          </CameraView>
        ) : (
          <View style={styles.permission}>
            <Ionicons name="camera-outline" size={48} color="#fff" />
            <Text style={styles.permissionText}>
              {permission?.canAskAgain === false
                ? 'Camera access was denied. Enable it in device settings to scan barcodes.'
                : 'Camera permission is required to scan barcodes.'}
            </Text>
            {permission?.canAskAgain !== false ? (
              <Button label="Grant camera access" onPress={() => requestPermission()} />
            ) : null}
          </View>
        )}

        {continuous ? (
          <View style={styles.footer}>
            <Button label="Done scanning" onPress={onClose} />
          </View>
        ) : null}
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.base,
    paddingTop: spacing.xl,
    paddingBottom: spacing.md,
  },
  title: {
    color: '#fff',
    fontSize: typography.size.lg,
    fontWeight: typography.weight.semibold as '600',
  },
  camera: { flex: 1 },
  overlay: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  frame: {
    width: 260,
    height: 160,
    borderWidth: 2,
    borderColor: '#fff',
    borderRadius: 12,
    backgroundColor: 'transparent',
  },
  hint: { color: '#fff', marginTop: spacing.md, fontSize: typography.size.md },
  lastScan: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginTop: spacing.md,
    backgroundColor: 'rgba(0,0,0,0.6)',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: 8,
  },
  lastScanText: { color: '#fff', fontSize: typography.size.sm },
  permission: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl,
    gap: spacing.md,
  },
  permissionText: { color: '#fff', textAlign: 'center', fontSize: typography.size.md },
  footer: { padding: spacing.base },
});
