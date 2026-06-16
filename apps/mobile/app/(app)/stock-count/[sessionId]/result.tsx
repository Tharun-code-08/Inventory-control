import { StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Button, Muted, Screen, Title } from '@/components/ui';
import { colors, spacing } from '@/theme';

export default function AdjustmentResultScreen() {
  const router = useRouter();
  const { sessionId } = useLocalSearchParams<{ sessionId: string }>();

  return (
    <Screen>
      <View style={styles.content}>
        <Ionicons name="checkmark-circle" size={64} color={colors.success} style={styles.icon} />
        <Title>Adjustment posted</Title>
        <Muted style={styles.message}>
          Stock count session {sessionId?.slice(0, 8)} has been adjusted successfully.
        </Muted>
        <View style={styles.action}>
          <Button label="Back to stock count" onPress={() => router.replace('/stock-count')} />
        </View>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  icon: { marginBottom: spacing.md },
  message: { textAlign: 'center', marginTop: spacing.sm },
  action: { marginTop: spacing.xl, alignSelf: 'stretch' },
});
