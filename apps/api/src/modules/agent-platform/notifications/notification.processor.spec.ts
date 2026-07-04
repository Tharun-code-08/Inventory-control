import { NotificationProcessor } from './notification.processor';

const user = { id: 'u1', companyId: 'c1', shopId: 'shop-1', tenantShopIds: ['shop-1'], permissions: ['report:view'] } as never;

const activeLink = {
  id: 'link-1',
  userId: 'u1',
  companyId: 'c1',
  channel: 'WHATSAPP',
  phoneNumber: '919999000111',
  status: 'ACTIVE',
};

const analyticsResult = { totalRevenue: 5000, salesOrderCount: 3, lowStockCount: 2 };
const lowStockItems = [
  { description: 'LED Bulb', product_code: 'ELEC0001', current_stock: 5, min_stock_level: 10 },
];
const agingResult = {
  data: [{ customerName: 'Acme', overdue_amount: 1500, overdue_invoice_count: 2 }],
  summary: { total_overdue: 1500, overdue_customers: 1 },
};

function buildHarness() {
  const prisma = {
    userChannelLink: { findMany: jest.fn().mockResolvedValue([activeLink]) },
    conversation: {
      findFirst: jest.fn().mockResolvedValue({ id: 'conv-1' }),
      create: jest.fn(),
    },
    message: {
      create: jest.fn().mockResolvedValue({ id: 'msg-1' }),
      update: jest.fn().mockResolvedValue({}),
    },
  };
  const reports = {
    analyticsOverview: jest.fn().mockResolvedValue(analyticsResult),
    lowStock: jest.fn().mockResolvedValue(lowStockItems),
    customerAging: jest.fn().mockResolvedValue(agingResult),
  };
  const links = { buildRequestUser: jest.fn().mockResolvedValue(user) };
  const adapter = {
    isConfigured: jest.fn().mockReturnValue(true),
    sendText: jest.fn().mockResolvedValue({ providerMessageId: 'wamid-1' }),
  };
  const processor = new NotificationProcessor(
    prisma as never,
    reports as never,
    links as never,
    adapter as never,
  );
  return { prisma, reports, links, adapter, processor };
}

function makeJob(data: Record<string, unknown>) {
  return { data } as never;
}

describe('NotificationProcessor', () => {
  it('sends daily summary with yesterday date and correct figures', async () => {
    const h = buildHarness();
    const { sent } = await h.processor.process(makeJob({ type: 'daily_summary', companyId: 'c1' }));
    expect(sent).toBe(1);
    const body: string = h.prisma.message.create.mock.calls[0][0].data.body;
    expect(body).toContain('Daily Summary');
    expect(body).toContain('3 orders');
    expect(body).toContain('₹5,000');
    expect(body).toContain('2'); // low stock count
  });

  it('sends low-stock alert with item list', async () => {
    const h = buildHarness();
    const { sent } = await h.processor.process(makeJob({ type: 'low_stock_alert', companyId: 'c1' }));
    expect(sent).toBe(1);
    const body: string = h.prisma.message.create.mock.calls[0][0].data.body;
    expect(body).toContain('Low Stock Alert');
    expect(body).toContain('LED Bulb');
    expect(body).toContain('5');
  });

  it('returns sent=0 and no message when there are no low-stock items', async () => {
    const h = buildHarness();
    h.reports.lowStock.mockResolvedValue([]);
    const { sent } = await h.processor.process(makeJob({ type: 'low_stock_alert', companyId: 'c1' }));
    expect(sent).toBe(0);
    expect(h.prisma.message.create).not.toHaveBeenCalled();
  });

  it('sends overdue payment reminder with customer and total', async () => {
    const h = buildHarness();
    const { sent } = await h.processor.process(makeJob({ type: 'overdue_payment', companyId: 'c1' }));
    expect(sent).toBe(1);
    const body: string = h.prisma.message.create.mock.calls[0][0].data.body;
    expect(body).toContain('Overdue Payment');
    expect(body).toContain('Acme');
    expect(body).toContain('₹1,500');
  });

  it('returns sent=0 when there are no overdue customers', async () => {
    const h = buildHarness();
    h.reports.customerAging.mockResolvedValue({ data: [], summary: { total_overdue: 0, overdue_customers: 0 } });
    const { sent } = await h.processor.process(makeJob({ type: 'overdue_payment', companyId: 'c1' }));
    expect(sent).toBe(0);
  });

  it('returns sent=0 when there are no active links', async () => {
    const h = buildHarness();
    h.prisma.userChannelLink.findMany.mockResolvedValue([]);
    const { sent } = await h.processor.process(makeJob({ type: 'daily_summary', companyId: 'c1' }));
    expect(sent).toBe(0);
    expect(h.reports.analyticsOverview).not.toHaveBeenCalled();
  });

  it('throws UnrecoverableError when the adapter is not configured', async () => {
    const h = buildHarness();
    h.adapter.isConfigured.mockReturnValue(false);
    await expect(
      h.processor.process(makeJob({ type: 'daily_summary', companyId: 'c1' })),
    ).rejects.toThrow(/not configured/);
  });

  it('skips one user and continues when buildRequestUser returns null', async () => {
    const h = buildHarness();
    h.links.buildRequestUser.mockResolvedValue(null);
    const { sent } = await h.processor.process(makeJob({ type: 'daily_summary', companyId: 'c1' }));
    expect(sent).toBe(0);
    expect(h.prisma.message.create).not.toHaveBeenCalled();
  });
});
