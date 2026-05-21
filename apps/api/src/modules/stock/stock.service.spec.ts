import { Prisma, TransactionType } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { StockService } from './stock.service';

function makeTx(impl: { create?: jest.Mock; findUnique?: jest.Mock }) {
  return {
    stockLedger: {
      create: impl.create ?? jest.fn(),
      findUnique: impl.findUnique ?? jest.fn(),
    },
  } as unknown as Prisma.TransactionClient;
}

describe('StockService.postMovementOnce', () => {
  let service: StockService;

  beforeEach(() => {
    service = new StockService({} as PrismaService);
  });

  const basePayload = {
    type: TransactionType.GOODS_RECEIPT,
    ref: 'GR-001',
    date: new Date('2026-05-01'),
    shopId: 'shop-1',
    productId: 'prod-1',
    inQty: 10,
    outQty: 0,
    userId: 'user-1',
    idempotencyKey: 'gr:hdr-1:line-1',
  };

  it('inserts a new ledger row with the idempotencyKey', async () => {
    const create = jest.fn().mockResolvedValue({ id: 'ledger-1', idempotencyKey: 'gr:hdr-1:line-1' });
    const tx = makeTx({ create });

    await service.postMovementOnce(tx, basePayload);

    expect(create).toHaveBeenCalledTimes(1);
    const callArg = create.mock.calls[0][0].data;
    expect(callArg.idempotencyKey).toBe('gr:hdr-1:line-1');
    expect(callArg.balanceQty.toString()).toBe('0');
    expect(callArg.inQty.toString()).toBe('10');
  });

  it('returns the existing row when a unique-violation indicates a replay', async () => {
    const uniqueErr = new Prisma.PrismaClientKnownRequestError(
      'unique violation on idempotency_key',
      { code: 'P2002', clientVersion: 'test' },
    );
    const create = jest.fn().mockRejectedValueOnce(uniqueErr);
    const findUnique = jest.fn().mockResolvedValue({
      id: 'ledger-1',
      idempotencyKey: 'gr:hdr-1:line-1',
    });
    const tx = makeTx({ create, findUnique });

    const result = await service.postMovementOnce(tx, basePayload);

    expect(result).toEqual({ id: 'ledger-1', idempotencyKey: 'gr:hdr-1:line-1' });
    expect(create).toHaveBeenCalledTimes(1);
    expect(findUnique).toHaveBeenCalledWith({
      where: { idempotencyKey: 'gr:hdr-1:line-1' },
    });
  });

  it('rethrows non-unique-violation errors unchanged', async () => {
    const create = jest.fn().mockRejectedValue(new Error('boom'));
    const tx = makeTx({ create });

    await expect(service.postMovementOnce(tx, basePayload)).rejects.toThrow('boom');
  });

  it('synthesizes a default key when caller omits one', async () => {
    const create = jest.fn().mockResolvedValue({ id: 'ledger-x' });
    const tx = makeTx({ create });

    await service.postMovementOnce(tx, { ...basePayload, idempotencyKey: undefined });

    const data = create.mock.calls[0][0].data;
    expect(typeof data.idempotencyKey).toBe('string');
    expect(data.idempotencyKey.length).toBeGreaterThan(0);
  });
});
