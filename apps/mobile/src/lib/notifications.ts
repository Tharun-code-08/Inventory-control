import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { registerDevice } from '@/lib/device-info';

export type NotificationType =
  | 'GR_CREATED'
  | 'GR_APPROVED'
  | 'GR_REJECTED'
  | 'PO_APPROVED'
  | 'PO_REJECTED'
  | 'RFQ_CREATED'
  | 'RFQ_RESPONSE'
  | 'QUOTATION_APPROVED'
  | 'QUOTATION_REJECTED'
  | 'LOW_STOCK'
  | 'CRITICAL_STOCK'
  | 'TRANSFER_COMPLETED'
  | 'INVENTORY_ADJUSTED'
  | 'NEW_DEVICE_LOGIN'
  | 'PASSWORD_CHANGED'
  | 'SESSION_REVOKED'
  | 'MAINTENANCE'
  | 'UPDATE'
  | 'ANNOUNCEMENT';

export type NotificationPayload = {
  type: NotificationType;
  title: string;
  body: string;
  entityType?: string;
  entityId?: string;
  data?: Record<string, string>;
};

export async function setupNotifications(): Promise<void> {
  // Handle notifications when app is in foreground
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowBanner: true,
      shouldShowList: true,
      shouldPlaySound: true,
      shouldSetBadge: true,
    }),
  });
}

export async function requestNotificationPermissions(): Promise<boolean> {
  if (!Device.isDevice) {
    console.log('Notifications not available on simulator');
    return false;
  }

  try {
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;

    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }

    return finalStatus === 'granted';
  } catch (err) {
    console.error('Failed to request notification permissions:', err);
    return false;
  }
}

export async function getPushToken(): Promise<string | null> {
  try {
    if (!Device.isDevice) {
      console.log('Push tokens not available on simulator');
      return null;
    }

    const token = await Notifications.getExpoPushTokenAsync();
    return token.data;
  } catch (err) {
    console.error('Failed to get push token:', err);
    return null;
  }
}

export async function registerPushToken(): Promise<void> {
  try {
    if (!Device.isDevice) return;
    const permissionGranted = await requestNotificationPermissions();
    if (!permissionGranted) return;

    const token = await getPushToken();
    if (!token) return; // Expo Go / simulator — push unavailable, skip silently.

    // Registers the device with its push token (POST /devices/register).
    await registerDevice(token);
  } catch {
    // Non-critical — ignore silently.
  }
}

export async function sendLocalNotification(payload: NotificationPayload): Promise<void> {
  try {
    await Notifications.scheduleNotificationAsync({
      content: {
        title: payload.title,
        body: payload.body,
        data: {
          type: payload.type,
          entityType: payload.entityType,
          entityId: payload.entityId,
          ...payload.data,
        },
        sound: true,
        badge: 1,
      },
      trigger: null, // Send immediately
    });
  } catch (err) {
    console.error('Failed to send local notification:', err);
  }
}

export function subscribeToNotifications(
  callback: (notification: Notifications.Notification) => void
): () => void {
  const subscription = Notifications.addNotificationResponseReceivedListener((response) => {
    callback(response.notification);
  });

  // Also handle notifications when app is in foreground
  const foregroundSubscription = Notifications.addNotificationReceivedListener((notification) => {
    callback(notification);
  });

  return () => {
    subscription.remove();
    foregroundSubscription.remove();
  };
}
