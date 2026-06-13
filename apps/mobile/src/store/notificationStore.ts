import { create } from 'zustand';

export type Notification = {
  id: string;
  type: string;
  title: string;
  body: string;
  entityType?: string;
  entityId?: string;
  priority: 'critical' | 'high' | 'normal' | 'low';
  isRead: boolean;
  readAt?: number;
  sentAt: number;
  createdAt: number;
};

type NotificationState = {
  notifications: Notification[];
  unreadCount: number;
  addNotification: (notification: Notification) => void;
  markAsRead: (id: string) => void;
  markAllAsRead: () => void;
  deleteNotification: (id: string) => void;
  clearNotifications: () => void;
  getNotificationById: (id: string) => Notification | undefined;
  getUnreadNotifications: () => Notification[];
  getNotificationsByType: (type: string) => Notification[];
  filterNotifications: (filters: { type?: string; priority?: string; isRead?: boolean }) => Notification[];
};

export const useNotificationStore = create<NotificationState>((set, get) => ({
  notifications: [],
  unreadCount: 0,

  addNotification: (notification) =>
    set((state) => {
      const notifications = [notification, ...state.notifications].slice(0, 100); // Keep last 100
      return {
        notifications,
        unreadCount: notifications.filter((n) => !n.isRead).length,
      };
    }),

  markAsRead: (id) =>
    set((state) => {
      const notifications = state.notifications.map((n) =>
        n.id === id ? { ...n, isRead: true, readAt: Date.now() } : n
      );
      return {
        notifications,
        unreadCount: notifications.filter((n) => !n.isRead).length,
      };
    }),

  markAllAsRead: () =>
    set((state) => {
      const notifications = state.notifications.map((n) => ({
        ...n,
        isRead: true,
        readAt: Date.now(),
      }));
      return {
        notifications,
        unreadCount: 0,
      };
    }),

  deleteNotification: (id) =>
    set((state) => {
      const notifications = state.notifications.filter((n) => n.id !== id);
      return {
        notifications,
        unreadCount: notifications.filter((n) => !n.isRead).length,
      };
    }),

  clearNotifications: () =>
    set({
      notifications: [],
      unreadCount: 0,
    }),

  getNotificationById: (id) => {
    const state = get();
    return state.notifications.find((n) => n.id === id);
  },

  getUnreadNotifications: () => {
    const state = get();
    return state.notifications.filter((n) => !n.isRead);
  },

  getNotificationsByType: (type) => {
    const state = get();
    return state.notifications.filter((n) => n.type === type);
  },

  filterNotifications: (filters) => {
    const state = get();
    return state.notifications.filter((n) => {
      if (filters.type && n.type !== filters.type) return false;
      if (filters.priority && n.priority !== filters.priority) return false;
      if (filters.isRead !== undefined && n.isRead !== filters.isRead) return false;
      return true;
    });
  },
}));
