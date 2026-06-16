import * as SecureStore from 'expo-secure-store';

type LoginAttemptRecord = {
  email: string;
  companyCode: string;
  failedAttempts: number;
  lastFailedAt: number;
  lockedUntil: number | null;
};

const FAILED_ATTEMPT_KEY = 'login_attempts';
const MAX_FAILED_ATTEMPTS = 5;
const LOCKOUT_DURATION_MS = 15 * 60 * 1000; // 15 minutes

export async function checkLoginLocked(
  companyCode: string,
  email: string
): Promise<{ locked: boolean; minutesRemaining: number }> {
  try {
    const record = await getLoginAttemptRecord(companyCode, email);
    if (!record) {
      return { locked: false, minutesRemaining: 0 };
    }

    const now = Date.now();
    if (record.lockedUntil && now < record.lockedUntil) {
      const minutesRemaining = Math.ceil((record.lockedUntil - now) / 60000);
      return { locked: true, minutesRemaining };
    }

    // Lock expired, reset
    if (record.lockedUntil && now >= record.lockedUntil) {
      await clearLoginAttempts(companyCode, email);
    }

    return { locked: false, minutesRemaining: 0 };
  } catch (err) {
    console.error('Error checking login lock:', err);
    return { locked: false, minutesRemaining: 0 };
  }
}

export async function recordFailedLogin(companyCode: string, email: string): Promise<void> {
  try {
    let record = await getLoginAttemptRecord(companyCode, email);

    if (!record) {
      record = {
        email,
        companyCode,
        failedAttempts: 1,
        lastFailedAt: Date.now(),
        lockedUntil: null,
      };
    } else {
      record.failedAttempts += 1;
      record.lastFailedAt = Date.now();

      // Lock after 5 failed attempts
      if (record.failedAttempts >= MAX_FAILED_ATTEMPTS) {
        record.lockedUntil = Date.now() + LOCKOUT_DURATION_MS;
      }
    }

    const key = getAttemptKey(companyCode, email);
    await SecureStore.setItemAsync(key, JSON.stringify(record));
  } catch (err) {
    console.error('Error recording failed login:', err);
  }
}

export async function recordSuccessfulLogin(companyCode: string, email: string): Promise<void> {
  try {
    await clearLoginAttempts(companyCode, email);
  } catch (err) {
    console.error('Error clearing login attempts:', err);
  }
}

export async function clearLoginAttempts(companyCode: string, email: string): Promise<void> {
  try {
    const key = getAttemptKey(companyCode, email);
    await SecureStore.deleteItemAsync(key);
  } catch (err) {
    console.error('Error clearing login attempts:', err);
  }
}

async function getLoginAttemptRecord(
  companyCode: string,
  email: string
): Promise<LoginAttemptRecord | null> {
  try {
    const key = getAttemptKey(companyCode, email);
    const data = await SecureStore.getItemAsync(key);
    return data ? JSON.parse(data) : null;
  } catch (err) {
    console.error('Error getting login attempt record:', err);
    return null;
  }
}

function getAttemptKey(companyCode: string, email: string): string {
  // SecureStore keys may only contain alphanumeric characters plus ".", "-",
  // and "_". Company codes and emails contain "@", ".", and other characters,
  // so sanitize every dynamic segment to a safe form before composing the key.
  const safe = (value: string) => value.toLowerCase().replace(/[^a-z0-9._-]/g, '_');
  return `${FAILED_ATTEMPT_KEY}_${safe(companyCode)}_${safe(email)}`;
}
