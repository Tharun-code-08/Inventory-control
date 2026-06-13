import * as LocalAuthentication from 'expo-local-authentication';
import * as SecureStore from 'expo-secure-store';

export type BiometricCredentials = {
  email: string;
  password: string;
  companyCode: string;
  timestamp: number;
};

export async function isBiometricAvailable(): Promise<boolean> {
  try {
    const compatible = await LocalAuthentication.hasHardwareAsync();
    const enrolled = await LocalAuthentication.isEnrolledAsync();
    return compatible && enrolled;
  } catch {
    return false;
  }
}

export async function saveBiometricCredentials(
  companyCode: string,
  email: string,
  password: string
): Promise<void> {
  try {
    const credentials: BiometricCredentials = {
      companyCode,
      email,
      password,
      timestamp: Date.now(),
    };
    const encrypted = JSON.stringify(credentials);
    await SecureStore.setItemAsync('biometric_credentials', encrypted);
    await SecureStore.setItemAsync('biometric_enabled', 'true');
  } catch (err) {
    console.error('Failed to save biometric credentials:', err);
  }
}

export async function authenticateWithBiometric(): Promise<BiometricCredentials | null> {
  try {
    const enabled = await SecureStore.getItemAsync('biometric_enabled');
    if (enabled !== 'true') {
      return null;
    }

    const auth = await LocalAuthentication.authenticateAsync({
      disableDeviceFallback: false,
      reason: 'Authenticate to access your account',
      fallbackLabel: 'Use passcode',
    });

    if (!auth.success) {
      return null;
    }

    const stored = await SecureStore.getItemAsync('biometric_credentials');
    if (!stored) {
      return null;
    }

    const credentials: BiometricCredentials = JSON.parse(stored);
    // Validate credentials aren't stale (older than 90 days)
    const ninetyDaysMs = 90 * 24 * 60 * 60 * 1000;
    if (Date.now() - credentials.timestamp > ninetyDaysMs) {
      await disableBiometric();
      return null;
    }

    return credentials;
  } catch (err) {
    console.error('Biometric authentication failed:', err);
    return null;
  }
}

export async function isBiometricEnabled(): Promise<boolean> {
  try {
    const enabled = await SecureStore.getItemAsync('biometric_enabled');
    return enabled === 'true';
  } catch {
    return false;
  }
}

export async function disableBiometric(): Promise<void> {
  try {
    await SecureStore.deleteItemAsync('biometric_credentials');
    await SecureStore.deleteItemAsync('biometric_enabled');
  } catch (err) {
    console.error('Failed to disable biometric:', err);
  }
}

export async function getSupportedAuthenticationMethods(): Promise<string[]> {
  try {
    const methods = await LocalAuthentication.supportedAuthenticationTypesAsync();
    const names: string[] = [];

    if (methods.includes(LocalAuthentication.AuthenticationType.FACIAL_RECOGNITION)) {
      names.push('Face ID');
    }
    if (methods.includes(LocalAuthentication.AuthenticationType.FINGERPRINT)) {
      names.push('Fingerprint');
    }
    if (methods.includes(LocalAuthentication.AuthenticationType.IRIS)) {
      names.push('Iris');
    }

    return names;
  } catch {
    return [];
  }
}
