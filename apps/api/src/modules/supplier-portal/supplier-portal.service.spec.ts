import { UnauthorizedException } from '@nestjs/common';
import { signSupplierPortalToken } from '../../common/crypto/portal-token';
import { SupplierPortalService } from './supplier-portal.service';

describe('SupplierPortalService', () => {
  const savedPortal = process.env.SUPPLIER_PORTAL_SECRET;
  beforeAll(() => {
    process.env.SUPPLIER_PORTAL_SECRET = 'portal-test-secret';
  });
  afterAll(() => {
    if (savedPortal === undefined) delete process.env.SUPPLIER_PORTAL_SECRET;
    else process.env.SUPPLIER_PORTAL_SECRET = savedPortal;
  });

  function setup() {
    const prisma = {
      supplier: { findMany: jest.fn(), findFirst: jest.fn() },
      rfqHeader: { findMany: jest.fn(), findFirst: jest.fn() },
    } as any;
    const subscriptions = { assertFeature: jest.fn().mockResolvedValue(undefined) } as any;
    const mail = {
      buildRfqInviteContent: jest.fn().mockReturnValue({
        supplierName: 'Acme',
        rfqNumber: 'RFQ-00001',
        rfqTitle: 'Steel',
        deadline: null,
        portalUrl: 'https://app/supplier-portal/submit?token=t',
        accessCode: 'ABCD1234',
      }),
      sendTenantMail: jest.fn().mockResolvedValue({}),
    } as any;
    const service = new SupplierPortalService(prisma, {} as any, subscriptions, {} as any, mail);
    return { service, prisma, mail };
  }

  it('answers request-link the same way for unknown emails and sends nothing', async () => {
    const { service, prisma, mail } = setup();
    prisma.supplier.findMany.mockResolvedValue([]);
    const res = await service.requestLink({ email: 'nobody@example.com' });
    expect(res.ok).toBe(true);
    expect(mail.sendTenantMail).not.toHaveBeenCalled();
  });

  it('emails a signed link to the supplier address on file for each open RFQ', async () => {
    const { service, prisma, mail } = setup();
    prisma.supplier.findMany.mockResolvedValue([
      { id: 'sup-1', supplierName: 'Acme', email: 'sales@acme.test', companyId: 'c1' },
    ]);
    prisma.rfqHeader.findMany.mockResolvedValue([{ id: 'rfq-1', rfqNumber: 'RFQ-00001', title: 'Steel', deadline: null }]);
    const res = await service.requestLink({ email: 'SALES@acme.test' });
    expect(res.ok).toBe(true);
    expect(mail.buildRfqInviteContent).toHaveBeenCalledWith(expect.objectContaining({ rfqId: 'rfq-1', supplierId: 'sup-1' }));
    expect(mail.sendTenantMail).toHaveBeenCalledWith('c1', expect.objectContaining({ to: 'sales@acme.test' }));
  });

  it('rejects a session without a valid token', async () => {
    const { service } = setup();
    await expect(service.getSession('forged.token')).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it('rejects a token for a deactivated supplier', async () => {
    const { service, prisma } = setup();
    prisma.supplier.findFirst.mockResolvedValue(null);
    const token = signSupplierPortalToken({ rfqId: 'rfq-1', supplierId: 'sup-1', expiresAt: Date.now() + 60_000 });
    await expect(service.getSession(token)).rejects.toBeInstanceOf(UnauthorizedException);
    expect(prisma.supplier.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: 'sup-1', isActive: true, deletedAt: null } }),
    );
  });

  it('returns only supplier-facing RFQ fields for a valid token', async () => {
    const { service, prisma } = setup();
    prisma.supplier.findFirst.mockResolvedValue({ id: 'sup-1', supplierName: 'Acme', email: 'a@b.c', companyId: 'c1' });
    prisma.rfqHeader.findFirst.mockResolvedValue({ id: 'rfq-1', rfqNumber: 'RFQ-00001', shopId: 'shop-1', items: [] });
    const token = signSupplierPortalToken({ rfqId: 'rfq-1', supplierId: 'sup-1', expiresAt: Date.now() + 60_000 });
    const session = await service.getSession(token);
    expect(session.rfq).toEqual({ id: 'rfq-1', rfqNumber: 'RFQ-00001', items: [] });
    expect(session.supplier).toEqual({ supplierName: 'Acme', email: 'a@b.c' });
    const select = prisma.rfqHeader.findFirst.mock.calls[0][0].select;
    expect(select.notes).toBeUndefined();
    expect(select.createdById).toBeUndefined();
  });
});
