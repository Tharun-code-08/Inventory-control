import { BadRequestException, ConflictException } from '@nestjs/common';
import { ChannelLinkStatus } from '@prisma/client';
import * as bcrypt from 'bcrypt';
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

function buildPrismaMock() {
  return {
    userChannelLink: {
      findUnique: jest.fn(),
      findFirst: jest.fn(),
      updateMany: jest.fn(),
      upsert: jest.fn(),
    },
    whatsAppVerification: {
      deleteMany: jest.fn(),
      create: jest.fn(),
      findFirst: jest.fn(),
      update: jest.fn(),
    },
    $transaction: jest.fn(async (ops: unknown[]) => Promise.all(ops)),
  };
}

function buildService() {
  const prisma = buildPrismaMock();
  // BCRYPT_ROUNDS=10 keeps hashing fast in tests; other keys use service defaults.
  const config = { get: jest.fn((key: string) => (key === 'BCRYPT_ROUNDS' ? 10 : undefined)) };
  const service = new LinkService(prisma as never, config as never);
  return { service, prisma };
}

describe('LinkService.requestLink', () => {
  it('issues a 6-digit code whose bcrypt hash is stored for the normalized phone', async () => {
    const { service, prisma } = buildService();
    prisma.userChannelLink.findUnique.mockResolvedValue(null);

    const result = await service.requestLink(user, '+91 98765-43210');

    expect(result.phoneNumber).toBe('919876543210');
    expect(result.code).toMatch(/^\d{6}$/);
    expect(result.expiresAt.getTime()).toBeGreaterThan(Date.now());

    const createArgs = prisma.whatsAppVerification.create.mock.calls[0][0];
    expect(createArgs.data.userId).toBe(user.id);
    expect(createArgs.data.companyId).toBe(user.companyId);
    expect(createArgs.data.phoneNumber).toBe('919876543210');
    await expect(bcrypt.compare(result.code, createArgs.data.otpHash)).resolves.toBe(true);
    // Previous pending codes for the user are invalidated.
    expect(prisma.whatsAppVerification.deleteMany).toHaveBeenCalledWith({
      where: { userId: user.id, consumedAt: null },
    });
  });

  it('rejects a number actively linked to another user', async () => {
    const { service, prisma } = buildService();
    prisma.userChannelLink.findUnique.mockResolvedValue({
      userId: 'someone-else',
      status: ChannelLinkStatus.ACTIVE,
    });

    await expect(service.requestLink(user, '919876543210')).rejects.toBeInstanceOf(
      ConflictException,
    );
    expect(prisma.whatsAppVerification.create).not.toHaveBeenCalled();
  });

  it('rejects users without a company context and malformed numbers', async () => {
    const { service } = buildService();
    await expect(
      service.requestLink({ ...user, companyId: null }, '919876543210'),
    ).rejects.toBeInstanceOf(BadRequestException);
    await expect(service.requestLink(user, '123')).rejects.toBeInstanceOf(BadRequestException);
  });
});

describe('LinkService.verifyInboundCode', () => {
  const PHONE = '919876543210';
  const CODE = '123456';
  let otpHash: string;

  beforeAll(async () => {
    otpHash = await bcrypt.hash(CODE, 10);
  });

  function pendingVerification() {
    return {
      id: 'verif-1',
      userId: user.id,
      companyId: user.companyId,
      phoneNumber: PHONE,
      otpHash,
      attemptCount: 0,
    };
  }

  it('activates the link when the message contains the valid code', async () => {
    const { service, prisma } = buildService();
    prisma.whatsAppVerification.findFirst.mockResolvedValue(pendingVerification());
    const activeLink = { id: 'link-1', userId: user.id, status: ChannelLinkStatus.ACTIVE };
    prisma.userChannelLink.upsert.mockResolvedValue(activeLink);

    const link = await service.verifyInboundCode(PHONE, `my code is ${CODE}`);

    expect(link).toBe(activeLink);
    expect(prisma.whatsAppVerification.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'verif-1' },
        data: expect.objectContaining({ consumedAt: expect.any(Date) }),
      }),
    );
    const upsertArgs = prisma.userChannelLink.upsert.mock.calls[0][0];
    expect(upsertArgs.create.status).toBe(ChannelLinkStatus.ACTIVE);
    expect(upsertArgs.update.status).toBe(ChannelLinkStatus.ACTIVE);
  });

  it('increments attemptCount and returns null on a wrong code', async () => {
    const { service, prisma } = buildService();
    prisma.whatsAppVerification.findFirst.mockResolvedValue(pendingVerification());

    const link = await service.verifyInboundCode(PHONE, '654321');

    expect(link).toBeNull();
    expect(prisma.whatsAppVerification.update).toHaveBeenCalledWith({
      where: { id: 'verif-1' },
      data: { attemptCount: { increment: 1 } },
    });
    expect(prisma.userChannelLink.upsert).not.toHaveBeenCalled();
  });

  it('returns null without querying when the text has no 6-digit code', async () => {
    const { service, prisma } = buildService();
    const link = await service.verifyInboundCode(PHONE, 'hello there');
    expect(link).toBeNull();
    expect(prisma.whatsAppVerification.findFirst).not.toHaveBeenCalled();
  });

  it('returns null when no pending verification exists for the phone', async () => {
    const { service, prisma } = buildService();
    prisma.whatsAppVerification.findFirst.mockResolvedValue(null);
    const link = await service.verifyInboundCode(PHONE, CODE);
    expect(link).toBeNull();
    expect(prisma.userChannelLink.upsert).not.toHaveBeenCalled();
  });
});
