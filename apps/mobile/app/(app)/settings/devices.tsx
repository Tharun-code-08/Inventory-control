import { useState, useEffect } from 'react';
import { ScrollView, View, Alert, RefreshControl, StyleSheet } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuthStore } from '@/store/authStore';
import { Screen, Title, Card, Muted, Button, Badge } from '@/components/ui';
import { DetailField } from '@/components/DetailField';
import { colors, spacing } from '@/theme';
import { getActiveDevices, revokeDevice, logoutAllDevices, type RegisteredDevice } from '@/lib/device-info';

export default function ActiveDevicesScreen() {
  const user = useAuthStore((s) => s.user);
  const [devices, setDevices] = useState<RegisteredDevice[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    loadDevices();
  }, []);

  async function loadDevices() {
    try {
      const devs = await getActiveDevices();
      setDevices(devs);
    } catch (err) {
      Alert.alert('Error', 'Could not load active devices');
    } finally {
      setLoading(false);
    }
  }

  async function onRefresh() {
    setRefreshing(true);
    await loadDevices();
    setRefreshing(false);
  }

  async function onRevokeDevice(device: RegisteredDevice) {
    if (device.isCurrent) {
      Alert.alert('Cannot revoke', 'You cannot revoke the current device. Sign out instead.');
      return;
    }

    Alert.alert(
      'Revoke device',
      `Remove ${device.deviceName}? It will be logged out immediately.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Revoke',
          style: 'destructive',
          onPress: async () => {
            try {
              await revokeDevice(device.deviceId);
              await loadDevices();
              Alert.alert('Success', 'Device revoked');
            } catch (err) {
              Alert.alert('Error', 'Could not revoke device');
            }
          },
        },
      ]
    );
  }

  async function onLogoutAll() {
    Alert.alert(
      'Logout from all devices',
      'You will be logged out from all devices except this one. Continue?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Logout all',
          style: 'destructive',
          onPress: async () => {
            try {
              await logoutAllDevices();
              await loadDevices();
              Alert.alert('Success', 'Logged out from all other devices');
            } catch (err) {
              Alert.alert('Error', 'Could not logout from all devices');
            }
          },
        },
      ]
    );
  }

  return (
    <Screen>
      <ScrollView refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}>
        <Title>Active Devices</Title>
        <Muted style={{ marginBottom: spacing.lg }}>
          Manage devices logged into your account
        </Muted>

        {loading ? (
          <Card>
            <Muted>Loading devices…</Muted>
          </Card>
        ) : devices.length === 0 ? (
          <Card>
            <Muted>No active devices</Muted>
          </Card>
        ) : (
          <>
            {devices.map((device) => (
              <Card key={device.id} style={device.isCurrent ? styles.currentDevice : undefined}>
                <View style={styles.deviceHeader}>
                  <View style={styles.deviceInfo}>
                    <Ionicons
                      name={
                        device.platform.toLowerCase().includes('ios')
                          ? 'phone-portrait-outline'
                          : 'phone-portrait-outline'
                      }
                      size={24}
                      color={colors.primary}
                    />
                    <View style={styles.deviceText}>
                      <DetailField label="Device" value={device.deviceName} />
                      {device.isCurrent ? (
                        <Badge label="Current device" tone="primary" />
                      ) : (
                        <Muted style={{ fontSize: 12 }}>
                          Last login: {new Date(device.lastLoginAt).toLocaleDateString()}
                        </Muted>
                      )}
                    </View>
                  </View>
                </View>
                <DetailField label="Platform" value={device.platform} />
                <DetailField label="OS Version" value={device.osVersion} />
                {!device.isCurrent && (
                  <Button
                    label="Revoke"
                    variant="secondary"
                    onPress={() => onRevokeDevice(device)}
                  />
                )}
              </Card>
            ))}

            {devices.length > 1 && (
              <View style={styles.actions}>
                <Button
                  label="Logout from all other devices"
                  variant="secondary"
                  onPress={onLogoutAll}
                />
              </View>
            )}
          </>
        )}
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  currentDevice: {
    borderColor: colors.primary,
    borderWidth: 1.5,
  },
  deviceHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: spacing.md,
  },
  deviceInfo: {
    flexDirection: 'row',
    gap: spacing.md,
    flex: 1,
  },
  deviceText: {
    flex: 1,
  },
  actions: {
    marginTop: spacing.lg,
  },
});
