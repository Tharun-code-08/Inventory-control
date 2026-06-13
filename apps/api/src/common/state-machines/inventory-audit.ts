import { AuditAction } from '@prisma/client';
import type { AuditLogParams } from '../../modules/audit/audit.service';
import { auditRequestMetadata } from '../utils/audit-context';

export function buildReceiveGoodsAudit(params: {
  companyId: string;
  userId: string;
  productId: string;
  warehouseId: string;
  batchId?: string;
  referenceNo: string;
  beforeQty: number;
  delta: number;
  afterQty: number;
}): AuditLogParams {
  const meta = auditRequestMetadata();
  return {
    companyId: params.companyId,
    userId: params.userId,
    action: AuditAction.RECEIVE_GOODS,
    entityType: 'INVENTORY',
    entityId: params.productId,
    ipAddress: meta.ipAddress ?? undefined,
    userAgent: meta.userAgent ?? undefined,
    requestId: meta.requestId ?? undefined,
    metadata: {
      productId: params.productId,
      warehouseId: params.warehouseId,
      batchId: params.batchId ?? undefined,
      referenceNo: params.referenceNo,
      beforeQty: params.beforeQty,
      delta: params.delta,
      afterQty: params.afterQty,
      timestamp: new Date().toISOString(),
    },
  };
}

export function buildTransferStockAudit(params: {
  companyId: string;
  userId: string;
  productId: string;
  fromWarehouse: string;
  toWarehouse: string;
  qty: number;
  beforeFromQty: number;
  afterFromQty: number;
  beforeToQty: number;
  afterToQty: number;
  referenceNo: string;
}): AuditLogParams {
  const meta = auditRequestMetadata();
  return {
    companyId: params.companyId,
    userId: params.userId,
    action: AuditAction.TRANSFER_STOCK,
    entityType: 'INVENTORY',
    entityId: params.productId,
    ipAddress: meta.ipAddress ?? undefined,
    userAgent: meta.userAgent ?? undefined,
    requestId: meta.requestId ?? undefined,
    metadata: {
      productId: params.productId,
      fromWarehouse: params.fromWarehouse,
      toWarehouse: params.toWarehouse,
      qty: params.qty,
      beforeFromQty: params.beforeFromQty,
      afterFromQty: params.afterFromQty,
      beforeToQty: params.beforeToQty,
      afterToQty: params.afterToQty,
      referenceNo: params.referenceNo,
      timestamp: new Date().toISOString(),
    },
  };
}

export function buildStockAdjustmentAudit(params: {
  companyId: string;
  userId: string;
  productId: string;
  warehouseId: string;
  adjustmentType: string;
  reason: string;
  beforeQty: number;
  delta: number;
  afterQty: number;
  referenceNo: string;
}): AuditLogParams {
  const meta = auditRequestMetadata();
  return {
    companyId: params.companyId,
    userId: params.userId,
    action: AuditAction.STOCK_ADJUSTMENT,
    entityType: 'INVENTORY',
    entityId: params.productId,
    ipAddress: meta.ipAddress ?? undefined,
    userAgent: meta.userAgent ?? undefined,
    requestId: meta.requestId ?? undefined,
    reason: params.reason as any,
    metadata: {
      productId: params.productId,
      warehouseId: params.warehouseId,
      adjustmentType: params.adjustmentType,
      reason: params.reason,
      beforeQty: params.beforeQty,
      delta: params.delta,
      afterQty: params.afterQty,
      referenceNo: params.referenceNo,
      timestamp: new Date().toISOString(),
    },
  };
}
