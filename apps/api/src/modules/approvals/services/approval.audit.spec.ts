import { BadRequestException, NotFoundException } from '@nestjs/common';
import { AuditAction, ApprovalStatus } from '@prisma/client';
import { ApprovalService } from './approval.service';

type Mock = jest.Mock;

/**
 * Day 5 acceptance: prove APPROVE, REJECT, and ESCALATE each write an audit
 * row inside the same transaction as the state change — and that a rejected
 * state transition (wrong approver / not pending) writes NO audit row.
 */

function makeApproval(overrides: Record<string, unknown> = {}) {
  return {
    id: 'appr-1',
    companyId: 'company-1',
    requestedBy: 'user-2',
    assignedTo: 'user-1',
    approvalType: 'GOODS_RECEIPT',
    referenceId: 'gr-1',
    documentNumber: 'GR-2026-001',
    amount: null,
    description: 'Receipt approval',
    status: ApprovalStatus.PENDING,
    requiredAt: null,
    approvedAt: null,
    rejectedAt: null,
    rejectionReason: null,
    createdAt: new Date('2026-06-13T00:00:00.000Z'),
    ...overrides,
  };
}

function makeHarness() {
  const mockTx = {
    approvalRequest: { update: jest.fn() },
    approvalEscalation: { create: jest.fn() },
  };

  const prisma = {
    $transaction: jest.fn(async (cb: unknown) =>
      typeof cb === 'function' ? (cb as (c: unknown) => Promise<unknown>)(mockTx) : cb,
    ),
    user: {
      findUnique: jest.fn().mockResolvedValue(null),
      findFirst: jest.fn().mockResolvedValue({ id: 'user-9' }),
    },
    approvalRequest: { findFirst: jest.fn() },
    approvalComment: { create: jest.fn(), findMany: jest.fn().mockResolvedValue([]) },
    approvalEscalation: { count: jest.fn().mockResolvedValue(0) },
    notification: { create: jest.fn().mockResolvedValue({}) },
  };

  const notificationService = { create: jest.fn().mockResolvedValue(undefined) };
  const audit = { log: jest.fn().mockResolvedValue(undefined) };

  const service = new ApprovalService(
    prisma as never,
    notificationService as never,
    audit as never,
  );

  return { service, prisma, tx: mockTx, audit } as {
    service: ApprovalService;
    prisma: {
      $transaction: Mock;
      user: { findUnique: Mock; findFirst: Mock };
      approvalRequest: { findFirst: Mock };
      approvalComment: { create: Mock; findMany: Mock };
    };
    tx: typeof mockTx;
    audit: { log: Mock };
  };
}

describe('ApprovalService audit logging (Day 5)', () => {
  beforeEach(() => jest.clearAllMocks());

  it('APPROVE: writes an audit row inside the transaction', async () => {
    const { service, tx, audit } = makeHarness();
    jest.spyOn(service, 'getApproval').mockResolvedValue(makeApproval() as never);
    jest.spyOn(service, 'addComment').mockResolvedValue({} as never);
    tx.approvalRequest.update.mockResolvedValue(
      makeApproval({ status: ApprovalStatus.APPROVED }),
    );

    await service.approve('appr-1', 'user-1', 'company-1', {
      comment: 'Verified quantities',
    } as never);

    expect(audit.log).toHaveBeenCalledTimes(1);
    const [params, txArg] = audit.log.mock.calls[0];
    expect(params.action).toBe(AuditAction.APPROVE);
    expect(params.entityId).toBe('appr-1');
    expect(params.entityType).toBe('GOODS_RECEIPT');
    expect(params.metadata).toMatchObject({
      documentNumber: 'GR-2026-001',
      comment: 'Verified quantities',
    });
    expect(txArg).toBe(tx); // same transaction as the state change
  });

  it('REJECT: writes an audit row with the reason inside the transaction', async () => {
    const { service, tx, audit } = makeHarness();
    jest.spyOn(service, 'getApproval').mockResolvedValue(makeApproval() as never);
    jest.spyOn(service, 'addComment').mockResolvedValue({} as never);
    tx.approvalRequest.update.mockResolvedValue(
      makeApproval({ status: ApprovalStatus.REJECTED }),
    );

    await service.reject('appr-1', 'user-1', 'company-1', {
      rejectionReason: 'Price exceeds limit',
      comment: 'See note',
    } as never);

    expect(audit.log).toHaveBeenCalledTimes(1);
    const [params, txArg] = audit.log.mock.calls[0];
    expect(params.action).toBe(AuditAction.REJECT);
    expect(params.entityId).toBe('appr-1');
    expect(params.metadata).toMatchObject({ reason: 'Price exceeds limit' });
    expect(txArg).toBe(tx);
  });

  it('ESCALATE: writes an audit row inside the transaction', async () => {
    const { service, tx, audit } = makeHarness();
    jest.spyOn(service, 'getApproval').mockResolvedValue(makeApproval() as never);
    tx.approvalEscalation.create.mockResolvedValue({});

    await service.escalateApproval('appr-1', 'company-1', 'user-9', 'user-1');

    expect(tx.approvalEscalation.create).toHaveBeenCalled();
    expect(audit.log).toHaveBeenCalledTimes(1);
    const [params, txArg] = audit.log.mock.calls[0];
    expect(params.action).toBe(AuditAction.ESCALATE);
    expect(params.entityId).toBe('appr-1');
    expect(params.userId).toBe('user-1');
    expect(params.metadata).toMatchObject({ level: 1, escalatedTo: 'user-9' });
    expect(txArg).toBe(tx);
  });

  it('APPROVE failure (not the assignee): no audit row', async () => {
    const { service, prisma, audit } = makeHarness();
    jest.spyOn(service, 'getApproval').mockResolvedValue(makeApproval() as never);

    await expect(
      service.approve('appr-1', 'someone-else', 'company-1', {} as never),
    ).rejects.toBeInstanceOf(BadRequestException);

    expect(prisma.$transaction).not.toHaveBeenCalled();
    expect(audit.log).not.toHaveBeenCalled();
  });

  it('REJECT failure (already approved): no audit row', async () => {
    const { service, prisma, audit } = makeHarness();
    jest
      .spyOn(service, 'getApproval')
      .mockResolvedValue(makeApproval({ status: ApprovalStatus.APPROVED }) as never);

    await expect(
      service.reject('appr-1', 'user-1', 'company-1', {
        rejectionReason: 'too late',
      } as never),
    ).rejects.toBeInstanceOf(BadRequestException);

    expect(prisma.$transaction).not.toHaveBeenCalled();
    expect(audit.log).not.toHaveBeenCalled();
  });

  it('ESCALATE with no target: no escalation, no audit row', async () => {
    const { service, prisma, audit } = makeHarness();
    jest.spyOn(service, 'getApproval').mockResolvedValue(makeApproval() as never);

    await service.escalateApproval('appr-1', 'company-1');

    expect(prisma.$transaction).not.toHaveBeenCalled();
    expect(audit.log).not.toHaveBeenCalled();
  });
});

describe('ApprovalService tenant isolation', () => {
  beforeEach(() => jest.clearAllMocks());

  it('getApproval filters by company and never selects full user rows', async () => {
    const { service, prisma } = makeHarness();
    prisma.approvalRequest.findFirst.mockResolvedValue(makeApproval());

    await service.getApproval('appr-1', 'company-1');

    const args = prisma.approvalRequest.findFirst.mock.calls[0][0];
    expect(args.where).toEqual({ id: 'appr-1', companyId: 'company-1' });
    expect(args.include.comments.include.user).toEqual({
      select: { id: true, name: true, email: true },
    });
  });

  it('getApproval rejects an approval owned by another company', async () => {
    const { service, prisma } = makeHarness();
    prisma.approvalRequest.findFirst.mockResolvedValue(null);

    await expect(service.getApproval('appr-1', 'company-2')).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });

  it('addComment does not write when the approval is outside the company', async () => {
    const { service, prisma } = makeHarness();
    prisma.approvalRequest.findFirst.mockResolvedValue(null);

    await expect(
      service.addComment('appr-1', 'user-1', 'company-2', 'hello'),
    ).rejects.toBeInstanceOf(NotFoundException);
    expect(prisma.approvalComment.create).not.toHaveBeenCalled();
  });

  it('getComments does not read when the approval is outside the company', async () => {
    const { service, prisma } = makeHarness();
    prisma.approvalRequest.findFirst.mockResolvedValue(null);

    await expect(service.getComments('appr-1', 'company-2')).rejects.toBeInstanceOf(
      NotFoundException,
    );
    expect(prisma.approvalComment.findMany).not.toHaveBeenCalled();
  });

  it('createApprovalRequest rejects an approver from another company', async () => {
    const { service, prisma } = makeHarness();
    prisma.user.findFirst.mockResolvedValue(null);

    await expect(
      service.createApprovalRequest(
        { approvalType: 'GOODS_RECEIPT', referenceId: 'gr-1', assignedTo: 'user-x' } as never,
        'user-1',
        'company-1',
      ),
    ).rejects.toBeInstanceOf(NotFoundException);
    expect(prisma.user.findFirst).toHaveBeenCalledWith({
      where: { id: 'user-x', shop: { companyId: 'company-1' } },
      select: { id: true },
    });
  });

  it('escalateApproval rejects a target user from another company', async () => {
    const { service, prisma, audit } = makeHarness();
    jest.spyOn(service, 'getApproval').mockResolvedValue(makeApproval() as never);
    prisma.user.findFirst.mockResolvedValue(null);

    await expect(
      service.escalateApproval('appr-1', 'company-1', 'user-x', 'user-1'),
    ).rejects.toBeInstanceOf(NotFoundException);
    expect(prisma.$transaction).not.toHaveBeenCalled();
    expect(audit.log).not.toHaveBeenCalled();
  });
});
