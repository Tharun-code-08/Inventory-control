import { BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
import * as QRCode from 'qrcode';
import { generateSecret, generateURI, verifySync } from 'otplib';
import { MfaService } from './mfa.service';

jest.mock('bcrypt');
jest.mock('qrcode', () => ({
  toDataURL: jest.fn(),
}));
jest.mock('otplib', () => ({
  generateSecret: jest.fn(),
  generateURI: jest.fn(),
  verifySync: jest.fn(),
}));

type Mock = jest.Mock;

function makeConfig(overrides: Record<string, unknown> = {}): ConfigService {
  const values: Record<string, unknown> = {
    BCRYPT_ROUNDS: 10,
    MFA_CHALLENGE_TTL_MIN: 15,
    MFA_LOGIN_MAX_ATTEMPTS: 5,
    MFA_BACKUP_CODE_COUNT: 4,
    JWT_SECRET: 'jwt-secret-12345678901234567890123456789012',
    REFRESH_SECRET: 'refresh-secret-12345678901234567890123456789012',
    ...overrides,
  };
  return {
    get: jest.fn((key: string, def?: unknown) => values[key] ?? def),
  } as unknown as ConfigService;
}

function makePrisma() {
  const tx = {
    user: { update: jest.fn() },
    authChallenge: { update: jest.fn() },
    userBackupCode: {
      deleteMany: jest.fn(),
      createMany: jest.fn(),
      update: jest.fn(),
    },
    trustedMfaDevice: {
      updateMany: jest.fn(),
    },
  };

  return {
    user: {
      findUnique: jest.fn(),
    },
    authChallenge: {
      updateMany: jest.fn(),
      create: jest.fn(),
      findFirst: jest.fn(),
      update: jest.fn(),
    },
    signupVerification: {
      findFirst: jest.fn(),
      update: jest.fn(),
    },
    trustedMfaDevice: {
      findFirst: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      updateMany: jest.fn(),
    },
    userBackupCode: {
      findMany: jest.fn(),
    },
    $transaction: jest.fn(async (arg: unknown) => {
      if (typeof arg === 'function') {
        return (arg as (tx: typeof tx) => Promise<unknown>)(tx);
      }
      return arg;
    }),
    __tx: tx,
  } as unknown as {
    user: {
      findUnique: Mock;
    };
    authChallenge: {
      updateMany: Mock;
      create: Mock;
      findFirst: Mock;
      update: Mock;
    };
    signupVerification: {
      findFirst: Mock;
      update: Mock;
    };
    trustedMfaDevice: {
      findFirst: Mock;
      create: Mock;
      update: Mock;
      updateMany: Mock;
    };
    userBackupCode: {
      findMany: Mock;
    };
    $transaction: Mock;
    __tx: typeof tx;
  };
}

function makeAuth() {
  return {
    lockAccountForMfa: jest.fn().mockResolvedValue(new Date('2026-05-25T10:20:00.000Z')),
    issueSessionForUser: jest.fn().mockResolvedValue({
      accessToken: 'access-token',
      refreshCookieValue: 'refresh-cookie',
      sessionId: 'session-1',
      user: { id: 'user-1', email: 'owner@example.com' },
    }),
  };
}

describe('MfaService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (bcrypt.hash as Mock).mockImplementation(async (value: string) => `hash:${value}`);
    (bcrypt.compare as Mock).mockImplementation(async (value: string, hash: string) => hash === `hash:${value}`);
    (QRCode.toDataURL as Mock).mockResolvedValue('data:image/png;base64,qr');
    (generateSecret as Mock).mockReturnValue('JBSWY3DPEHPK3PXP');
    (generateURI as Mock).mockReturnValue('otpauth://totp/Retail%20IMS:owner@example.com');
    (verifySync as Mock).mockReturnValue({ valid: true, delta: 0 });
  });

  it('starts staged signup enrollment with encrypted secret storage', async () => {
    const prisma = makePrisma();
    const auth = makeAuth();
    const svc = new MfaService(prisma as never, makeConfig(), auth as never);

    prisma.signupVerification.findFirst.mockResolvedValue({
      id: 'signup-1',
      email: 'owner@example.com',
      payload: {
        plan: 'trial',
        billing: 'monthly',
        otpVerifiedAt: '2026-05-25T10:00:00.000Z',
      },
      sessionTokenHash: 'hash',
      totpSecretEncrypted: null,
      attemptCount: 0,
      consumedAt: null,
      expiresAt: new Date('2026-05-25T10:15:00.000Z'),
      createdAt: new Date('2026-05-25T10:00:00.000Z'),
    });

    const start = await svc.startEnrollment('signup-token');

    expect(start.manualCode).toBe('JBSWY3DPEHPK3PXP');
    expect(start.qrCodeDataUrl).toContain('data:image/png');
    expect(prisma.signupVerification.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          totpSecretEncrypted: expect.any(String),
        }),
      }),
    );
    const storedSecret = prisma.signupVerification.update.mock.calls[0][0].data
      .totpSecretEncrypted as string;
    expect(storedSecret).not.toBe('JBSWY3DPEHPK3PXP');
  });

  it('falls back to manual setup when QR rendering fails', async () => {
    const prisma = makePrisma();
    const auth = makeAuth();
    const svc = new MfaService(prisma as never, makeConfig(), auth as never);

    prisma.signupVerification.findFirst.mockResolvedValue({
      id: 'signup-qr-fallback',
      email: 'owner@example.com',
      payload: {
        plan: 'trial',
        billing: 'monthly',
        otpVerifiedAt: '2026-05-25T10:00:00.000Z',
      },
      sessionTokenHash: 'hash',
      totpSecretEncrypted: null,
      attemptCount: 0,
      consumedAt: null,
      expiresAt: new Date('2026-05-25T10:15:00.000Z'),
      createdAt: new Date('2026-05-25T10:00:00.000Z'),
    });
    (QRCode.toDataURL as Mock).mockRejectedValueOnce(new Error('qrcode unavailable'));

    const start = await svc.startEnrollment('signup-token');

    expect(start.manualCode).toBe('JBSWY3DPEHPK3PXP');
    expect(start.qrCodeDataUrl).toBeNull();
  });

  it('verifies staged enrollment and stores backup codes in the pending signup payload', async () => {
    const prisma = makePrisma();
    const auth = makeAuth();
    const svc = new MfaService(prisma as never, makeConfig({ MFA_BACKUP_CODE_COUNT: 4 }), auth as never);
    const encrypted = (svc as unknown as { encryptSecret: (value: string) => string }).encryptSecret(
      'JBSWY3DPEHPK3PXP',
    );

    prisma.signupVerification.findFirst.mockResolvedValue({
      id: 'signup-2',
      email: 'owner@example.com',
      payload: {
        plan: 'trial',
        billing: 'monthly',
        otpVerifiedAt: '2026-05-25T10:00:00.000Z',
      },
      sessionTokenHash: 'hash',
      totpSecretEncrypted: encrypted,
      attemptCount: 0,
      expiresAt: new Date('2026-05-25T10:15:00.000Z'),
      consumedAt: null,
      createdAt: new Date('2026-05-25T10:00:00.000Z'),
    });

    const result = await svc.verifyEnrollment({ token: 'challenge-token', code: '123456' });

    expect(result.backupCodes).toHaveLength(4);
    expect(prisma.signupVerification.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          payload: expect.objectContaining({
            mfaMethod: 'totp',
            backupCodeHashes: expect.arrayContaining([expect.stringContaining('hash:')]),
          }),
        }),
      }),
    );
    expect(auth.issueSessionForUser).not.toHaveBeenCalled();
  });

  it('starts account MFA enrollment for a logged-in user who skipped setup at signup', async () => {
    const prisma = makePrisma();
    const auth = makeAuth();
    const svc = new MfaService(prisma as never, makeConfig(), auth as never);

    prisma.user.findUnique.mockResolvedValue({
      id: 'user-1',
      email: 'owner@example.com',
      isActive: true,
      mfaEnabled: false,
      mfaMethod: null,
      mfaEnrolledAt: null,
      mfaSecretEncrypted: null,
    });
    prisma.authChallenge.create.mockResolvedValue({
      id: 'challenge-account-1',
      userId: 'user-1',
      purpose: 'SIGNUP_MFA_ENROLL',
      tokenHash: 'hash',
      totpSecretEncrypted: null,
      attemptCount: 0,
      expiresAt: new Date('2026-05-25T10:15:00.000Z'),
      consumedAt: null,
      createdAt: new Date('2026-05-25T10:00:00.000Z'),
    });

    const result = await svc.startAccountEnrollment('user-1');

    expect(result.challengeToken).toEqual(expect.any(String));
    expect(result.manualCode).toBe('JBSWY3DPEHPK3PXP');
    expect(result.qrCodeDataUrl).toContain('data:image/png');
    expect(prisma.authChallenge.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          userId: 'user-1',
          purpose: 'SIGNUP_MFA_ENROLL',
        }),
      }),
    );
    expect(prisma.authChallenge.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'challenge-account-1' },
        data: expect.objectContaining({
          totpSecretEncrypted: expect.any(String),
        }),
      }),
    );
  });

  it('verifies account MFA enrollment and persists the real user MFA settings', async () => {
    const prisma = makePrisma();
    const auth = makeAuth();
    const svc = new MfaService(prisma as never, makeConfig({ MFA_BACKUP_CODE_COUNT: 4 }), auth as never);
    const encrypted = (svc as unknown as { encryptSecret: (value: string) => string }).encryptSecret(
      'JBSWY3DPEHPK3PXP',
    );

    prisma.authChallenge.findFirst.mockResolvedValue({
      id: 'challenge-account-2',
      userId: 'user-1',
      purpose: 'SIGNUP_MFA_ENROLL',
      tokenHash: 'hash',
      totpSecretEncrypted: encrypted,
      attemptCount: 0,
      expiresAt: new Date('2026-05-25T10:15:00.000Z'),
      consumedAt: null,
      createdAt: new Date('2026-05-25T10:00:00.000Z'),
      user: {
        id: 'user-1',
        email: 'owner@example.com',
        isActive: true,
        mfaEnabled: false,
        mfaSecretEncrypted: null,
      },
    });

    const result = await svc.verifyAccountEnrollment('user-1', {
      token: 'challenge-token',
      code: '123456',
    });

    expect(result.backupCodes).toHaveLength(4);
    expect(prisma.__tx.user.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'user-1' },
        data: expect.objectContaining({
          mfaEnabled: true,
          mfaMethod: 'TOTP',
          mfaSecretEncrypted: encrypted,
        }),
      }),
    );
    expect(prisma.__tx.userBackupCode.deleteMany).toHaveBeenCalledWith({ where: { userId: 'user-1' } });
    expect(prisma.__tx.userBackupCode.createMany).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.arrayContaining([
          expect.objectContaining({ userId: 'user-1', codeHash: expect.stringContaining('hash:') }),
        ]),
      }),
    );
  });

  it('regenerates backup codes for an already-enabled MFA user after TOTP confirmation', async () => {
    const prisma = makePrisma();
    const auth = makeAuth();
    const svc = new MfaService(prisma as never, makeConfig({ MFA_BACKUP_CODE_COUNT: 4 }), auth as never);
    const encrypted = (svc as unknown as { encryptSecret: (value: string) => string }).encryptSecret(
      'JBSWY3DPEHPK3PXP',
    );

    prisma.user.findUnique.mockResolvedValue({
      id: 'user-1',
      email: 'owner@example.com',
      isActive: true,
      mfaEnabled: true,
      mfaMethod: 'TOTP',
      mfaEnrolledAt: new Date('2026-05-25T10:00:00.000Z'),
      mfaSecretEncrypted: encrypted,
    });

    const result = await svc.regenerateBackupCodes('user-1', { code: '123456' });

    expect(result.backupCodes).toHaveLength(4);
    expect(prisma.__tx.userBackupCode.deleteMany).toHaveBeenCalledWith({ where: { userId: 'user-1' } });
    expect(prisma.__tx.userBackupCode.createMany).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.arrayContaining([
          expect.objectContaining({ userId: 'user-1', codeHash: expect.stringContaining('hash:') }),
        ]),
      }),
    );
  });

  it('disables MFA, deletes backup codes, and revokes trusted devices after TOTP confirmation', async () => {
    const prisma = makePrisma();
    const auth = makeAuth();
    const svc = new MfaService(prisma as never, makeConfig(), auth as never);
    const encrypted = (svc as unknown as { encryptSecret: (value: string) => string }).encryptSecret(
      'JBSWY3DPEHPK3PXP',
    );

    prisma.user.findUnique.mockResolvedValue({
      id: 'user-1',
      email: 'owner@example.com',
      isActive: true,
      mfaEnabled: true,
      mfaMethod: 'TOTP',
      mfaEnrolledAt: new Date('2026-05-25T10:00:00.000Z'),
      mfaSecretEncrypted: encrypted,
    });

    const result = await svc.disableAccountMfa('user-1', { code: '123456' });

    expect(result).toEqual({
      enabled: false,
      method: null,
      enrolledAt: null,
    });
    expect(prisma.__tx.user.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'user-1' },
        data: expect.objectContaining({
          mfaEnabled: false,
          mfaMethod: null,
          mfaEnrolledAt: null,
          mfaSecretEncrypted: null,
        }),
      }),
    );
    expect(prisma.__tx.userBackupCode.deleteMany).toHaveBeenCalledWith({ where: { userId: 'user-1' } });
    expect(prisma.__tx.trustedMfaDevice.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { userId: 'user-1', revokedAt: null },
        data: { revokedAt: expect.any(Date) },
      }),
    );
  });

  it('accepts a backup code once and consumes it during login verification', async () => {
    const prisma = makePrisma();
    const auth = makeAuth();
    const svc = new MfaService(prisma as never, makeConfig(), auth as never);

    prisma.authChallenge.findFirst.mockResolvedValue({
      id: 'challenge-3',
      userId: 'user-1',
      purpose: 'LOGIN_MFA_VERIFY',
      tokenHash: 'hash',
      totpSecretEncrypted: 'ignored',
      attemptCount: 0,
      expiresAt: new Date('2026-05-25T10:15:00.000Z'),
      consumedAt: null,
      createdAt: new Date('2026-05-25T10:00:00.000Z'),
      user: {
        id: 'user-1',
        email: 'owner@example.com',
        isActive: true,
        mfaEnabled: true,
        mfaSecretEncrypted: 'ignored',
      },
    });
    prisma.userBackupCode.findMany.mockResolvedValue([
      { id: 'backup-1', codeHash: 'hash:ABCDEFGH' },
    ]);

    const result = await svc.verifyLogin({
      challengeToken: 'challenge-token',
      backupCode: 'ABCD-EFGH',
    });

    expect(result.accessToken).toBe('access-token');
    expect(prisma.__tx.userBackupCode.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'backup-1' },
        data: expect.objectContaining({ consumedAt: expect.any(Date) }),
      }),
    );
  });

  it('creates and accepts a trusted device token after successful TOTP login verification', async () => {
    const prisma = makePrisma();
    const auth = makeAuth();
    const svc = new MfaService(prisma as never, makeConfig({ MFA_TRUSTED_DEVICE_DAYS: 7 }), auth as never);
    const encrypted = (svc as unknown as { encryptSecret: (value: string) => string }).encryptSecret(
      'JBSWY3DPEHPK3PXP',
    );

    prisma.authChallenge.findFirst.mockResolvedValue({
      id: 'challenge-remember',
      userId: 'user-1',
      purpose: 'LOGIN_MFA_VERIFY',
      tokenHash: 'hash',
      totpSecretEncrypted: null,
      attemptCount: 0,
      expiresAt: new Date('2026-05-25T10:15:00.000Z'),
      consumedAt: null,
      createdAt: new Date('2026-05-25T10:00:00.000Z'),
      user: {
        id: 'user-1',
        email: 'owner@example.com',
        isActive: true,
        mfaEnabled: true,
        mfaSecretEncrypted: encrypted,
      },
    });

    const result = await svc.verifyLogin({
      challengeToken: 'challenge-token',
      code: '123456',
      rememberDevice: true,
    });

    expect(result).toEqual(
      expect.objectContaining({
        accessToken: 'access-token',
        trustedDeviceToken: expect.any(String),
      }),
    );
    expect(prisma.trustedMfaDevice.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          userId: 'user-1',
          tokenHash: expect.any(String),
          expiresAt: expect.any(Date),
        }),
      }),
    );
  });

  it('restarts signup enrollment by issuing a fresh challenge token', async () => {
    const prisma = makePrisma();
    const auth = makeAuth();
    const svc = new MfaService(prisma as never, makeConfig(), auth as never);

    prisma.signupVerification.findFirst.mockResolvedValue({
      id: 'signup-restart',
      email: 'owner@example.com',
      payload: {
        plan: 'trial',
        billing: 'monthly',
        otpVerifiedAt: '2026-05-25T10:00:00.000Z',
        mfaMethod: 'totp',
        mfaVerifiedAt: '2026-05-25T10:05:00.000Z',
        backupCodeHashes: ['hash:AAAA'],
      },
      sessionTokenHash: 'hash',
      totpSecretEncrypted: null,
      attemptCount: 5,
      expiresAt: new Date('2026-05-25T10:15:00.000Z'),
      consumedAt: null,
      createdAt: new Date('2026-05-25T10:00:00.000Z'),
    });

    const result = await svc.restartEnrollment('old-token');

    expect(prisma.signupVerification.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'signup-restart' },
        data: expect.objectContaining({
          sessionTokenHash: expect.any(String),
          totpSecretEncrypted: null,
          attemptCount: 0,
          payload: expect.objectContaining({
            mfaMethod: undefined,
            mfaVerifiedAt: undefined,
            backupCodeHashes: undefined,
          }),
        }),
      }),
    );
    expect(result).toEqual(
      expect.objectContaining({
        mfaSetupRequired: true,
        challengeToken: expect.any(String),
        email: 'owner@example.com',
      }),
    );
  });

  it('increments attempts and rejects invalid TOTP login challenges', async () => {
    const prisma = makePrisma();
    const auth = makeAuth();
    const svc = new MfaService(prisma as never, makeConfig(), auth as never);
    const encrypted = (svc as unknown as { encryptSecret: (value: string) => string }).encryptSecret(
      'JBSWY3DPEHPK3PXP',
    );

    prisma.authChallenge.findFirst.mockResolvedValue({
      id: 'challenge-4',
      userId: 'user-1',
      purpose: 'LOGIN_MFA_VERIFY',
      tokenHash: 'hash',
      totpSecretEncrypted: null,
      attemptCount: 0,
      expiresAt: new Date('2026-05-25T10:15:00.000Z'),
      consumedAt: null,
      createdAt: new Date('2026-05-25T10:00:00.000Z'),
      user: {
        id: 'user-1',
        email: 'owner@example.com',
        isActive: true,
        mfaEnabled: true,
        mfaSecretEncrypted: encrypted,
      },
    });
    (verifySync as Mock).mockReturnValueOnce({ valid: false, delta: null });

    await expect(
      svc.verifyLogin({ challengeToken: 'challenge-token', code: '111111' }),
    ).rejects.toBeInstanceOf(BadRequestException);

    expect(prisma.authChallenge.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'challenge-4' },
        data: expect.objectContaining({
          attemptCount: { increment: 1 },
        }),
      }),
    );
    expect(auth.lockAccountForMfa).not.toHaveBeenCalled();
  });

  it('locks the account after exhausting MFA challenge attempts', async () => {
    const prisma = makePrisma();
    const auth = makeAuth();
    const svc = new MfaService(prisma as never, makeConfig(), auth as never);
    const encrypted = (svc as unknown as { encryptSecret: (value: string) => string }).encryptSecret(
      'JBSWY3DPEHPK3PXP',
    );

    prisma.authChallenge.findFirst.mockResolvedValue({
      id: 'challenge-5',
      userId: 'user-1',
      purpose: 'LOGIN_MFA_VERIFY',
      tokenHash: 'hash',
      totpSecretEncrypted: null,
      attemptCount: 4,
      expiresAt: new Date('2026-05-25T10:15:00.000Z'),
      consumedAt: null,
      createdAt: new Date('2026-05-25T10:00:00.000Z'),
      user: {
        id: 'user-1',
        email: 'owner@example.com',
        isActive: true,
        mfaEnabled: true,
        mfaSecretEncrypted: encrypted,
      },
    });
    (verifySync as Mock).mockReturnValueOnce({ valid: false, delta: null });

    await expect(
      svc.verifyLogin({ challengeToken: 'challenge-token', code: '111111' }),
    ).rejects.toBeInstanceOf(BadRequestException);

    expect(auth.lockAccountForMfa).toHaveBeenCalledWith('user-1');
  });
});
