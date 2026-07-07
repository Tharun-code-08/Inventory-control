import { BadRequestException, HttpException } from '@nestjs/common';
import { ChannelLinkStatus, LinkTokenStatus, WhatsAppDeviceStatus } from '@prisma/client';
import { createHash } from 'crypto';
import type { RequestUser } from '@/common/types/request-user';
import { LinkService } from './link.service';

const user: RequestUser = {
  id: 'user-1',
  email: 'user@example.com',
  role: 'OWNER' as RequestUser['role'],
  shopId: 'shop-1',
  companyId: 'company-1',
  tenantShopIds: ['shop-1'],
  permissions: [],
};

const PHONE = '919876543210';

function buildPrismaMock() {
  const prisma: Record<string, any> = {
    whatsAppLinkToken: {
      count: jest.fn().mockResolvedValue(0),
      create: jest.fn(),
      update: jest.fn(),
      updateMany: jest.fn().mockResolvedValue({ count: 0 }),
      deleteMany: jest.fn().mockResolvedValue({ count: 0 }),
      findUnique: jest.fn(),
    },
    whatsAppDevice: {
      findUnique: jest.fn().mockResolvedValue(null),
      findFirst: jest.fn(),
      findMany: jest.fn().mockResolvedValue([]),
      count: jest.fn().mockResolvedValue(0),
      create: jest.fn(),
      update: jest.fn(),
      updateMany: jest.fn().mockResolvedValue({ count: 0 }),
    },
    userChannelLink: {
      findUnique: jest.fn(),
      findFirst: jest.fn(),
      findMany: jest.fn().mockResolvedValue([]),
      update: jest.fn(),
      updateMany: jest.fn().mockResolvedValue({ count: 0 }),
      upsert: jest.fn(),
    },
    user: {
      findUnique: jest.fn(),
    },
    shop: {
      findMany: jest.fn().mockResolvedValue([{ id: 'shop-1' }]),
    },
  };
  // Array form resolves all ops; callback form runs against the same mock (tx = prisma).
  prisma.$transaction = jest.fn(async (arg: unknown) =>
    typeof arg === 'function' ? (arg as (tx: unknown) => unknown)(prisma) : Promise.all(arg as unknown[]),
  );
  return prisma;
}

function buildService() {
  const prisma = buildPrismaMock();
  const audit = { log: jest.fn().mockResolvedValue(undefined), logTenant: jest.fn().mockResolvedValue(undefined) };
  const mail = { sendPlatformMail: jest.fn().mockResolvedValue({}) };
  const notifications = { create: jest.fn().mockResolvedValue({}) };
  const redis = {
    get: jest.fn().mockResolvedValue(null),
    set: jest.fn().mockResolvedValue('OK'),
    del: jest.fn().mockResolvedValue(1),
  };
  const service = new LinkService(
    prisma as never,
    audit as never,
    mail as never,
    notifications as never,
    redis as never,
  );
  return { service, prisma, audit, mail, notifications, redis };
}

function sha256(value: string): string {
  return createHash('sha256').update(value).digest('hex');
}

describe('LinkService.generateLinkToken', () => {
  it('issues a versioned token whose SHA-256 hash is stored, expiring prior ACTIVE tokens', async () => {
    const { service, prisma, audit } = buildService();

    const result = await service.generateLinkToken(user, '1.2.3.4', 'jest');

    expect(result.token).toMatch(/^V1-[A-HJ-NP-Z2-9]{8}$/);
    expect(result.expiresAt.getTime()).toBeGreaterThan(Date.now());

    expect(prisma.whatsAppLinkToken.updateMany).toHaveBeenCalledWith({
      where: { userId: user.id, status: LinkTokenStatus.ACTIVE },
      data: { status: LinkTokenStatus.EXPIRED },
    });
    const createArgs = prisma.whatsAppLinkToken.create.mock.calls[0][0];
    expect(createArgs.data.userId).toBe(user.id);
    expect(createArgs.data.companyId).toBe(user.companyId);
    expect(createArgs.data.tokenHash).toBe(sha256(result.token));
    expect(createArgs.data.generatedIp).toBe('1.2.3.4');
    expect(audit.logTenant).toHaveBeenCalled();
  });

  it('rate-limits to 5 tokens per hour', async () => {
    const { service, prisma } = buildService();
    prisma.whatsAppLinkToken.count.mockResolvedValue(5);
    await expect(service.generateLinkToken(user)).rejects.toBeInstanceOf(HttpException);
    expect(prisma.whatsAppLinkToken.create).not.toHaveBeenCalled();
  });

  it('rejects users without a company context', async () => {
    const { service } = buildService();
    await expect(service.generateLinkToken({ ...user, companyId: null })).rejects.toBeInstanceOf(
      BadRequestException,
    );
  });
});

describe('LinkService.redeemLinkToken', () => {
  const RAW = 'V1-ABCD2345';

  function activeToken(overrides: Record<string, unknown> = {}) {
    return {
      id: 'token-1',
      userId: user.id,
      companyId: user.companyId,
      tokenHash: sha256(RAW),
      status: LinkTokenStatus.ACTIVE,
      expiresAt: new Date(Date.now() + 60_000),
      linkedPhone: null,
      ...overrides,
    };
  }

  it('links a new device and channel link when the token is valid', async () => {
    const { service, prisma, redis } = buildService();
    prisma.whatsAppLinkToken.findUnique.mockResolvedValue(activeToken());
    const device = { id: 'device-1', userId: user.id, companyId: user.companyId, phoneNumber: PHONE, linkedAt: new Date() };
    prisma.whatsAppDevice.create.mockResolvedValue(device);
    const link = { id: 'link-1', userId: user.id, status: ChannelLinkStatus.ACTIVE, phoneNumber: PHONE };
    prisma.userChannelLink.upsert.mockResolvedValue(link);
    prisma.user.findUnique.mockResolvedValue({ email: 'user@example.com', name: 'U' });

    const result = await service.redeemLinkToken(PHONE, RAW);

    expect(result?.device).toBe(device);
    expect(result?.link).toBe(link);
    expect(prisma.whatsAppLinkToken.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'token-1' },
        data: expect.objectContaining({ status: LinkTokenStatus.USED, linkedPhone: PHONE }),
      }),
    );
    expect(prisma.userChannelLink.upsert.mock.calls[0][0].create.status).toBe(ChannelLinkStatus.ACTIVE);
    expect(redis.del).toHaveBeenCalledWith(`wa:auth:${PHONE}`);
  });

  it('accepts the bare token without the V1- prefix', async () => {
    const { service, prisma } = buildService();
    prisma.whatsAppLinkToken.findUnique.mockResolvedValue(activeToken());
    prisma.whatsAppDevice.create.mockResolvedValue({ id: 'device-1', userId: user.id, companyId: user.companyId, phoneNumber: PHONE, linkedAt: new Date() });
    prisma.userChannelLink.upsert.mockResolvedValue({ id: 'link-1' });
    prisma.user.findUnique.mockResolvedValue({ email: 'user@example.com', name: 'U' });

    const result = await service.redeemLinkToken(PHONE, 'ABCD2345');
    expect(result).not.toBeNull();
    expect(prisma.whatsAppLinkToken.findUnique).toHaveBeenCalledWith({ where: { tokenHash: sha256(RAW) } });
  });

  it('returns null for an unknown token', async () => {
    const { service, prisma } = buildService();
    prisma.whatsAppLinkToken.findUnique.mockResolvedValue(null);
    await expect(service.redeemLinkToken(PHONE, 'V1-WRONGTOK')).resolves.toBeNull();
    expect(prisma.whatsAppDevice.create).not.toHaveBeenCalled();
  });

  it('returns null and expires the token when past its TTL', async () => {
    const { service, prisma } = buildService();
    prisma.whatsAppLinkToken.findUnique.mockResolvedValue(
      activeToken({ expiresAt: new Date(Date.now() - 1_000) }),
    );
    await expect(service.redeemLinkToken(PHONE, RAW)).resolves.toBeNull();
    expect(prisma.whatsAppLinkToken.update).toHaveBeenCalledWith({
      where: { id: 'token-1' },
      data: { status: LinkTokenStatus.EXPIRED },
    });
    expect(prisma.whatsAppDevice.create).not.toHaveBeenCalled();
  });

  it('rejects a phone actively owned by another user', async () => {
    const { service, prisma } = buildService();
    prisma.whatsAppLinkToken.findUnique.mockResolvedValue(activeToken());
    prisma.whatsAppDevice.findUnique.mockResolvedValue({
      id: 'device-x',
      userId: 'someone-else',
      status: WhatsAppDeviceStatus.ACTIVE,
    });
    await expect(service.redeemLinkToken(PHONE, RAW)).resolves.toBeNull();
    expect(prisma.whatsAppLinkToken.update).not.toHaveBeenCalled();
  });

  it('is idempotent for a duplicate redelivery of a consumed token', async () => {
    const { service, prisma } = buildService();
    prisma.whatsAppLinkToken.findUnique.mockResolvedValue(
      activeToken({ status: LinkTokenStatus.USED, linkedPhone: PHONE }),
    );
    const device = { id: 'device-1', userId: user.id, companyId: user.companyId, phoneNumber: PHONE, status: WhatsAppDeviceStatus.ACTIVE };
    prisma.whatsAppDevice.findUnique.mockResolvedValue(device);
    const link = { id: 'link-1', status: ChannelLinkStatus.ACTIVE };
    prisma.userChannelLink.findUnique.mockResolvedValue(link);

    const result = await service.redeemLinkToken(PHONE, RAW);
    expect(result?.device).toBe(device);
    // No second device row and no second notification for a redelivery.
    expect(prisma.whatsAppDevice.create).not.toHaveBeenCalled();
  });

  it('enforces the max-5-active-devices cap', async () => {
    const { service, prisma } = buildService();
    prisma.whatsAppLinkToken.findUnique.mockResolvedValue(activeToken());
    prisma.whatsAppDevice.count.mockResolvedValue(5);
    await expect(service.redeemLinkToken(PHONE, RAW)).resolves.toBeNull();
    expect(prisma.whatsAppDevice.create).not.toHaveBeenCalled();
  });
});

describe('LinkService.revokeDevice', () => {
  it('revokes the device and its channel link, and drops the auth cache', async () => {
    const { service, prisma, redis } = buildService();
    prisma.whatsAppDevice.findFirst.mockResolvedValue({
      id: 'device-1',
      userId: user.id,
      phoneNumber: PHONE,
      status: WhatsAppDeviceStatus.ACTIVE,
    });

    await expect(service.revokeDevice(user, 'device-1')).resolves.toEqual({ revoked: true });
    expect(prisma.whatsAppDevice.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ status: WhatsAppDeviceStatus.REVOKED, revokedById: user.id }),
      }),
    );
    expect(prisma.userChannelLink.updateMany).toHaveBeenCalled();
    expect(redis.del).toHaveBeenCalledWith(`wa:auth:${PHONE}`);
  });
});

describe('LinkService.buildRequestUser', () => {
  const link = {
    id: 'link-1',
    userId: user.id,
    companyId: user.companyId,
    phoneNumber: PHONE,
  } as never;

  it('serves from the Redis cache when present', async () => {
    const { service, prisma, redis } = buildService();
    redis.get.mockResolvedValue(JSON.stringify({ id: user.id, email: user.email }));
    const result = await service.buildRequestUser(link);
    expect(result?.id).toBe(user.id);
    expect(prisma.user.findUnique).not.toHaveBeenCalled();
  });

  it('loads from the DB on a cache miss and populates the cache', async () => {
    const { service, prisma, redis } = buildService();
    prisma.user.findUnique.mockResolvedValue({
      id: user.id,
      email: user.email,
      isActive: true,
      deletedAt: null,
      shopId: 'shop-1',
      role: { name: 'OWNER', permissions: [] },
      shop: { companyId: 'company-1' },
    });
    const result = await service.buildRequestUser(link);
    expect(result?.companyId).toBe('company-1');
    expect(redis.set).toHaveBeenCalledWith(
      `wa:auth:${PHONE}`,
      expect.any(String),
      'EX',
      300,
    );
  });

  it('returns null for a deactivated account', async () => {
    const { service, prisma } = buildService();
    prisma.user.findUnique.mockResolvedValue({ id: user.id, isActive: false, deletedAt: null });
    await expect(service.buildRequestUser(link)).resolves.toBeNull();
  });
});
