import * as Device from 'expo-device';
import * as SecureStore from 'expo-secure-store';
import { api } from '@/api/client';
import { unwrapData } from '@/lib/envelope';
import { logDeviceRegistered, logDeviceRevoked } from '@/lib/audit-logging';
import { useAuthStore } from '@/store/authStore';

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

export async function registerDevice(pushToken: string): Promise<void> {
  try {
    const info = await getDeviceInfo();
    const platform = Device.osName === 'iOS' ? 'IOS' : 'ANDROID';
    await api.post('/devices/register', {
      deviceId: info.deviceId,
      deviceName: info.deviceName,
      platform,
      pushToken,
      osVersion: info.osVersion,
    });
    await logDeviceRegistered(info.deviceId, info.deviceName);
  } catch {
    // Non-critical (e.g. push unavailable on this build) — ignore silently.
  }
}

export async function getActiveDevices(): Promise<RegisteredDevice[]> {
  try {
    const currentDeviceId = await getDeviceId();
    const res = await api.get('/devices');
    const payload = unwrapData<{ devices?: unknown[] } | unknown[]>(res.data);
    const rows = Array.isArray(payload)
      ? payload
      : Array.isArray((payload as { devices?: unknown[] })?.devices)
        ? (payload as { devices: unknown[] }).devices
        : [];
    return (rows as Record<string, unknown>[]).map((d) => ({
      id: String(d.id ?? d.deviceId ?? ''),
      deviceId: String(d.deviceId ?? ''),
      deviceName: String(d.deviceName ?? 'Unknown Device'),
      platform: String(d.platform ?? 'Unknown'),
      osVersion: String(d.osVersion ?? ''),
      lastLoginAt: String(d.lastActiveAt ?? d.updatedAt ?? d.createdAt ?? ''),
      isCurrent: d.deviceId === currentDeviceId,
    }));
  } catch {
    return [];
  }
}

export async function revokeDevice(deviceId: string): Promise<void> {
  try {
    await api.delete(`/devices/${deviceId}`, { data: { deviceId } });
    await logDeviceRevoked(deviceId);
  } catch (err) {
    console.error('Failed to revoke device:', err);
    throw err;
  }
}

/** Session id (`sid`) carried in this device's refresh token, or null. */
function currentSessionId(): string | null {
  const token = useAuthStore.getState().refreshToken;
  const part = token?.split('.')[1];
  if (!part || typeof atob !== 'function') return null;
  try {
    const json = atob(part.replace(/-/g, '+').replace(/_/g, '/').padEnd(Math.ceil(part.length / 4) * 4, '='));
    const sid = (JSON.parse(json) as { sid?: unknown }).sid;
    return typeof sid === 'string' ? sid : null;
  } catch {
    return null;
  }
}

/**
 * Signs out every other device: revokes all of this user's login sessions
 * except the current one, and removes the other devices' push registrations.
 */
export async function logoutAllDevices(): Promise<void> {
  const currentSid = currentSessionId();
  if (!currentSid) {
    throw new Error('Could not identify this device\'s session. Sign in again and retry.');
  }
  const res = await api.get('/auth/sessions');
  const payload = unwrapData<{ sessions?: Array<{ id: string }> }>(res.data);
  const sessions = Array.isArray(payload?.sessions) ? payload.sessions : [];
  await Promise.all(
    sessions.filter((s) => s.id !== currentSid).map((s) => api.delete(`/auth/sessions/${s.id}`)),
  );

  const currentDeviceId = await getDeviceId();
  const devices = await getActiveDevices();
  await Promise.all(
    devices
      .filter((d) => d.deviceId && d.deviceId !== currentDeviceId)
      .map((d) => api.delete(`/devices/${d.deviceId}`, { data: { deviceId: d.deviceId } })),
  );
}

/** Stops push notifications for this account on this device (used at sign-out). */
export async function unregisterCurrentDevice(): Promise<void> {
  try {
    const deviceId = await getDeviceId();
    await api.delete(`/devices/${deviceId}`, { data: { deviceId } });
  } catch {
    // Sign-out must not depend on this succeeding.
  }
}
