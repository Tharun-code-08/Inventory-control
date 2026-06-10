import { useRef, useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, Text, TextInput, Alert } from 'react-native';
import { router } from 'expo-router';
import { Button, Input, Screen, Title, Muted, colors } from '@/components/ui';
import { getApiOrigin, testApiConnection } from '@/api/client';
import { loginWithCredentials } from '@/lib/session';
import { getApiErrorMessage } from '@/lib/api-error';

export default function LoginScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [testing, setTesting] = useState(false);
  const passwordRef = useRef<TextInput>(null);

  async function onTestApi() {
    setTesting(true);
    try {
      const result = await testApiConnection();
      Alert.alert(result.ok ? 'API reachable' : 'Cannot reach API', result.message);
    } finally {
      setTesting(false);
    }
  }

  async function onLogin() {
    if (!email.trim() || !password) {
      Alert.alert('Login', 'Enter email and password.');
      return;
    }
    setLoading(true);
    try {
      await loginWithCredentials(email.trim(), password);
      router.replace('/(app)');
    } catch (err) {
      Alert.alert('Login failed', getApiErrorMessage(err, 'Invalid credentials'));
    } finally {
      setLoading(false);
    }
  }

  return (
    <Screen style={{ justifyContent: 'center' }}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView keyboardShouldPersistTaps="handled" keyboardDismissMode="on-drag">
          <Title>SoftdigitIMS</Title>
          <Muted>Warehouse mobile — sign in with your account</Muted>
          <Input
            autoCapitalize="none"
            autoComplete="email"
            textContentType="emailAddress"
            keyboardType="email-address"
            returnKeyType="next"
            placeholder="Email"
            value={email}
            onChangeText={setEmail}
            onSubmitEditing={() => passwordRef.current?.focus()}
            blurOnSubmit={false}
          />
          <Input
            ref={passwordRef}
            placeholder="Password"
            secureTextEntry
            autoComplete="password"
            textContentType="password"
            returnKeyType="done"
            value={password}
            onChangeText={setPassword}
            onSubmitEditing={onLogin}
          />
          <Button label="Test API connection" variant="secondary" onPress={onTestApi} loading={testing} />
          <Button label="Sign in" onPress={onLogin} loading={loading} />
          <Text style={{ marginTop: 16, fontSize: 12, color: colors.muted, textAlign: 'center' }}>
            API: {getApiOrigin()}/api/v1
          </Text>
          <Text style={{ marginTop: 4, fontSize: 11, color: colors.muted, textAlign: 'center' }}>
            Phone on Wi‑Fi? Use your PC IP in apps/mobile/.env — not localhost.
          </Text>
        </ScrollView>
      </KeyboardAvoidingView>
    </Screen>
  );
}
