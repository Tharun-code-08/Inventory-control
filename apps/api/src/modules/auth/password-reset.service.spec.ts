import { BadRequestException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { PasswordResetService } from './password-reset.service';

function makeService() {
  const tx = {
    passwordResetRequest: {
      findFirst: jest.fn(),
      create: jest.fn(),
      delete: jest.fn(),
      update: jest.fn(),
      updateMany: jest.fn(),
    },
    user: {
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    session: {
      updateMany: jest.fn(),
    },
  } as any;

  const prisma = {
    ...tx,
    $transaction: jest.fn(async (work: ((client: typeof tx) => Promise<unknown>) | unknown[]) => {
      if (typeof work === 'function') {
        return work(tx);
      }
      return Promise.all(work);
    }),
  } as any;

  const config = {
    get: jest.fn((key: string, fallback?: unknown) => {
      if (key === 'BCRYPT_ROUNDS') return 10;
      if (key === 'TURNSTILE_SECRET_KEY') return undefined;
      return fallback;
    }),
  } as any;

  const mail = {
    isConfigured: jest.fn(() => true),
    sendPasswordResetOtp: jest.fn(),
    sendPasswordResetLink: jest.fn(),
  } as any;

  const auth = {
    issueSessionForUser: jest.fn(),
  } as any;

  const service = new PasswordResetService(prisma, config, mail, auth);
  return { service, prisma, tx, config, mail, auth };
}

describe('PasswordResetService', () => {
  it('stores only a hashed OTP and sends a generic success response', async () => {
    const { service, tx, mail } = makeService();
    tx.passwordResetRequest.findFirst.mockResolvedValue(null);
    tx.user.findUnique.mockResolvedValue({
      id: 'user-1',
      email: 'user@example.com',
      name: 'Alex',
      isActive: true,
    });
    tx.passwordResetRequest.updateMany.mockResolvedValue({ count: 0 });
    tx.passwordResetRequest.create.mockImplementation(async ({ data }: { data: Record<string, unknown> }) => ({
      id: 'reset-1',
      ...data,
    }));
    mail.sendPasswordResetOtp.mockResolvedValue({ messageId: 'mail-1' });

    const result = await service.requestReset({ email: 'user@example.com', method: 'otp' }, {});

    expect(result.ok).toBe(true);
    expect(mail.sendPasswordResetOtp).toHaveBeenCalledTimes(1);
    expect(tx.passwordResetRequest.create).toHaveBeenCalledTimes(1);
    const createArgs = tx.passwordResetRequest.create.mock.calls[0][0].data;
    expect(createArgs.otpHash).toEqual(expect.any(String));
    expect(createArgs.linkTokenHash).toBeNull();
    expect(createArgs.otpHash).not.toBe('123456');
  });

  it('stores only a hashed magic link token', async () => {
    const { service, tx, mail } = makeService();
    tx.passwordResetRequest.findFirst.mockResolvedValue(null);
    tx.user.findUnique.mockResolvedValue({
      id: 'user-1',
      email: 'user@example.com',
      name: 'Alex',
      isActive: true,
    });
    tx.passwordResetRequest.updateMany.mockResolvedValue({ count: 0 });
    tx.passwordResetRequest.create.mockImplementation(async ({ data }: { data: Record<string, unknown> }) => ({
      id: 'reset-2',
      ...data,
    }));
    mail.sendPasswordResetLink.mockResolvedValue({ messageId: 'mail-2' });

    await service.requestReset({ email: 'user@example.com', method: 'magic_link' }, {});

    expect(mail.sendPasswordResetLink).toHaveBeenCalledTimes(1);
    const createArgs = tx.passwordResetRequest.create.mock.calls[0][0].data;
    expect(createArgs.linkTokenHash).toEqual(expect.any(String));
    expect(createArgs.otpHash).toBeNull();
  });

  it('returns the same generic success response for an unknown email', async () => {
    const { service, tx, mail } = makeService();
    tx.passwordResetRequest.findFirst.mockResolvedValue(null);
    tx.user.findUnique.mockResolvedValue(null);

    const result = await service.requestReset({ email: 'missing@example.com', method: 'otp' }, {});

    expect(result.ok).toBe(true);
    expect(mail.sendPasswordResetOtp).not.toHaveBeenCalled();
    expect(tx.passwordResetRequest.create).not.toHaveBeenCalled();
  });

  it('suppresses duplicate requests inside the cooldown window', async () => {
    const { service, tx, mail } = makeService();
    tx.passwordResetRequest.findFirst.mockResolvedValue({
      id: 'recent-1',
      lastSentAt: new Date(),
      consumedAt: null,
      expiresAt: new Date(Date.now() + 5 * 60_000),
    });

    const result = await service.requestReset({ email: 'user@example.com', method: 'otp' }, {});

    expect(result.ok).toBe(true);
    expect(tx.user.findUnique).not.toHaveBeenCalled();
    expect(mail.sendPasswordResetOtp).not.toHaveBeenCalled();
  });

  it('blocks OTP brute-force after the fifth failed attempt', async () => {
    const { service, tx } = makeService();
    const otpHash = await bcrypt.hash('654321', 10);
    tx.passwordResetRequest.findFirst.mockResolvedValue({
      id: 'otp-1',
      userId: 'user-1',
      email: 'user@example.com',
      otpHash,
      attemptCount: 4,
      consumedAt: null,
      expiresAt: new Date(Date.now() + 5 * 60_000),
      user: { id: 'user-1', isActive: true },
    });
    tx.passwordResetRequest.update.mockResolvedValue({});

    await expect(
      service.completeOtp(
        {
          email: 'user@example.com',
          otp: '123456',
          newPassword: 'NewSecure123!',
        },
        {},
      ),
    ).rejects.toBeInstanceOf(BadRequestException);

    expect(tx.passwordResetRequest.update).toHaveBeenCalledWith({
      where: { id: 'otp-1' },
      data: {
        attemptCount: { increment: 1 },
        consumedAt: expect.any(Date),
      },
    });
  });

  it('consumes the OTP reset, revokes sessions, and signs in after success', async () => {
    const { service, tx, auth } = makeService();
    const otpHash = await bcrypt.hash('654321', 10);
    tx.passwordResetRequest.findFirst.mockResolvedValue({
      id: 'otp-2',
      userId: 'user-1',
      email: 'user@example.com',
      otpHash,
      attemptCount: 0,
      consumedAt: null,
      expiresAt: new Date(Date.now() + 5 * 60_000),
      user: { id: 'user-1', isActive: true },
    });
    tx.user.findUnique.mockResolvedValue({
      id: 'user-1',
      email: 'user@example.com',
      isActive: true,
    });
    tx.passwordResetRequest.updateMany
      .mockResolvedValueOnce({ count: 1 })
      .mockResolvedValueOnce({ count: 0 });
    tx.user.update.mockResolvedValue({});
    tx.session.updateMany.mockResolvedValue({ count: 3 });
    auth.issueSessionForUser.mockResolvedValue({
      accessToken: 'access',
      refreshCookieValue: 'refresh',
      user: { id: 'user-1' },
    });

    const result = await service.completeOtp(
      {
        email: 'user@example.com',
        otp: '654321',
        newPassword: 'NewSecure123!',
      },
      { ip: '127.0.0.1', userAgent: 'Jest' },
    );

    expect(tx.user.update).toHaveBeenCalledWith({
      where: { id: 'user-1' },
      data: expect.objectContaining({
        passwordHash: expect.any(String),
        passwordChangedAt: expect.any(Date),
        failedLoginCount: 0,
        lockedUntil: null,
      }),
    });
    expect(tx.session.updateMany).toHaveBeenCalledWith({
      where: { userId: 'user-1', revokedAt: null },
      data: { revokedAt: expect.any(Date) },
    });
    expect(auth.issueSessionForUser).toHaveBeenCalledWith('user-1', {
      ip: '127.0.0.1',
      userAgent: 'Jest',
    });
    expect(result.accessToken).toBe('access');
  });

  it('treats a magic link as single-use', async () => {
    const { service, tx, auth } = makeService();
    tx.passwordResetRequest.findFirst
      .mockResolvedValueOnce({
        id: 'link-1',
        userId: 'user-1',
        email: 'user@example.com',
        linkTokenHash: 'hash',
        consumedAt: null,
        expiresAt: new Date(Date.now() + 5 * 60_000),
        user: { id: 'user-1', isActive: true },
      })
      .mockResolvedValueOnce(null);
    tx.user.findUnique.mockResolvedValue({
      id: 'user-1',
      email: 'user@example.com',
      isActive: true,
    });
    tx.passwordResetRequest.updateMany
      .mockResolvedValueOnce({ count: 1 })
      .mockResolvedValueOnce({ count: 0 });
    tx.user.update.mockResolvedValue({});
    tx.session.updateMany.mockResolvedValue({ count: 2 });
    auth.issueSessionForUser.mockResolvedValue({
      accessToken: 'access',
      refreshCookieValue: 'refresh',
      user: { id: 'user-1' },
    });

    await service.completeMagicLink(
      { token: 'plain-token', newPassword: 'NewSecure123!' },
      {},
    );

    await expect(
      service.completeMagicLink(
        { token: 'plain-token', newPassword: 'NewSecure123!' },
        {},
      ),
    ).rejects.toBeInstanceOf(BadRequestException);
  });
});
