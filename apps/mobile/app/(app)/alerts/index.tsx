import { Alert, FlatList, RefreshControl } from 'react-native';
import { PermissionGate } from '@/components/PermissionGate';
import { useAlerts, useMarkAlertRead, useRunAlertChecks } from '@/hooks/use-alerts';
import { useAuthStore } from '@/store/authStore';
import { hasPermission } from '@/lib/permissions';
import { getApiErrorMessage } from '@/lib/api-error';
import { Badge, Button, EmptyState, ListRow, Screen, Title } from '@/components/ui';

export default function AlertsScreen() {
  const user = useAuthStore((s) => s.user);
  const query = useAlerts();
  const markRead = useMarkAlertRead();
  const runChecks = useRunAlertChecks();
  const canRun = hasPermission(user, 'report:view');

  const sorted = [...(query.data ?? [])].sort((a, b) => {
    if (a.isRead !== b.isRead) return a.isRead ? 1 : -1;
    return new Date(b.triggeredAt).getTime() - new Date(a.triggeredAt).getTime();
  });

  async function onRunChecks() {
    try {
      const result = await runChecks.mutateAsync();
      Alert.alert('Checks complete', `Generated ${result.generated ?? 0} alert(s).`);
    } catch (err) {
      Alert.alert('Failed', getApiErrorMessage(err));
    }
  }

  return (
    <PermissionGate permission="report:view">
      <Screen style={{ paddingBottom: 0 }}>
        <Title>Alerts</Title>
        {canRun ? (
          <Button
            label="Run low-stock checks"
            variant="secondary"
            onPress={onRunChecks}
            loading={runChecks.isPending}
          />
        ) : null}
        <FlatList
          data={sorted}
          keyExtractor={(item) => item.id}
          refreshControl={
            <RefreshControl refreshing={query.isFetching} onRefresh={() => query.refetch()} />
          }
          ListEmptyComponent={
            <EmptyState message={query.isLoading ? 'Loading…' : 'No alerts.'} />
          }
          renderItem={({ item }) => (
            <ListRow
              title={item.title}
              subtitle={item.message}
              right={
                <Badge
                  label={item.isRead ? 'Read' : item.severity}
                  tone={item.isRead ? 'default' : 'warning'}
                />
              }
              onPress={
                item.isRead
                  ? undefined
                  : () => markRead.mutate(item.id)
              }
            />
          )}
        />
      </Screen>
    </PermissionGate>
  );
}
