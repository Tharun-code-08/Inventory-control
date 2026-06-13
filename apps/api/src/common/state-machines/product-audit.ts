import { AuditAction } from '@prisma/client';
import type { AuditLogParams } from '../../modules/audit/audit.service';
import { auditRequestMetadata } from '../utils/audit-context';

/** Changed fields in UPDATE_PRODUCT: only include modified fields. */
export type ProductChangedFields = {
  productCode?: { old: string; new: string };
  description?: { old: string; new: string };
  uom?: { old: string; new: string };
  category?: { old: string | null; new: string | null };
  hsnCode?: { old: string | null; new: string | null };
  materialGroup?: { old: string | null; new: string | null };
  drawingReference?: { old: string | null; new: string | null };
  brand?: { old: string | null; new: string | null };
  taxPreference?: { old: string; new: string };
  gstRate?: { old: number; new: number };
  purchasePrice?: { old: number; new: number };
  sellingPrice?: { old: number; new: number };
  isActive?: { old: boolean; new: boolean };
};

export function buildCreateProductAudit(params: {
  companyId: string;
  userId: string;
  productId: string;
  productCode: string;
  description: string;
}): AuditLogParams {
  const meta = auditRequestMetadata();
  return {
    companyId: params.companyId,
    userId: params.userId,
    action: AuditAction.CREATE_PRODUCT,
    entityType: 'PRODUCT',
    entityId: params.productId,
    ipAddress: meta.ipAddress ?? undefined,
    userAgent: meta.userAgent ?? undefined,
    requestId: meta.requestId ?? undefined,
    metadata: {
      productId: params.productId,
      productCode: params.productCode,
      description: params.description,
      timestamp: new Date().toISOString(),
    },
  };
}

export function buildUpdateProductAudit(params: {
  companyId: string;
  userId: string;
  productId: string;
  productCode: string;
  changedFields: ProductChangedFields;
}): AuditLogParams {
  const meta = auditRequestMetadata();
  return {
    companyId: params.companyId,
    userId: params.userId,
    action: AuditAction.UPDATE_PRODUCT,
    entityType: 'PRODUCT',
    entityId: params.productId,
    ipAddress: meta.ipAddress ?? undefined,
    userAgent: meta.userAgent ?? undefined,
    requestId: meta.requestId ?? undefined,
    oldValues: Object.keys(params.changedFields).length > 0
      ? Object.entries(params.changedFields).reduce(
          (acc, [key, value]) => {
            if (value && 'old' in value) {
              acc[key] = value.old;
            }
            return acc;
          },
          {} as Record<string, any>,
        )
      : undefined,
    newValues: Object.keys(params.changedFields).length > 0
      ? Object.entries(params.changedFields).reduce(
          (acc, [key, value]) => {
            if (value && 'new' in value) {
              acc[key] = value.new;
            }
            return acc;
          },
          {} as Record<string, any>,
        )
      : undefined,
    metadata: {
      productId: params.productId,
      productCode: params.productCode,
      changedFields: Object.keys(params.changedFields),
      timestamp: new Date().toISOString(),
    },
  };
}

export function buildDeleteProductAudit(params: {
  companyId: string;
  userId: string;
  productId: string;
  productCode: string;
  description: string;
}): AuditLogParams {
  const meta = auditRequestMetadata();
  return {
    companyId: params.companyId,
    userId: params.userId,
    action: AuditAction.DELETE_PRODUCT,
    entityType: 'PRODUCT',
    entityId: params.productId,
    ipAddress: meta.ipAddress ?? undefined,
    userAgent: meta.userAgent ?? undefined,
    requestId: meta.requestId ?? undefined,
    oldValues: {
      productCode: params.productCode,
      description: params.description,
    },
    metadata: {
      productId: params.productId,
      productCode: params.productCode,
      timestamp: new Date().toISOString(),
    },
  };
}
