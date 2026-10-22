import {
  decryptSecretWithKeys,
  encryptSecret,
  getSmtpCredentialsKey,
  getSmtpCredentialsKeys,
} from './secret-cipher';

describe('secret-cipher SMTP key ring', () => {
  const saved = { ...process.env };
  afterEach(() => {
    process.env = { ...saved };
  });

  it('encrypts with SMTP_CREDENTIALS_KEY and still decrypts JWT-secret payloads', () => {
    process.env.JWT_SECRET = 'jwt-secret';
    delete process.env.APP_SECRET;
    const legacy = encryptSecret('smtp-pass', getSmtpCredentialsKey());

    process.env.SMTP_CREDENTIALS_KEY = 'dedicated-key';
    expect(getSmtpCredentialsKey()).toBe('dedicated-key');
    expect(getSmtpCredentialsKeys()).toEqual(['dedicated-key', 'jwt-secret']);
    expect(decryptSecretWithKeys(legacy, getSmtpCredentialsKeys())).toEqual({
      plaintext: 'smtp-pass',
      keyIndex: 1,
    });

    const current = encryptSecret('smtp-pass', getSmtpCredentialsKey());
    expect(decryptSecretWithKeys(current, getSmtpCredentialsKeys()).keyIndex).toBe(0);
  });

  it('accepts the previous key during a rotation and dedupes keys', () => {
    process.env.JWT_SECRET = 'same';
    process.env.APP_SECRET = 'same';
    process.env.SMTP_CREDENTIALS_KEY_PREVIOUS = 'old-key';
    process.env.SMTP_CREDENTIALS_KEY = 'new-key';
    const old = encryptSecret('p', 'old-key');
    expect(getSmtpCredentialsKeys()).toEqual(['new-key', 'old-key', 'same']);
    expect(decryptSecretWithKeys(old, getSmtpCredentialsKeys()).keyIndex).toBe(1);
  });

  it('throws when no key decrypts', () => {
    const payload = encryptSecret('p', 'other');
    expect(() => decryptSecretWithKeys(payload, ['a', 'b'])).toThrow('could not be decrypted');
  });
});
