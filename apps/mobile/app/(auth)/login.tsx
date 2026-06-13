import { useRef, useState, useEffect } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, Text, TextInput, View, Alert, Pressable } from 'react-native';
import { router } from 'expo-router';
import { Button, Input, Screen, Muted, colors } from '@/components/ui';
import { AppLogo } from '@/components/AppLogo';
import { BiometricSetupSheet } from '@/components/BiometricSetupSheet';
import { getApiOrigin, testApiConnection } from '@/api/client';
import { loginWithCredentials } from '@/lib/session';
import { getApiErrorMessage } from '@/lib/api-error';
import { spacing } from '@/theme';
import * as SecureStore from 'expo-secure-store';
import { Ionicons } from '@expo/vector-icons';
import { authenticateWithBiometric, isBiometricAvailable } from '@/lib/biometric';
import { checkLoginLocked, recordFailedLogin, recordSuccessfulLogin } from '@/lib/login-protection';

export default function LoginScreen() {
  const [companyCode, setCompanyCode] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  const [loading, setLoading] = useState(false);
  const [testing, setTesting] = useState(false);
  const [showBiometricSetup, setShowBiometricSetup] = useState(false);
  const [biometricAvailable, setBiometricAvailable] = useState(false);
  const [attemptingBiometric, setAttemptingBiometric] = useState(false);
  const passwordRef = useRef<TextInput>(null);

  // Load remember me data and check for biometric on mount
  useEffect(() => {
    const init = async () => {
      await loadRememberedCredentials();
      const available = await isBiometricAvailable();
      setBiometricAvailable(available);

      // Auto-login with biometric if available
      if (available) {
        setAttemptingBiometric(true);
        const creds = await authenticateWithBiometric();
        if (creds) {
          try {
            await loginWithCredentials(creds.email, creds.password);
            router.replace('/(app)/(tabs)');
            return;
          } catch (err) {
            // Biometric login failed, show regular login
            console.error('Biometric login failed:', err);
          }
        }
        setAttemptingBiometric(false);
      }
    };
    init();
  }, []);

  async function loadRememberedCredentials() {
    try {
      const saved = await SecureStore.getItemAsync('rememberMe');
      if (saved) {
        const { companyCode: cc, email: e } = JSON.parse(saved);
        setCompanyCode(cc || '');
        setEmail(e || '');
        setRememberMe(true);
      }
    } catch (err) {
      // Ignore errors loading stored data
    }
  }

  async function saveRememberedCredentials() {
    if (rememberMe) {
      try {
        await SecureStore.setItemAsync(
          'rememberMe',
          JSON.stringify({ companyCode, email })
        );
      } catch (err) {
        // Silently fail — just don't persist
      }
    } else {
      try {
        await SecureStore.deleteItemAsync('rememberMe');
      } catch (err) {
        // Ignore
      }
    }
  }

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
    if (!companyCode.trim()) {
      Alert.alert('Company code required', 'Enter your company code.');
      return;
    }
    if (!email.trim() || !password) {
      Alert.alert('Login', 'Enter email and password.');
      return;
    }

    // Check if account is locked
    const { locked, minutesRemaining } = await checkLoginLocked(companyCode.trim(), email.trim());
    if (locked) {
      Alert.alert(
        'Account locked',
        `Too many failed login attempts. Try again in ${minutesRemaining} minute${minutesRemaining !== 1 ? 's' : ''}.`
      );
      return;
    }

    setLoading(true);
    try {
      await saveRememberedCredentials();
      // TODO: Pass company code to loginWithCredentials for multi-tenant validation
      await loginWithCredentials(email.trim(), password);

      // Record successful login (clears failed attempts)
      await recordSuccessfulLogin(companyCode.trim(), email.trim());

      // Show biometric setup if available and not yet enabled
      if (biometricAvailable) {
        setShowBiometricSetup(true);
      } else {
        router.replace('/(app)/(tabs)');
      }
    } catch (err) {
      // Record failed login attempt
      await recordFailedLogin(companyCode.trim(), email.trim());

      // Check if now locked
      const { locked: nowLocked, minutesRemaining: mins } = await checkLoginLocked(
        companyCode.trim(),
        email.trim()
      );
      if (nowLocked) {
        Alert.alert(
          'Account locked',
          `Too many failed login attempts. Try again in ${mins} minute${mins !== 1 ? 's' : ''}.`
        );
      } else {
        Alert.alert('Login failed', getApiErrorMessage(err, 'Invalid credentials or company code'));
      }
    } finally {
      setLoading(false);
    }
  }

  function onBiometricSetupComplete() {
    setShowBiometricSetup(false);
    router.replace('/(app)/(tabs)');
  }

  function onForgotPassword() {
    if (!email.trim()) {
      Alert.alert('Email required', 'Enter your email to reset password.');
      return;
    }
    router.push({ pathname: '/(auth)/forgot-password', params: { email } });
  }

  if (attemptingBiometric) {
    return (
      <Screen style={{ justifyContent: 'center' }}>
        <View style={{ alignItems: 'center' }}>
          <AppLogo height={56} />
          <Muted style={{ marginTop: spacing.lg }}>Authenticating with biometric…</Muted>
        </View>
      </Screen>
    );
  }

  return (
    <>
      <Screen style={{ justifyContent: 'center' }}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <ScrollView keyboardShouldPersistTaps="handled" keyboardDismissMode="on-drag">
            <View style={{ alignItems: 'center', marginBottom: spacing.xl }}>
              <AppLogo height={56} />
            </View>
            <Muted style={{ textAlign: 'center', marginBottom: spacing.lg }}>Sign in with your account</Muted>
          <Input
            autoCapitalize="none"
            placeholder="Company Code"
            returnKeyType="next"
            value={companyCode}
            onChangeText={setCompanyCode}
            onSubmitEditing={() => {
              // Focus email field (we'll need a ref for it)
            }}
            blurOnSubmit={false}
          />
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
          <Pressable
            style={{ flexDirection: 'row', alignItems: 'center', marginTop: spacing.md, marginBottom: spacing.md }}
            onPress={() => setRememberMe(!rememberMe)}
          >
            <Ionicons
              name={rememberMe ? 'checkbox' : 'checkbox-outline'}
              size={20}
              color={colors.primary}
            />
            <Text style={{ marginLeft: spacing.sm, color: colors.text, fontSize: 14 }}>
              Remember me
            </Text>
          </Pressable>
          <Button label="Test API connection" variant="secondary" onPress={onTestApi} loading={testing} />
          <Button label="Sign in" onPress={onLogin} loading={loading} />
          <Pressable onPress={onForgotPassword} style={{ marginTop: spacing.md }}>
            <Text style={{ textAlign: 'center', color: colors.primary, fontSize: 14 }}>
              Forgot password?
            </Text>
          </Pressable>
          <Text style={{ marginTop: 16, fontSize: 12, color: colors.muted, textAlign: 'center' }}>
            API: {getApiOrigin()}/api/v1
          </Text>
            <Text style={{ marginTop: 4, fontSize: 11, color: colors.muted, textAlign: 'center' }}>
              Phone on Wi‑Fi? Use your PC IP in apps/mobile/.env — not localhost.
            </Text>
          </ScrollView>
        </KeyboardAvoidingView>
      </Screen>

      <BiometricSetupSheet
        visible={showBiometricSetup}
        companyCode={companyCode}
        email={email}
        password={password}
        onComplete={onBiometricSetupComplete}
      />
    </>
  );
}
