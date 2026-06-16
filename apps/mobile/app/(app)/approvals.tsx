import { useState, useMemo } from 'react';
import { FlatList, RefreshControl, View, Pressable, Alert, StyleSheet } from 'react-native';
import { Link, router, type Href } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Screen, Card, Muted, Title, Badge, Button, ListRow, EmptyState } from '@/components/ui';
import { colors, spacing, typography } from '@/theme';
import { formatDate, formatCurrency } from '@/lib/format';

type ApprovalItem = {
  id: string;
  type: 'GR' | 'PO' | 'RFQ' | 'QUOTATION' | 'TRANSFER';
  number: string;
  description: string;
  amount?: number;
  requestor: string;
  pendingFor: number; // milliseconds
  priority: 'low' | 'normal' | 'high' | 'critical';
  status: 'pending' | 'escalated';
};

const MOCK_APPROVALS: ApprovalItem[] = [
  {
    id: '1',
    type: 'GR',
    number: 'GR-2024-001',
    description: 'Goods Receipt from Supplier ABC',
    amount: 5000,
    requestor: 'John Warehouse',
    pendingFor: 2 * 24 * 60 * 60 * 1000, // 2 days
    priority: 'high',
    status: 'pending',
  },
  {
    id: '2',
    type: 'PO',
    number: 'PO-2024-042',
    description: 'Purchase Order for Office Supplies',
    amount: 1200,
    requestor: 'Jane Procurement',
    pendingFor: 6 * 60 * 60 * 1000, // 6 hours
    priority: 'normal',
    status: 'pending',
  },
];

export default function ApprovalsScreen() {
  const [approvals, setApprovals] = useState<ApprovalItem[]>(MOCK_APPROVALS);
  const [refreshing, setRefreshing] = useState(false);

  const pendingCount = useMemo(() => {
    return approvals.filter((a) => a.status === 'pending').length;
  }, [approvals]);

  const escalatedCount = useMemo(() => {
    return approvals.filter((a) => a.status === 'escalated').length;
  }, [approvals]);

  function onRefresh() {
    setRefreshing(true);
    // TODO: Fetch from API
    setTimeout(() => setRefreshing(false), 1000);
  }

  function onApprove(approval: ApprovalItem) {
    Alert.alert('Approve', `Approve ${approval.number}?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Approve',
        onPress: async () => {
          // TODO: Call API to approve
          setApprovals((prev) => prev.filter((a) => a.id !== approval.id));
          Alert.alert('Success', `${approval.number} approved`);
        },
      },
    ]);
  }

  function onReject(approval: ApprovalItem) {
    Alert.alert('Reject', `Reject ${approval.number}?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Reject',
        style: 'destructive',
        onPress: async () => {
          // TODO: Call API to reject
          setApprovals((prev) => prev.filter((a) => a.id !== approval.id));
          Alert.alert('Success', `${approval.number} rejected`);
        },
      },
    ]);
  }

  function onViewDetails(approval: ApprovalItem) {
    const routes: Record<string, Href> = {
      GR: `/goods-receipts/${approval.id}`,
      PO: `/purchase-orders/${approval.id}`,
      RFQ: `/purchase-orders/${approval.id}`, // TODO: Create RFQ screen
      QUOTATION: `/purchase-orders/${approval.id}`, // TODO: Create quotation screen
      TRANSFER: `/purchase-orders/${approval.id}`, // TODO: Create transfer screen
    };
    router.push(routes[approval.type]);
  }

  return (
    <Screen style={styles.screen}>
      <View style={styles.header}>
        <Title>Approvals</Title>
        {pendingCount > 0 && <Badge label={String(pendingCount)} tone="danger" />}
      </View>

      <View style={styles.stats}>
        <StatCard label="Pending" value={pendingCount} tone="warning" />
        <StatCard label="Escalated" value={escalatedCount} tone="danger" />
      </View>

      {approvals.length === 0 ? (
        <EmptyState message="No pending approvals" icon="checkmark-circle-outline" />
      ) : (
        <FlatList
          data={approvals}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <Card style={item.status === 'escalated' ? styles.escalatedCard : undefined}>
              <View style={styles.approvalHeader}>
                <View style={styles.approvalInfo}>
                  <Badge label={item.type} tone={item.status === 'escalated' ? 'danger' : 'primary'} />
                  <View style={styles.numberAndDesc}>
                    <Muted style={styles.number}>{item.number}</Muted>
                    <Muted style={styles.desc}>{item.description}</Muted>
                  </View>
                </View>
              </View>

              <View style={styles.approvalDetails}>
                <DetailRow label="Requestor" value={item.requestor} />
                {item.amount && (
                  <DetailRow label="Amount" value={formatCurrency(item.amount)} />
                )}
                <DetailRow
                  label="Pending for"
                  value={formatPendingTime(item.pendingFor)}
                />
              </View>

              {item.status === 'escalated' && (
                <Muted style={styles.escalatedLabel}>
                  ⚠ Escalated to manager
                </Muted>
              )}

              <View style={styles.actions}>
                <Button
                  label="Details"
                  variant="secondary"
                  size="sm"
                  onPress={() => onViewDetails(item)}
                />
                <Button
                  label="Reject"
                  variant="secondary"
                  size="sm"
                  onPress={() => onReject(item)}
                />
                <Button
                  label="Approve"
                  size="sm"
                  onPress={() => onApprove(item)}
                />
              </View>
            </Card>
          )}
          scrollEnabled={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        />
      )}
    </Screen>
  );
}

function StatCard({
  label,
  value,
  tone,
}: {
  label: string;
  value: number;
  tone: 'warning' | 'danger';
}) {
  const bgColor = tone === 'danger' ? colors.danger : colors.warning;
  return (
    <View style={[styles.statCard, { backgroundColor: bgColor + '12' }]}>
      <Muted style={styles.statLabel}>{label}</Muted>
      <Muted style={[styles.statValue, { color: bgColor }]}>{value}</Muted>
    </View>
  );
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.detailRow}>
      <Muted style={styles.detailLabel}>{label}</Muted>
      <Muted style={styles.detailValue}>{value}</Muted>
    </View>
  );
}

function formatPendingTime(ms: number): string {
  const hours = Math.floor(ms / (1000 * 60 * 60));
  const days = Math.floor(hours / 24);

  if (days > 0) {
    return `${days} day${days > 1 ? 's' : ''}`;
  }
  if (hours > 0) {
    return `${hours}h`;
  }
  return 'Just now';
}

const styles = StyleSheet.create({
  screen: { paddingBottom: 0 },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  stats: {
    flexDirection: 'row',
    gap: spacing.md,
    marginBottom: spacing.lg,
  },
  statCard: {
    flex: 1,
    padding: spacing.md,
    borderRadius: 8,
    alignItems: 'center',
  },
  statLabel: {
    fontSize: typography.size.xs,
    textTransform: 'uppercase',
    marginBottom: spacing.xs,
  },
  statValue: {
    fontSize: typography.size.lg,
    fontWeight: '700' as const,
  },
  approvalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: spacing.md,
  },
  approvalInfo: {
    flex: 1,
    gap: spacing.sm,
  },
  numberAndDesc: {
    gap: spacing.xs,
  },
  number: {
    fontWeight: '600' as const,
    fontSize: typography.size.base,
  },
  desc: {
    fontSize: typography.size.sm,
  },
  approvalDetails: {
    gap: spacing.md,
    marginBottom: spacing.md,
    paddingBottom: spacing.md,
    borderBottomColor: colors.border,
    borderBottomWidth: 1,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  detailLabel: {
    fontSize: typography.size.sm,
  },
  detailValue: {
    fontWeight: '600' as const,
  },
  escalatedLabel: {
    color: colors.danger,
    marginBottom: spacing.md,
    fontSize: typography.size.sm,
  },
  escalatedCard: {
    borderColor: colors.danger,
    borderWidth: 1,
  },
  actions: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  warning: {
    color: colors.warning,
  },
  danger: {
    color: colors.danger,
  },
});
