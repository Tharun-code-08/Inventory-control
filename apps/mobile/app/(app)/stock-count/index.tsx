import { FlatList, RefreshControl, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { PermissionGate } from '@/components/PermissionGate';
import { FAB } from '@/components/FAB';
import { useCreateStockCountSession, useStockCountSessions } from '@/hooks/use-stock-count';
import { getApiErrorMessage } from '@/lib/api-error';
import { EmptyState, ListRow, Muted, Screen, Title } from '@/components/ui';
import { StatusBadge } from '@/components/StatusBadge';
import { colors, spacing } from '@/theme';

export default function StockCountHome() {
  const router = useRouter();
  const query = useStockCountSessions();
  const createSession = useCreateStockCountSession();
  const sessions = query.data ?? [];

  const openSession = (sessionId: string) => {
    router.push({ pathname: '/stock-count/[sessionId]', params: { sessionId } });
  };

  const handleNewSession = () => {
    createSession.mutate(undefined, {
      onSuccess: (session) => openSession(session.id),
    });
  };

  const listHeader = (
    <>
      <Title>Stock Count</Title>
      <Muted style={styles.hint}>Count shelf stock and post adjustments.</Muted>
      {query.isError ? (
        <Muted style={styles.error}>{getApiErrorMessage(query.error, 'Could not load sessions.')}</Muted>
      ) : null}
      {createSession.isError ? (
        <Muted style={styles.error}>{getApiErrorMessage(createSession.error, 'Could not create a session.')}</Muted>
      ) : null}
    </>
  );

  return (
    <PermissionGate permission="product:read">
      <Screen>
        <FlatList
          data={sessions}
          keyExtractor={(item) => item.id}
          refreshControl={
            <RefreshControl refreshing={query.isFetching} onRefresh={() => query.refetch()} />
          }
          ListHeaderComponent={listHeader}
          ListEmptyComponent={
            <EmptyState
              icon="clipboard-outline"
              message={
                query.isLoading
                  ? 'Loading…'
                  : query.isError
                    ? 'Sessions could not be loaded.'
                    : 'No sessions yet. Tap + to start counting.'
              }
            />
          }
          renderItem={({ item }) => (
            <ListRow
              title={`Session ${item.id.slice(0, 8)}`}
              subtitle={new Date(item.createdAt).toLocaleString()}
              right={<StatusBadge status={item.status} />}
              onPress={() => openSession(item.id)}
            />
          )}
          contentContainerStyle={styles.list}
        />
        <FAB onPress={handleNewSession} />
      </Screen>
    </PermissionGate>
  );
}

const styles = StyleSheet.create({
  hint: { marginBottom: spacing.md },
  error: { color: colors.danger, marginBottom: spacing.md },
  list: { paddingBottom: 96 },
});
