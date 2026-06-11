import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, typography } from '@/theme';
import { formatDate } from '@/lib/format';

type TimelineEvent = { label: string; date: string };

function buildEvents(props: DocumentTimelineProps): TimelineEvent[] {
  const events: TimelineEvent[] = [];
  if (props.createdAt) events.push({ label: 'Created', date: props.createdAt });
  if (props.confirmedAt) events.push({ label: 'Confirmed', date: props.confirmedAt });
  if (props.sentAt) events.push({ label: 'Sent', date: props.sentAt });
  if (props.postedAt) events.push({ label: 'Posted', date: props.postedAt });
  if (props.cancelledAt) events.push({ label: 'Cancelled', date: props.cancelledAt });
  if (props.updatedAt && props.updatedAt !== props.createdAt) {
    events.push({ label: 'Updated', date: props.updatedAt });
  }
  events.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  return events;
}

export type DocumentTimelineProps = {
  createdAt?: string | null;
  updatedAt?: string | null;
  postedAt?: string | null;
  confirmedAt?: string | null;
  cancelledAt?: string | null;
  sentAt?: string | null;
};

export function DocumentTimeline(props: DocumentTimelineProps) {
  const events = buildEvents(props);
  if (events.length === 0) return null;

  return (
    <View style={styles.container}>
      {events.map((event, i) => (
        <View key={`${event.label}-${i}`} style={styles.row}>
          <View style={styles.dotCol}>
            <View style={[styles.dot, i === events.length - 1 && styles.dotActive]} />
            {i < events.length - 1 ? <View style={styles.line} /> : null}
          </View>
          <View style={styles.content}>
            <Text style={styles.label}>{event.label}</Text>
            <Text style={styles.date}>{formatDate(event.date)}</Text>
          </View>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { paddingVertical: spacing.sm },
  row: { flexDirection: 'row', minHeight: 40 },
  dotCol: { width: 24, alignItems: 'center' },
  dot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: colors.border,
    marginTop: 4,
  },
  dotActive: { backgroundColor: colors.primary },
  line: {
    width: 2,
    flex: 1,
    backgroundColor: colors.border,
    marginVertical: 2,
  },
  content: {
    flex: 1,
    paddingLeft: spacing.sm,
    paddingBottom: spacing.md,
  },
  label: {
    fontSize: typography.size.base,
    fontWeight: typography.weight.medium,
    color: colors.text,
  },
  date: {
    fontSize: typography.size.sm,
    color: colors.muted,
    marginTop: 2,
  },
});
