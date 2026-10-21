import { useState, useRef } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, Text, TextInput, View, Alert } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { Button, Input, Screen, Muted } from '@/components/ui';
import { AppLogo } from '@/components/AppLogo';
import { api } from '@/api/client';
import { getApiErrorMessage } from '@/lib/api-error';
import { spacing } from '@/theme';

type ForgotPasswordStep = 'email' | 'reset' | 'success';

export default function ForgotPasswordScreen() {
  const params = useLocalSearchParams<{ email?: string }>();
  const [step, setStep] = useState<ForgotPasswordStep>('email');
  const [email, setEmail] = useState(params.email ?? '');
  const [resetToken, setResetToken] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const passwordRef = useRef<TextInput>(null);
  const confirmRef = useRef<TextInput>(null);

  async function onRequestReset() {
    if (!email.trim()) {
      Alert.alert('Email required', 'Enter your email address.');
      return;
    }
    setLoading(true);
    try {
      await api.post('/auth/password-reset/request', { email: email.trim(), method: 'otp' });
      Alert.alert(
        'Check your email',
        'If an account exists with this email, you will receive a 6-digit reset code.'
      );
      setStep('reset');
    } catch (err) {
      Alert.alert('Error', getApiErrorMessage(err, 'Could not process request.'));
    } finally {
      setLoading(false);
    }
  }

  async function onResetPassword() {
    if (!/^\d{6}$/.test(resetToken.trim())) {
      Alert.alert('Code required', 'Enter the 6-digit code from the reset email.');
      return;
    }
    if (!newPassword || !confirmPassword) {
      Alert.alert('Passwords required', 'Enter and confirm your new password.');
      return;
    }
    if (newPassword !== confirmPassword) {
      Alert.alert('Passwords do not match', 'Please try again.');
      return;
    }
    // Same rules as the API: 10+ characters with a letter, a number and a symbol.
    if (newPassword.length < 10 || !/^(?=.*[A-Za-z])(?=.*\d)(?=.*[^A-Za-z0-9]).+$/.test(newPassword)) {
      Alert.alert(
        'Password too weak',
        'Use at least 10 characters, including a letter, a number and a symbol.',
      );
      return;
    }
    setLoading(true);
    try {
      await api.post('/auth/password-reset/otp/complete', {
        email: email.trim(),
        otp: resetToken.trim(),
        newPassword,
      });
      setStep('success');
    } catch (err) {
      Alert.alert('Error', getApiErrorMessage(err, 'Could not reset password.'));
    } finally {
      setLoading(false);
    }
  }

  function onBackToLogin() {
    router.replace('/(auth)/login');
  }

  return (
    <Screen style={{ justifyContent: 'center' }}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView keyboardShouldPersistTaps="handled" keyboardDismissMode="on-drag">
          <View style={{ alignItems: 'center', marginBottom: spacing.xl }}>
            <AppLogo height={56} />
          </View>

          {step === 'email' && (
            <>
              <Text style={{ fontSize: 18, fontWeight: 'bold', marginBottom: spacing.lg, textAlign: 'center' }}>
                Reset Password
              </Text>
              <Muted style={{ textAlign: 'center', marginBottom: spacing.lg }}>
                Enter your email to receive a 6-digit reset code.
              </Muted>
              <Input
                autoCapitalize="none"
                autoComplete="email"
                textContentType="emailAddress"
                keyboardType="email-address"
                returnKeyType="done"
                placeholder="Email"
                value={email}
                onChangeText={setEmail}
                onSubmitEditing={onRequestReset}
              />
              <Button label="Send reset code" onPress={onRequestReset} loading={loading} />
              <Button label="Back to login" variant="secondary" onPress={onBackToLogin} />
            </>
          )}

          {step === 'reset' && (
            <>
              <Text style={{ fontSize: 18, fontWeight: 'bold', marginBottom: spacing.lg, textAlign: 'center' }}>
                Enter Reset Code
              </Text>
              <Muted style={{ textAlign: 'center', marginBottom: spacing.lg }}>
                Check your email for the reset code.
              </Muted>
              <Input
                placeholder="6-digit code"
                returnKeyType="next"
                value={resetToken}
                onChangeText={setResetToken}
                onSubmitEditing={() => passwordRef.current?.focus()}
                blurOnSubmit={false}
              />
              <Input
                ref={passwordRef}
                placeholder="New password"
                secureTextEntry
                returnKeyType="next"
                value={newPassword}
                onChangeText={setNewPassword}
                onSubmitEditing={() => confirmRef.current?.focus()}
                blurOnSubmit={false}
              />
              <Input
                ref={confirmRef}
                placeholder="Confirm password"
                secureTextEntry
                returnKeyType="done"
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                onSubmitEditing={onResetPassword}
              />
              <Button label="Reset password" onPress={onResetPassword} loading={loading} />
              <Button label="Back to login" variant="secondary" onPress={onBackToLogin} />
            </>
          )}

          {step === 'success' && (
            <>
              <Text style={{ fontSize: 18, fontWeight: 'bold', marginBottom: spacing.lg, textAlign: 'center' }}>
                Password reset successful!
              </Text>
              <Muted style={{ textAlign: 'center', marginBottom: spacing.lg }}>
                Your password has been updated. You can now log in with your new password.
              </Muted>
              <Button label="Back to login" onPress={onBackToLogin} />
            </>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </Screen>
  );
}
