import { BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
import QRCode from 'qrcode';
import { generateSecret, generateURI, verifySync } from 'otplib';
import { MfaService } from './mfa.service';

jest.mock('bcrypt');
jest.mock('qrcode', () => ({
  __esModule: true,
  default: {
    toDataURL: jest.fn(),
  },
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
  };

  return {
    authChallenge: {
      updateMany: jest.fn(),
      create: jest.fn(),
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
    authChallenge: {
      updateMany: Mock;
      create: Mock;
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

  it('creates a signup enrollment challenge and starts enrollment with encrypted storage', async () => {
    const prisma = makePrisma();
    const auth = makeAuth();
    const svc = new MfaService(prisma as never, makeConfig(), auth as never);

    prisma.authChallenge.create.mockResolvedValue({
      id: 'challenge-1',
      expiresAt: new Date('2026-05-25T10:15:00.000Z'),
    });
    const challenge = await svc.createSignupEnrollmentChallenge('user-1', 'owner@example.com');

    prisma.authChallenge.findFirst.mockResolvedValue({
      id: 'challenge-1',
      userId: 'user-1',
      purpose: 'SIGNUP_MFA_ENROLL',
      tokenHash: 'hash',
      totpSecretEncrypted: null,
      attemptCount: 0,
      expiresAt: new Date('2026-05-25T10:15:00.000Z'),
      consumedAt: null,
      createdAt: new Date('2026-05-25T10:00:00.000Z'),
      user: { id: 'user-1', email: 'owner@example.com', isActive: true },
    });

    const start = await svc.startEnrollment(challenge.challengeToken);

    expect(start.manualCode).toBe('JBSWY3DPEHPK3PXP');
    expect(start.qrCodeDataUrl).toContain('data:image/png');
    expect(prisma.authChallenge.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          totpSecretEncrypted: expect.any(String),
        }),
      }),
    );
    const storedSecret = prisma.authChallenge.update.mock.calls[0][0].data.totpSecretEncrypted as string;
    expect(storedSecret).not.toBe('JBSWY3DPEHPK3PXP');
  });

  it('verifies enrollment, stores backup codes as hashes, and returns a real session', async () => {
    const prisma = makePrisma();
    const auth = makeAuth();
    const svc = new MfaService(prisma as never, makeConfig({ MFA_BACKUP_CODE_COUNT: 4 }), auth as never);
    const encrypted = (svc as unknown as { encryptSecret: (value: string) => string }).encryptSecret(
      'JBSWY3DPEHPK3PXP',
    );

    prisma.authChallenge.findFirst.mockResolvedValue({
      id: 'challenge-2',
      userId: 'user-1',
      purpose: 'SIGNUP_MFA_ENROLL',
      tokenHash: 'hash',
      totpSecretEncrypted: encrypted,
      attemptCount: 0,
      expiresAt: new Date('2026-05-25T10:15:00.000Z'),
      consumedAt: null,
      createdAt: new Date('2026-05-25T10:00:00.000Z'),
      user: { id: 'user-1', email: 'owner@example.com', isActive: true },
    });

    const result = await svc.verifyEnrollment({ token: 'challenge-token', code: '123456' });

    expect(result.accessToken).toBe('access-token');
    expect(result.backupCodes).toHaveLength(4);
    expect(prisma.__tx.user.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          mfaEnabled: true,
          mfaSecretEncrypted: encrypted,
        }),
      }),
    );
    expect(prisma.__tx.userBackupCode.createMany).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.arrayContaining([
          expect.objectContaining({
            userId: 'user-1',
            codeHash: expect.stringContaining('hash:'),
          }),
        ]),
      }),
    );
    expect(auth.issueSessionForUser).toHaveBeenCalledWith('user-1', {});
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

    prisma.authChallenge.findFirst.mockResolvedValue({
      id: 'challenge-restart',
      userId: 'user-1',
      purpose: 'SIGNUP_MFA_ENROLL',
      tokenHash: 'hash',
      totpSecretEncrypted: null,
      attemptCount: 5,
      expiresAt: new Date('2026-05-25T10:15:00.000Z'),
      consumedAt: new Date('2026-05-25T10:10:00.000Z'),
      createdAt: new Date('2026-05-25T10:00:00.000Z'),
      user: {
        id: 'user-1',
        email: 'owner@example.com',
        isActive: true,
        mfaEnabled: false,
      },
    });
    prisma.authChallenge.create.mockResolvedValue({
      id: 'challenge-new',
      expiresAt: new Date('2026-05-25T10:30:00.000Z'),
    });

    const result = await svc.restartEnrollment('old-token');

    expect(prisma.authChallenge.updateMany).toHaveBeenCalled();
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
