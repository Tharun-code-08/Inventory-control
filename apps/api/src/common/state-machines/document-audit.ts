import { AuditAction } from '@prisma/client';
import type { AuditLogParams } from '../../modules/audit/audit.service';
import { auditRequestMetadata } from '../utils/audit-context';

export function buildStatusTransitionAudit(params: {
  userId: string;
  entityType: string;
  entityId: string;
  fromStatus: string;
  toStatus: string;
  reason?: string | null;
  action?: AuditAction;
}): AuditLogParams {
  const meta = auditRequestMetadata();
  return {
    userId: params.userId,
    action: params.action ?? AuditAction.UPDATE,
    entityType: params.entityType,
    entityId: params.entityId,
    ipAddress: meta.ipAddress,
    userAgent: meta.userAgent,
    oldValues: {
      auditType: 'STATUS_TRANSITION',
      fromStatus: params.fromStatus,
    },
    newValues: {
      auditType: 'STATUS_TRANSITION',
      toStatus: params.toStatus,
      reason: params.reason ?? null,
      requestId: meta.requestId,
      timestamp: new Date().toISOString(),
    },
  };
}

export function buildDocumentActionAudit(params: {
  userId: string;
  entityType: string;
  entityId: string;
  action: string;
  result: 'success' | 'failure';
  detail?: Record<string, unknown>;
}): AuditLogParams {
  const meta = auditRequestMetadata();
  return {
    userId: params.userId,
    action: AuditAction.UPDATE,
    entityType: params.entityType,
    entityId: params.entityId,
    ipAddress: meta.ipAddress,
    userAgent: meta.userAgent,
    newValues: {
      auditType: 'ACTION',
      action: params.action,
      result: params.result,
      requestId: meta.requestId,
      timestamp: new Date().toISOString(),
      ...(params.detail ?? {}),
    },
  };
}
