import { UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { AuthService } from './auth.service';

jest.mock('bcrypt');

type Mock = jest.Mock;

function makeConfig(overrides: Record<string, unknown> = {}): ConfigService {
  const map: Record<string, unknown> = {
    BCRYPT_ROUNDS: 10,
    LOCKOUT_THRESHOLD: 3,
    LOCKOUT_DURATION_MIN: 15,
    JWT_REFRESH_EXPIRES: '7d',
    REFRESH_SECRET: 'refresh-secret-12345678901234567890123456789012',
    ...overrides,
  };
  return {
    get: jest.fn((key: string, def?: unknown) => map[key] ?? def),
    getOrThrow: jest.fn((key: string) => {
      if (map[key] === undefined) throw new Error(`missing ${key}`);
      return map[key];
    }),
  } as unknown as ConfigService;
}

function makeJwt(): JwtService {
  return {
    signAsync: jest.fn().mockResolvedValue('signed-token'),
    verifyAsync: jest.fn(),
  } as unknown as JwtService;
}

function makePrisma(overrides: Record<string, unknown> = {}) {
  const tx = {
    user: { update: jest.fn().mockResolvedValue({ failedLoginCount: 1 }) },
    session: { updateMany: jest.fn() },
  };
  return {
    user: {
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    session: {
      findUnique: jest.fn(),
      create: jest.fn(),
      updateMany: jest.fn(),
      update: jest.fn(),
    },
    $transaction: jest.fn(async (arg) => {
      if (Array.isArray(arg)) return Promise.all(arg);
      return arg(tx);
    }),
    ...overrides,
  } as unknown as ReturnType<typeof Object>;
}

const avatarStub = {} as never;

describe('AuthService.login lockout flow', () => {
  beforeEach(() => {
    (bcrypt.compare as Mock).mockReset();
    (bcrypt.hash as Mock).mockReset();
    (bcrypt.hash as Mock).mockResolvedValue('hashed-secret');
  });

  function userRow(overrides: Partial<Record<string, unknown>> = {}) {
    return {
      id: 'u1',
      email: 'a@b.com',
      passwordHash: 'h',
      isActive: true,
      failedLoginCount: 0,
      lockedUntil: null,
      role: { name: 'ADMIN', permissions: [] },
      shop: { id: 'shop1', companyId: 'company1' },
      shopId: 'shop1',
      ...overrides,
    };
  }

  it('rejects with the generic message when the email is unknown', async () => {
    const prisma = makePrisma() as any;
    prisma.user.findUnique.mockResolvedValue(null);
    const svc = new AuthService(prisma, makeJwt(), makeConfig(), avatarStub, { log: jest.fn().mockResolvedValue(undefined) } as never);
    await expect(svc.login({ email: 'x@y', password: 'p' } as never)).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
  });

  it('blocks login when lockedUntil is in the future', async () => {
    const prisma = makePrisma() as any;
    prisma.user.findUnique.mockResolvedValue(
      userRow({ lockedUntil: new Date(Date.now() + 60_000) }),
    );
    const svc = new AuthService(prisma, makeJwt(), makeConfig(), avatarStub, { log: jest.fn().mockResolvedValue(undefined) } as never);
    await expect(svc.login({ email: 'a@b.com', password: 'p' } as never)).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
    expect(bcrypt.compare).not.toHaveBeenCalled();
  });

  it('allows login again once lockedUntil is in the past', async () => {
    const prisma = makePrisma() as any;
    prisma.user.findUnique.mockResolvedValue(
      userRow({ lockedUntil: new Date(Date.now() - 60_000), failedLoginCount: 5 }),
    );
    (bcrypt.compare as Mock).mockResolvedValue(true);
    prisma.session.create.mockResolvedValue({ id: 'sess-1' });
    const svc = new AuthService(prisma, makeJwt(), makeConfig(), avatarStub, { log: jest.fn().mockResolvedValue(undefined) } as never);
    const result = await svc.login({ email: 'a@b.com', password: 'p' } as never);
    expect(result.accessToken).toBe('signed-token');
    // Reset path: failedLoginCount → 0 + lockedUntil → null
    expect(prisma.user.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ failedLoginCount: 0, lockedUntil: null }),
      }),
    );
  });

  it('increments failedLoginCount on a wrong password', async () => {
    const prisma = makePrisma() as any;
    prisma.user.findUnique.mockResolvedValue(userRow({ failedLoginCount: 1 }));
    prisma.$transaction.mockImplementationOnce(async (arg: (tx: any) => Promise<unknown>) =>
      arg({
        user: { update: jest.fn().mockResolvedValue({ failedLoginCount: 2 }) },
      }),
    );
    (bcrypt.compare as Mock).mockResolvedValue(false);
    const svc = new AuthService(prisma, makeJwt(), makeConfig(), avatarStub, { log: jest.fn().mockResolvedValue(undefined) } as never);
    await expect(svc.login({ email: 'a@b.com', password: 'wrong' } as never)).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
    const txArg = prisma.$transaction.mock.calls[0][0];
    const txMock = { user: { update: jest.fn().mockResolvedValue({ failedLoginCount: 2 }) } };
    await txArg(txMock);
    expect(txMock.user.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: { failedLoginCount: { increment: 1 } },
      }),
    );
  });

  it('locks the account when failedLoginCount + 1 >= threshold', async () => {
    const prisma = makePrisma() as any;
    prisma.user.findUnique.mockResolvedValue(userRow({ failedLoginCount: 2 }));
    prisma.$transaction.mockImplementationOnce(async (arg: (tx: any) => Promise<unknown>) =>
      arg({
        user: {
          update: jest
            .fn()
            .mockResolvedValueOnce({ failedLoginCount: 3 })
            .mockResolvedValueOnce({ failedLoginCount: 3 }),
        },
      }),
    );
    (bcrypt.compare as Mock).mockResolvedValue(false);
    const svc = new AuthService(prisma, makeJwt(), makeConfig({ LOCKOUT_THRESHOLD: 3 }), avatarStub, { log: jest.fn().mockResolvedValue(undefined) } as never);
    await expect(svc.login({ email: 'a@b.com', password: 'wrong' } as never)).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
    const txArg = prisma.$transaction.mock.calls[0][0];
    const txUpdate = jest
      .fn()
      .mockResolvedValueOnce({ failedLoginCount: 3 })
      .mockResolvedValueOnce({ failedLoginCount: 3 });
    await txArg({ user: { update: txUpdate } });
    const lockCall = txUpdate.mock.calls[1][0];
    expect(lockCall.data.lockedUntil).toBeInstanceOf(Date);
    expect((lockCall.data.lockedUntil as Date).getTime()).toBeGreaterThan(Date.now());
  });

  it('applies progressively longer lockout windows after repeated lock cycles', async () => {
    const prisma = makePrisma() as any;
    prisma.user.findUnique.mockResolvedValue(userRow({ failedLoginCount: 5 }));
    prisma.$transaction.mockImplementationOnce(async (arg: (tx: any) => Promise<unknown>) =>
      arg({
        user: {
          update: jest
            .fn()
            .mockResolvedValueOnce({ failedLoginCount: 6 })
            .mockResolvedValueOnce({ failedLoginCount: 6 }),
        },
      }),
    );
    (bcrypt.compare as Mock).mockResolvedValue(false);
    const svc = new AuthService(prisma, makeJwt(), makeConfig({ LOCKOUT_THRESHOLD: 3 }), avatarStub, { log: jest.fn().mockResolvedValue(undefined) } as never);
    await expect(svc.login({ email: 'a@b.com', password: 'wrong' } as never)).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
    const txArg = prisma.$transaction.mock.calls[0][0];
    const txUpdate = jest
      .fn()
      .mockResolvedValueOnce({ failedLoginCount: 6 })
      .mockResolvedValueOnce({ failedLoginCount: 6 });
    await txArg({ user: { update: txUpdate } });
    const lockCall = txUpdate.mock.calls[1][0];
    const lockedUntil = lockCall.data.lockedUntil as Date;
    const deltaMs = lockedUntil.getTime() - Date.now();
    expect(deltaMs).toBeGreaterThan(15 * 60 * 1000);
  });

  it('does not leak whether the account exists vs is locked vs wrong-pw', async () => {
    const prisma = makePrisma() as any;
    prisma.user.findUnique.mockResolvedValue(null);
    const svc = new AuthService(prisma, makeJwt(), makeConfig(), avatarStub, { log: jest.fn().mockResolvedValue(undefined) } as never);
    let unknownMsg = '';
    try {
      await svc.login({ email: 'x@y', password: 'p' } as never);
    } catch (e) {
      unknownMsg = (e as Error).message;
    }

    prisma.user.findUnique.mockResolvedValue(
      userRow({ lockedUntil: new Date(Date.now() + 60_000) }),
    );
    let lockedMsg = '';
    try {
      await svc.login({ email: 'a@b.com', password: 'p' } as never);
    } catch (e) {
      lockedMsg = (e as Error).message;
    }
    expect(unknownMsg).toBe(lockedMsg);
  });

  it('extracts session id from a valid refresh token', async () => {
    const prisma = makePrisma() as any;
    const jwt = makeJwt() as any;
    jwt.verifyAsync.mockResolvedValue({ sub: 'u1', sid: 'sess-123', refreshId: 'r1' });
    const svc = new AuthService(prisma, jwt, makeConfig(), avatarStub, { log: jest.fn().mockResolvedValue(undefined) } as never);
    await expect(svc.getSessionIdFromRefreshToken('token')).resolves.toBe('sess-123');
  });

  it('returns null for invalid refresh tokens when extracting session id', async () => {
    const prisma = makePrisma() as any;
    const jwt = makeJwt() as any;
    jwt.verifyAsync.mockRejectedValue(new Error('bad token'));
    const svc = new AuthService(prisma, jwt, makeConfig(), avatarStub, { log: jest.fn().mockResolvedValue(undefined) } as never);
    await expect(svc.getSessionIdFromRefreshToken('bad')).resolves.toBeNull();
  });
});
