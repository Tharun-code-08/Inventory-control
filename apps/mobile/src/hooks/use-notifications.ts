import { useEffect, useCallback } from 'react';
import { useNotificationStore, type Notification } from '@/store/notificationStore';
import { subscribeToNotifications, setupNotifications, registerPushToken } from '@/lib/notifications';

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
    const unsubscribe = subscribeToNotifications((notification) => {
      const data = notification.request.content.data;
      const id = Math.random().toString(36).substring(7);

      const notif: Notification = {
        id,
        type: data.type || 'ANNOUNCEMENT',
        title: notification.request.content.title || '',
        body: notification.request.content.body || '',
        entityType: data.entityType,
        entityId: data.entityId,
        priority: getPriorityFromType(data.type),
        isRead: false,
        sentAt: notification.date.getTime(),
        createdAt: Date.now(),
      };

      addNotification(notif);
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
