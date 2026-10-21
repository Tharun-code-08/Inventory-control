import { useEffect, useCallback } from 'react';
import { useNotificationStore, type Notification } from '@/store/notificationStore';
import type * as Notifications from 'expo-notifications';
import { subscribeToNotifications, setupNotifications, registerPushToken } from '@/lib/notifications';
import { handleNotificationDeepLink } from '@/lib/deep-linking';

export function useNotificationSetup() {
  useEffect(() => {
    const init = async () => {
      await setupNotifications();
      await registerPushToken();
    };
    init();
  }, []);
}

export function useNotificationListener() {
  const addNotification = useNotificationStore((s) => s.addNotification);

  useEffect(() => {
    const toStore = (notification: Notifications.Notification) => {
      const data = (notification.request.content.data ?? {}) as Record<string, string | undefined>;
      // The OS identifier is stable across the "received" and "tapped" events.
      const id = notification.request.identifier || Math.random().toString(36).substring(7);
      if (useNotificationStore.getState().notifications.some((n) => n.id === id)) return;
      const type = data.type ?? 'ANNOUNCEMENT';
      // expo-notifications returns `date` as epoch milliseconds.
      const sentAt = typeof notification.date === 'number' ? notification.date : Date.now();

      const notif: Notification = {
        id,
        type,
        title: notification.request.content.title || '',
        body: notification.request.content.body || '',
        entityType: data.entityType,
        entityId: data.entityId,
        priority: getPriorityFromType(type),
        isRead: false,
        sentAt,
        createdAt: Date.now(),
      };

      addNotification(notif);
    };

    const unsubscribe = subscribeToNotifications({
      onReceive: toStore,
      onOpen: (notification) => {
        toStore(notification);
        const data = (notification.request.content.data ?? {}) as Record<string, string>;
        handleNotificationDeepLink(data);
      },
    });

    return unsubscribe;
  }, [addNotification]);
}

export function useNotifications() {
  const notifications = useNotificationStore((s) => s.notifications);
  const unreadCount = useNotificationStore((s) => s.unreadCount);
  const markAsRead = useNotificationStore((s) => s.markAsRead);
  const markAllAsRead = useNotificationStore((s) => s.markAllAsRead);
  const deleteNotification = useNotificationStore((s) => s.deleteNotification);
  const clearNotifications = useNotificationStore((s) => s.clearNotifications);
  const filterNotifications = useNotificationStore((s) => s.filterNotifications);
  const getUnreadNotifications = useNotificationStore((s) => s.getUnreadNotifications);

  return {
    notifications,
    unreadCount,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    clearNotifications,
    filterNotifications,
    getUnreadNotifications,
  };
}

function getPriorityFromType(type: string): 'critical' | 'high' | 'normal' | 'low' {
  if (type.includes('CRITICAL') || type === 'CRITICAL_STOCK') {
    return 'critical';
  }
  if (type.includes('REJECTED') || type.includes('ESCALATED') || type === 'NEW_DEVICE_LOGIN') {
    return 'high';
  }
  if (
    type.includes('APPROVED') ||
    type.includes('COMPLETED') ||
    type.includes('RESPONSE') ||
    type === 'LOW_STOCK'
  ) {
    return 'normal';
  }
  return 'low';
}
