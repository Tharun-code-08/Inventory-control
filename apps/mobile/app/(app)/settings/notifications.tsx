import { useState, useEffect } from 'react';
import { ScrollView, View, StyleSheet, Switch, Alert } from 'react-native';
import { Screen, Title, Subtitle, Card, Muted, Button } from '@/components/ui';
import { spacing } from '@/theme';
import * as SecureStore from 'expo-secure-store';

type NotificationPreference = {
  type: string;
  label: string;
  category: 'Goods Receipt' | 'Purchase Order' | 'Inventory' | 'Security' | 'System';
  enabled: boolean;
  frequency: 'real-time' | 'daily' | 'weekly' | 'off';
};

const DEFAULT_PREFERENCES: NotificationPreference[] = [
  // GR
  { type: 'GR_CREATED', label: 'GR Created', category: 'Goods Receipt', enabled: true, frequency: 'real-time' },
  { type: 'GR_APPROVED', label: 'GR Approved', category: 'Goods Receipt', enabled: true, frequency: 'real-time' },
  { type: 'GR_REJECTED', label: 'GR Rejected', category: 'Goods Receipt', enabled: true, frequency: 'real-time' },

  // PO
  { type: 'PO_APPROVED', label: 'PO Approved', category: 'Purchase Order', enabled: true, frequency: 'real-time' },
  { type: 'PO_REJECTED', label: 'PO Rejected', category: 'Purchase Order', enabled: true, frequency: 'real-time' },

  // Inventory
  { type: 'LOW_STOCK', label: 'Low Stock', category: 'Inventory', enabled: true, frequency: 'real-time' },
  { type: 'CRITICAL_STOCK', label: 'Critical Stock', category: 'Inventory', enabled: true, frequency: 'real-time' },
  { type: 'TRANSFER_COMPLETED', label: 'Transfer Completed', category: 'Inventory', enabled: true, frequency: 'daily' },

  // Security
  { type: 'NEW_DEVICE_LOGIN', label: 'New Device Login', category: 'Security', enabled: true, frequency: 'real-time' },
  { type: 'PASSWORD_CHANGED', label: 'Password Changed', category: 'Security', enabled: true, frequency: 'real-time' },
  { type: 'SESSION_REVOKED', label: 'Session Revoked', category: 'Security', enabled: true, frequency: 'real-time' },

  // System
  { type: 'MAINTENANCE', label: 'Maintenance', category: 'System', enabled: true, frequency: 'real-time' },
  { type: 'UPDATE', label: 'Updates', category: 'System', enabled: true, frequency: 'daily' },
  { type: 'ANNOUNCEMENT', label: 'Announcements', category: 'System', enabled: true, frequency: 'weekly' },
];

export default function NotificationPreferencesScreen() {
  const [preferences, setPreferences] = useState<NotificationPreference[]>(DEFAULT_PREFERENCES);

  useEffect(() => {
    loadPreferences();
  }, []);

  async function loadPreferences() {
    try {
      const saved = await SecureStore.getItemAsync('notification_preferences');
      if (saved) {
        setPreferences(JSON.parse(saved));
      }
    } catch (err) {
      console.error('Failed to load preferences:', err);
    }
  }

  async function savePreferences() {
    try {
      await SecureStore.setItemAsync('notification_preferences', JSON.stringify(preferences));
      Alert.alert('Success', 'Notification preferences saved');
    } catch (err) {
      Alert.alert('Error', 'Could not save preferences');
    }
  }

  function toggleNotification(type: string) {
    setPreferences((prev) =>
      prev.map((p) => (p.type === type ? { ...p, enabled: !p.enabled } : p))
    );
  }

  function changeFrequency(type: string, frequency: 'real-time' | 'daily' | 'weekly' | 'off') {
    setPreferences((prev) =>
      prev.map((p) => (p.type === type ? { ...p, frequency, enabled: frequency !== 'off' } : p))
    );
  }

  const categories = ['Goods Receipt', 'Purchase Order', 'Inventory', 'Security', 'System'] as const;

  return (
    <Screen>
      <ScrollView>
        <Title>Notification Preferences</Title>
        <Muted style={{ marginBottom: spacing.lg }}>Choose how you want to receive notifications</Muted>

        {categories.map((category) => (
          <View key={category} style={styles.categorySection}>
            <Subtitle>{category}</Subtitle>
            {preferences
              .filter((p) => p.category === category)
              .map((pref) => (
                <Card key={pref.type} style={styles.preferenceCard}>
                  <View style={styles.preferenceHeader}>
                    <View style={styles.preferenceLabel}>
                      <Muted style={styles.preferenceName}>{pref.label}</Muted>
                    </View>
                    <Switch
                      value={pref.enabled}
                      onValueChange={() => toggleNotification(pref.type)}
                    />
                  </View>

                  {pref.enabled && (
                    <View style={styles.frequencyOptions}>
                      {(['real-time', 'daily', 'weekly'] as const).map((freq) => (
                        <Button
                          key={freq}
                          label={freq.charAt(0).toUpperCase() + freq.slice(1)}
                          variant={pref.frequency === freq ? 'primary' : 'secondary'}
                          size="sm"
                          onPress={() => changeFrequency(pref.type, freq)}
                        />
                      ))}
                    </View>
                  )}
                </Card>
              ))}
          </View>
        ))}

        <View style={styles.actions}>
          <Button label="Save Preferences" onPress={savePreferences} />
        </View>
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  categorySection: {
    marginBottom: spacing.lg,
  },
  preferenceCard: {
    marginBottom: spacing.md,
  },
  preferenceHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  preferenceLabel: {
    flex: 1,
  },
  preferenceName: {
    fontWeight: '600',
  },
  frequencyOptions: {
    flexDirection: 'row',
    gap: spacing.sm,
    paddingTop: spacing.md,
    borderTopColor: '#e5e7eb',
    borderTopWidth: 1,
  },
  actions: {
    marginTop: spacing.xl,
  },
});
