import { useState, useMemo } from 'react';
import { FlatList, RefreshControl, View, Pressable, StyleSheet, Alert } from 'react-native';
import { Link } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Screen, Card, Muted, Subtitle, Badge, Button, EmptyState, Title } from '@/components/ui';
import { useNotifications } from '@/hooks/use-notifications';
import { colors, spacing, typography } from '@/theme';
import { formatDate } from '@/lib/format';

const PRIORITY_COLORS = {
  critical: '#ef4444',
  high: '#f59e0b',
  normal: '#3b82f6',
  low: '#6b7280',
};

type FilterType = 'all' | 'unread' | 'critical' | 'high' | 'normal';

export default function NotificationsScreen() {
  const {
    notifications,
    unreadCount,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    filterNotifications,
  } = useNotifications();
  const [filter, setFilter] = useState<FilterType>('all');
  const [refreshing, setRefreshing] = useState(false);

  const filtered = useMemo(() => {
    switch (filter) {
      case 'unread':
        return filterNotifications({ isRead: false });
      case 'critical':
        return filterNotifications({ priority: 'critical' });
      case 'high':
        return filterNotifications({ priority: 'high' });
      case 'normal':
        return filterNotifications({ priority: 'normal' });
      default:
        return notifications;
    }
  }, [filter, notifications, filterNotifications]);

  function onRefresh() {
    setRefreshing(true);
    setTimeout(() => setRefreshing(false), 1000);
  }

  function onNotificationPress(id: string, isRead: boolean) {
    if (!isRead) {
      markAsRead(id);
    }
  }

  function onDeleteNotification(id: string) {
    Alert.alert('Delete notification', 'Remove this notification?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: () => deleteNotification(id),
      },
    ]);
  }

  return (
    <Screen style={styles.screen}>
      {/* Header with actions */}
      <View style={styles.header}>
        <Title>Notifications</Title>
        {unreadCount > 0 && (
          <Badge label={String(unreadCount)} tone="danger" />
        )}
      </View>

      {/* Filter tabs */}
      <View style={styles.filters}>
        <FilterButton
          label="All"
          active={filter === 'all'}
          count={notifications.length}
          onPress={() => setFilter('all')}
        />
        <FilterButton
          label="Unread"
          active={filter === 'unread'}
          count={unreadCount}
          onPress={() => setFilter('unread')}
        />
        <FilterButton
          label="Critical"
          active={filter === 'critical'}
          count={filterNotifications({ priority: 'critical' }).length}
          onPress={() => setFilter('critical')}
        />
      </View>

      {/* Mark all as read button */}
      {unreadCount > 0 && (
        <Button
          label="Mark all as read"
          variant="secondary"
          size="sm"
          onPress={markAllAsRead}
        />
      )}

      {/* Notifications list */}
      {notifications.length === 0 ? (
        <EmptyState
          message="No notifications yet"
          icon="notifications-off-outline"
        />
      ) : filtered.length === 0 ? (
        <EmptyState
          message={`No ${filter} notifications`}
          icon="notifications-outline"
        />
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <Pressable onPress={() => onNotificationPress(item.id, item.isRead)}>
              <Card style={!item.isRead ? styles.unreadCard : undefined}>
                <View style={styles.notificationContent}>
                  {/* Left accent bar */}
                  <View
                    style={[
                      styles.priorityBar,
                      { backgroundColor: PRIORITY_COLORS[item.priority] },
                    ]}
                  />

                  {/* Main content */}
                  <View style={styles.mainContent}>
                    <View style={styles.titleRow}>
                      <Subtitle style={styles.title}>{item.title}</Subtitle>
                      {!item.isRead && (
                        <View style={styles.unreadDot} />
                      )}
                    </View>

                    <Muted style={styles.body}>{item.body}</Muted>

                    <View style={styles.footer}>
                      <Muted style={styles.date}>
                        {formatDate(item.createdAt)}
                      </Muted>
                      <Badge label={item.priority.toUpperCase()} />
                    </View>
                  </View>

                  {/* Delete button */}
                  <Pressable
                    style={styles.deleteButton}
                    onPress={() => onDeleteNotification(item.id)}
                  >
                    <Ionicons name="close" size={20} color={colors.muted} />
                  </Pressable>
                </View>
              </Card>
            </Pressable>
          )}
          scrollEnabled={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        />
      )}
    </Screen>
  );
}

function FilterButton({
  label,
  active,
  count,
  onPress,
}: {
  label: string;
  active: boolean;
  count: number;
  onPress: () => void;
}) {
  return (
    <Pressable
      style={[styles.filterButton, active && styles.filterButtonActive]}
      onPress={onPress}
    >
      <Badge
        label={`${label}${count > 0 ? ` (${count})` : ''}`}
        tone={active ? 'primary' : 'default'}
      />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  screen: { paddingBottom: 0 },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  filters: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginBottom: spacing.lg,
    flexWrap: 'wrap',
  },
  filterButton: {
    paddingVertical: spacing.xs,
  },
  filterButtonActive: {
    opacity: 1,
  },
  notificationContent: {
    flexDirection: 'row',
    gap: spacing.md,
    alignItems: 'flex-start',
  },
  priorityBar: {
    width: 4,
    height: '100%',
    borderRadius: 2,
    marginTop: spacing.xs,
  },
  mainContent: {
    flex: 1,
  },
  titleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  title: {
    fontSize: typography.size.base,
    flex: 1,
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.primary,
    marginLeft: spacing.sm,
  },
  body: {
    fontSize: typography.size.sm,
    lineHeight: 18,
    marginBottom: spacing.md,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  date: {
    fontSize: typography.size.xs,
  },
  deleteButton: {
    padding: spacing.sm,
    marginRight: -spacing.sm,
  },
  unreadCard: {
    backgroundColor: colors.primary + '08',
    borderLeftColor: colors.primary,
    borderLeftWidth: 2,
  },
});
