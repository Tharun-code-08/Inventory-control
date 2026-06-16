import * as Device from 'expo-device';
import * as SecureStore from 'expo-secure-store';
import { api } from '@/api/client';
import { logDeviceRegistered, logDeviceRevoked } from '@/lib/audit-logging';

// RFC4122-style v4 UUID without a crypto polyfill. React Native does not
// provide `crypto.getRandomValues`, which the `uuid` package depends on, so we
// generate the identifier with Math.random. This is only a device identifier,
// not a security token, so cryptographic randomness is not required.
function uuidv4(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

export type RegisteredDevice = {
  id: string;
  deviceId: string;
  deviceName: string;
  platform: string;
  osVersion: string;
  lastLoginAt: string;
  isCurrent: boolean;
};

let cachedDeviceId: string | null = null;

export async function getDeviceId(): Promise<string> {
  if (cachedDeviceId) {
    return cachedDeviceId;
  }

  try {
    let deviceId = await SecureStore.getItemAsync('device_id');
    if (!deviceId) {
      deviceId = uuidv4();
      await SecureStore.setItemAsync('device_id', deviceId);
    }
    cachedDeviceId = deviceId;
    return deviceId;
  } catch (err) {
    console.error('Failed to get device ID:', err);
    // Fallback to a random ID
    return uuidv4();
  }
}

export async function getDeviceInfo(): Promise<{
  deviceId: string;
  deviceName: string;
  platform: string;
  osVersion: string;
}> {
  const deviceId = await getDeviceId();
  const deviceName = Device.deviceName || 'Unknown Device';
  const platform = Device.osName || 'Unknown';
  const osVersion = Device.osVersion || 'Unknown';

  return {
    deviceId,
    deviceName,
    platform,
    osVersion,
  };
}

export async function registerDevice(): Promise<void> {
  try {
    const info = await getDeviceInfo();
    await api.post('/auth/devices', {
      deviceId: info.deviceId,
      deviceName: info.deviceName,
      platform: info.platform,
      osVersion: info.osVersion,
    });
    await logDeviceRegistered(info.deviceId, info.deviceName);
  } catch (err) {
    console.error('Failed to register device:', err);
    // Don't throw - this is non-critical
  }
}

export async function getActiveDevices(): Promise<RegisteredDevice[]> {
  try {
    const currentDeviceId = await getDeviceId();
    const res = await api.get('/auth/devices');
    const devices = (res.data?.data || []) as any[];
    return devices.map((d: any) => ({
      id: d.id,
      deviceId: d.deviceId,
      deviceName: d.deviceName,
      platform: d.platform,
      osVersion: d.osVersion,
      lastLoginAt: d.lastLoginAt,
      isCurrent: d.deviceId === currentDeviceId,
    }));
  } catch (err) {
    console.error('Failed to fetch active devices:', err);
    return [];
  }
}

export async function revokeDevice(deviceId: string): Promise<void> {
  try {
    await api.post(`/auth/devices/${deviceId}/revoke`);
    await logDeviceRevoked(deviceId);
  } catch (err) {
    console.error('Failed to revoke device:', err);
    throw err;
  }
}

export async function logoutAllDevices(): Promise<void> {
  try {
    await api.post('/auth/logout-all');
  } catch (err) {
    console.error('Failed to logout all devices:', err);
    throw err;
  }
}
