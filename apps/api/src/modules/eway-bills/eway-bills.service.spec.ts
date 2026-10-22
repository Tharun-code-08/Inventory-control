import { BadRequestException } from '@nestjs/common';
import { EwayBillStatus } from '@prisma/client';
import { EwayBillsService } from './eway-bills.service';

describe('EwayBillsService.generate (record portal EWB number)', () => {
  const user = { id: 'u1', shopId: 'shop-1', companyId: 'c1', role: 'OWNER', permissions: ['*'] } as any;
  const draft = {
    id: 'b1',
    status: EwayBillStatus.DRAFT,
    distanceKm: 450,
    shopId: 'shop-1',
  };

  function setup(updatedCount = 1) {
    const prisma = {
      ewayBill: {
        findFirst: jest.fn().mockResolvedValue(null),
        updateMany: jest.fn().mockResolvedValue({ count: updatedCount }),
        findUnique: jest.fn().mockResolvedValue({ ...draft, status: EwayBillStatus.GENERATED }),
      },
    } as any;
    const service = new EwayBillsService(prisma);
    jest.spyOn(service, 'get').mockResolvedValue(draft as any);
    jest.spyOn(service as any, 'validateForGeneration').mockReturnValue(undefined);
    return { service, prisma };
  }

  it('stores the portal-issued number and validity with a DRAFT-only guard', async () => {
    const { service, prisma } = setup();
    await service.generate(user, 'b1', {
      ewayBillNumber: '331009876543',
      validUpto: '2026-10-25T23:59:00.000Z',
      generatedAt: '2026-10-22T10:00:00.000Z',
    });
    const call = prisma.ewayBill.updateMany.mock.calls[0][0];
    expect(call.where).toEqual(expect.objectContaining({ id: 'b1', status: EwayBillStatus.DRAFT }));
    expect(call.data).toEqual(
      expect.objectContaining({
        status: EwayBillStatus.GENERATED,
        ewayBillNumber: '331009876543',
        validUpto: new Date('2026-10-25T23:59:00.000Z'),
        generatedAt: new Date('2026-10-22T10:00:00.000Z'),
      }),
    );
  });

  it('falls back to 1 day per 200 km from the generation time when no validity is given', async () => {
    const { service, prisma } = setup();
    await service.generate(user, 'b1', { ewayBillNumber: '331009876543', generatedAt: '2026-10-22T10:00:00.000Z' });
    expect(prisma.ewayBill.updateMany.mock.calls[0][0].data.validUpto).toEqual(new Date('2026-10-25T10:00:00.000Z'));
  });

  it('refuses a number already recorded on another bill', async () => {
    const { service, prisma } = setup();
    prisma.ewayBill.findFirst.mockResolvedValue({ id: 'other' });
    await expect(service.generate(user, 'b1', { ewayBillNumber: '331009876543' })).rejects.toBeInstanceOf(
      BadRequestException,
    );
    expect(prisma.ewayBill.updateMany).not.toHaveBeenCalled();
  });

  it('reports a concurrent generate instead of overwriting the number', async () => {
    const { service } = setup(0);
    await expect(service.generate(user, 'b1', { ewayBillNumber: '331009876543' })).rejects.toThrow(
      'already been generated',
    );
  });
});
