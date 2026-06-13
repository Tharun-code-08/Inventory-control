import { Alert, View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Button, colors } from '@/components/ui';
import { spacing, typography } from '@/theme';
import { saveBiometricCredentials, getSupportedAuthenticationMethods } from '@/lib/biometric';

type Props = {
  visible: boolean;
  companyCode: string;
  email: string;
  password: string;
  onComplete: () => void;
};

export function BiometricSetupSheet({ visible, companyCode, email, password, onComplete }: Props) {
  if (!visible) {
    return null;
  }

  async function onEnable() {
    try {
      const methods = await getSupportedAuthenticationMethods();
      if (methods.length === 0) {
        Alert.alert('Biometric unavailable', 'No biometric authentication method found on this device.');
        onComplete();
        return;
      }

      await saveBiometricCredentials(companyCode, email, password);
      Alert.alert('Biometric enabled', `You can now use ${methods[0]} to log in.`);
      onComplete();
    } catch (err) {
      Alert.alert('Error', 'Could not enable biometric login. Try again later.');
      onComplete();
    }
  }

  function onSkip() {
    onComplete();
  }

  return (
    <View style={styles.overlay}>
      <View style={styles.sheet}>
        <View style={styles.header}>
          <Ionicons name="finger-print-outline" size={48} color={colors.primary} />
          <Text style={styles.title}>Enable Biometric Login?</Text>
          <Text style={styles.subtitle}>Use your fingerprint or face to log in faster next time.</Text>
        </View>

        <View style={styles.features}>
          <View style={styles.feature}>
            <Ionicons name="checkmark-circle" size={20} color={colors.success} />
            <Text style={styles.featureText}>Faster login</Text>
          </View>
          <View style={styles.feature}>
            <Ionicons name="checkmark-circle" size={20} color={colors.success} />
            <Text style={styles.featureText}>More secure</Text>
          </View>
          <View style={styles.feature}>
            <Ionicons name="checkmark-circle" size={20} color={colors.success} />
            <Text style={styles.featureText}>Convenient</Text>
          </View>
        </View>

        <View style={styles.footer}>
          <Button label="Enable" onPress={onEnable} />
          <Button label="Not now" variant="secondary" onPress={onSkip} />
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
    zIndex: 1000,
  },
  sheet: {
    backgroundColor: colors.bg,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingTop: spacing.xl,
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.xl,
  },
  header: {
    alignItems: 'center',
    marginBottom: spacing.xl,
  },
  title: {
    fontSize: typography.size.lg,
    fontWeight: typography.weight.bold as '700',
    color: colors.text,
    marginTop: spacing.md,
  },
  subtitle: {
    fontSize: typography.size.sm,
    color: colors.muted,
    marginTop: spacing.sm,
    textAlign: 'center',
  },
  features: {
    gap: spacing.md,
    marginBottom: spacing.xl,
  },
  feature: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  featureText: {
    fontSize: typography.size.base,
    color: colors.text,
  },
  footer: {
    gap: spacing.md,
  },
});
