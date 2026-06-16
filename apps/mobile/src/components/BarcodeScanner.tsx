import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { Ionicons } from '@expo/vector-icons';
import { Button } from '@/components/ui';
import { colors, spacing, typography } from '@/theme';

/** Same code scanned again within this window is ignored (camera re-fires + accidental re-aim). */
const PER_CODE_COOLDOWN_MS = 2500;
/** Minimum gap between any two accepted scans, after processing finishes. */
const SCAN_LOCK_TAIL_MS = 600;

type Props = {
  visible: boolean;
  onClose: () => void;
  /**
   * Called once per accepted scan. May be async — the scanner stays locked
   * (with a "Processing…" indicator) until it settles. Return false to keep
   * scanning (e.g. code not found), anything else closes unless `continuous`.
   */
  onScanned: (code: string) => void | boolean | Promise<void | boolean>;
  title?: string;
  /** Keep the scanner open after a successful scan (for scanning many items in a row). */
  continuous?: boolean;
  /** Inline status message shown inside the scanner overlay after a scan. */
  statusMessage?: string | null;
  /** Tone for the status message. */
  statusTone?: 'success' | 'error' | 'info';
};

export function BarcodeScanner({
  visible,
  onClose,
  onScanned,
  title = 'Scan barcode',
  continuous = false,
  statusMessage,
  statusTone = 'info',
}: Props) {
  const [permission, requestPermission] = useCameraPermissions();
  const [processing, setProcessing] = useState(false);
  const [lastCode, setLastCode] = useState<string | null>(null);
  const lockedRef = useRef(false);
  const recentScans = useRef(new Map<string, number>());

  useEffect(() => {
    if (visible && permission && !permission.granted && permission.canAskAgain) {
      requestPermission();
    }
  }, [visible, permission, requestPermission]);

  useEffect(() => {
    if (!visible) {
      setLastCode(null);
      setProcessing(false);
      lockedRef.current = false;
      recentScans.current.clear();
    }
  }, [visible]);

  const handleScan = async ({ data }: { data: string }) => {
    if (!data || lockedRef.current) return;

    const now = Date.now();
    const lastSeen = recentScans.current.get(data);
    if (lastSeen !== undefined && now - lastSeen < PER_CODE_COOLDOWN_MS) return;
    recentScans.current.set(data, now);

    lockedRef.current = true;
    setProcessing(true);
    setLastCode(data);
    try {
      const keepOpen = await onScanned(data);
      if (!continuous && keepOpen !== false) {
        onClose();
        return;
      }
    } finally {
      setProcessing(false);
      setTimeout(() => {
        lockedRef.current = false;
      }, SCAN_LOCK_TAIL_MS);
    }
  };

  const statusBg =
    statusTone === 'success'
      ? 'rgba(22,163,74,0.85)'
      : statusTone === 'error'
        ? 'rgba(220,38,38,0.85)'
        : 'rgba(0,0,0,0.65)';

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
            active={visible}
            barcodeScannerSettings={{
              barcodeTypes: ['code128', 'code39', 'ean13', 'ean8', 'upc_a', 'upc_e', 'qr', 'itf14', 'pdf417', 'datamatrix', 'aztec'],
            }}
            onBarcodeScanned={handleScan}
          >
            <View style={styles.overlay}>
              <View style={[styles.frame, processing && styles.frameBusy]} />

              {processing ? (
                <View style={styles.statusRow}>
                  <ActivityIndicator color="#fff" size="small" />
                  <Text style={styles.hint}>Processing…</Text>
                </View>
              ) : statusMessage ? (
                <View style={[styles.inlineStatus, { backgroundColor: statusBg }]}>
                  <Ionicons
                    name={statusTone === 'success' ? 'checkmark-circle' : statusTone === 'error' ? 'alert-circle' : 'information-circle'}
                    size={18}
                    color="#fff"
                  />
                  <Text style={styles.inlineStatusText}>{statusMessage}</Text>
                </View>
              ) : (
                <Text style={styles.hint}>Point the camera at a barcode or QR code</Text>
              )}

              {continuous && lastCode && !processing && !statusMessage ? (
                <View style={styles.lastScan}>
                  <Ionicons name="checkmark-circle" size={18} color={colors.success} />
                  <Text style={styles.lastScanText} numberOfLines={1}>{lastCode}</Text>
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

        <View style={styles.footer}>
          {continuous ? (
            <Button label="Done scanning" onPress={onClose} />
          ) : null}
        </View>
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
    height: 260,
    borderWidth: 2,
    borderColor: '#fff',
    borderRadius: 12,
    backgroundColor: 'transparent',
  },
  frameBusy: { borderColor: colors.success },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginTop: spacing.md,
  },
  hint: { color: '#fff', marginTop: spacing.md, fontSize: typography.size.md, textAlign: 'center', paddingHorizontal: spacing.xl },
  inlineStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginTop: spacing.md,
    paddingHorizontal: spacing.base,
    paddingVertical: spacing.sm,
    borderRadius: 10,
    maxWidth: 300,
  },
  inlineStatusText: { color: '#fff', fontSize: typography.size.md, flex: 1, flexWrap: 'wrap' },
  lastScan: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginTop: spacing.md,
    backgroundColor: 'rgba(0,0,0,0.6)',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: 8,
    maxWidth: 280,
  },
  lastScanText: { color: '#fff', fontSize: typography.size.sm, flex: 1 },
  permission: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl,
    gap: spacing.md,
  },
  permissionText: { color: '#fff', textAlign: 'center', fontSize: typography.size.md },
  footer: { padding: spacing.base, minHeight: 72, justifyContent: 'center' },
});
