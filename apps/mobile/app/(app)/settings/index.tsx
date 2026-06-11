import { ScrollView, View, StyleSheet, Alert } from 'react-native';
import { router } from 'expo-router';
import Constants from 'expo-constants';
import { useAuthStore } from '@/store/authStore';
import { logoutSession } from '@/lib/session';
import { Screen, Title, Subtitle, Card, Muted, Button } from '@/components/ui';
import { DetailField } from '@/components/DetailField';
import { colors, spacing } from '@/theme';

export default function SettingsScreen() {
  const user = useAuthStore((s) => s.user);

  async function handleSignOut() {
    Alert.alert('Sign out', 'Leave this session?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Sign out',
        style: 'destructive',
        onPress: async () => {
          await logoutSession();
          router.replace('/(auth)/login');
        },
      },
    ]);
  }

  return (
    <Screen>
      <ScrollView>
        <Title>Settings</Title>

        <Subtitle>Profile</Subtitle>
        <Card>
          <DetailField label="Name" value={user?.name ?? '—'} />
          <DetailField label="Email" value={user?.email ?? '—'} />
          <DetailField label="Role" value={user?.role ?? '—'} />
        </Card>

        {user?.shop ? (
          <>
            <Subtitle>Shop</Subtitle>
            <Card>
              <DetailField label="Name" value={user.shop.shopName} />
              <DetailField label="Number" value={user.shop.shopNumber} />
              <DetailField label="Contact" value={user.shop.contactPerson} />
            </Card>
          </>
        ) : null}

        <Subtitle>About</Subtitle>
        <Card>
          <DetailField label="Version" value={Constants.expoConfig?.version ?? '0.0.1'} />
          <DetailField label="API" value={Constants.expoConfig?.extra?.apiUrl ?? '—'} />
        </Card>

        <View style={styles.signOutWrap}>
          <Button label="Sign out" variant="secondary" onPress={handleSignOut} />
        </View>
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  signOutWrap: { marginTop: spacing.xl },
});
