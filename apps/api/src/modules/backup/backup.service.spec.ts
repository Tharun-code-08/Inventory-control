import { SubscriptionPlan } from '@prisma/client';
import { planAllowsFeature } from '../../common/plans/plan-config';
import { TenantBackupService } from '../../modules/backup/tenant-backup.service';
import { BACKUP_SCHEMA_VERSION } from '../../modules/backup/backup.constants';

describe('planAllowsFeature backups', () => {
  it('allows backups on Pro and Plus', () => {
    expect(planAllowsFeature(SubscriptionPlan.PRO, 'backups')).toBe(true);
    expect(planAllowsFeature(SubscriptionPlan.PLUS, 'backups')).toBe(true);
  });

  it('blocks backups on Trial', () => {
    expect(planAllowsFeature(SubscriptionPlan.TRIAL, 'backups')).toBe(false);
  });
});

describe('TenantBackupService', () => {
  it('builds dry-run report with counts', () => {
    const service = new TenantBackupService({} as never);
    const report = service.buildDryRunReport(
      {
        backupSchemaVersion: BACKUP_SCHEMA_VERSION,
        exportedAt: '2026-05-26T00:00:00.000Z',
        company: { companyCode: 'SDC-001' },
        shops: [{ id: '1' }],
        storageLocations: [],
        suppliers: [],
        customers: [],
        products: [{ id: 'p1' }],
        productPlants: [],
        productSpecifications: [],
        stockSummaries: [],
        stockLedgers: [],
        purchaseOrders: [],
        purchaseOrderItems: [],
        goodsReceipts: [],
        goodsReceiptItems: [],
        goodsIssues: [],
        goodsIssueItems: [],
        salesOrders: [],
        salesOrderItems: [],
        invoices: [],
        paymentReceipts: [],
      },
      { companyCode: 'SDC-001' },
    );
    expect(report.counts.products).toBe(1);
    expect(report.canApply).toBe(true);
  });

  it('parses gzip tenant backup buffers', () => {
    const service = new TenantBackupService({} as never);
    const payload = {
      backupSchemaVersion: BACKUP_SCHEMA_VERSION,
      exportedAt: '2026-05-26T00:00:00.000Z',
      company: { companyCode: 'SDC-001' },
      shops: [],
      storageLocations: [],
      suppliers: [],
      customers: [],
      products: [],
      productPlants: [],
      productSpecifications: [],
      stockSummaries: [],
      stockLedgers: [],
      purchaseOrders: [],
      purchaseOrderItems: [],
      goodsReceipts: [],
      goodsReceiptItems: [],
      goodsIssues: [],
      goodsIssueItems: [],
      salesOrders: [],
      salesOrderItems: [],
      invoices: [],
      paymentReceipts: [],
    };
    const buffer = service.serializeBackup(payload as never);
    const parsed = service.parseBackupBuffer(buffer);
    expect(parsed.backupSchemaVersion).toBe(BACKUP_SCHEMA_VERSION);
    expect(parsed.company.companyCode).toBe('SDC-001');
  });
});
