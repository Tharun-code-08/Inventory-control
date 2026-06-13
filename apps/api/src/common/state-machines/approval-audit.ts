import { AuditAction } from '@prisma/client';
import type { AuditLogParams } from '../../modules/audit/audit.service';
import { auditRequestMetadata } from '../utils/audit-context';

/**
 * Day 5 — Approval audit builders. Same shape as the inventory/product
 * builders: pull request metadata (requestId, ip, userAgent) from the
 * AsyncLocalStorage context, store only the fields that carry real
 * operational meaning. No fabricated workflow data.
 */

export function buildApproveAudit(params: {
  companyId: string;
  userId: string;
  approvalId: string;
  approvalType: string;
  documentNumber?: string | null;
  workflowStep?: number;
  comment?: string | null;
}): AuditLogParams {
  const meta = auditRequestMetadata();
  return {
    companyId: params.companyId,
    userId: params.userId,
    action: AuditAction.APPROVE,
    entityType: params.approvalType,
    entityId: params.approvalId,
    ipAddress: meta.ipAddress ?? undefined,
    userAgent: meta.userAgent ?? undefined,
    requestId: meta.requestId ?? undefined,
    metadata: {
      approvalId: params.approvalId,
      approvalType: params.approvalType,
      documentNumber: params.documentNumber ?? undefined,
      workflowStep: params.workflowStep ?? undefined,
      comment: params.comment ?? undefined,
      timestamp: new Date().toISOString(),
    },
  };
}

export function buildRejectAudit(params: {
  companyId: string;
  userId: string;
  approvalId: string;
  approvalType: string;
  documentNumber?: string | null;
  workflowStep?: number;
  reason: string;
  comment?: string | null;
}): AuditLogParams {
  const meta = auditRequestMetadata();
  return {
    companyId: params.companyId,
    userId: params.userId,
    action: AuditAction.REJECT,
    entityType: params.approvalType,
    entityId: params.approvalId,
    ipAddress: meta.ipAddress ?? undefined,
    userAgent: meta.userAgent ?? undefined,
    requestId: meta.requestId ?? undefined,
    metadata: {
      approvalId: params.approvalId,
      approvalType: params.approvalType,
      documentNumber: params.documentNumber ?? undefined,
      workflowStep: params.workflowStep ?? undefined,
      reason: params.reason,
      comment: params.comment ?? undefined,
      timestamp: new Date().toISOString(),
    },
  };
}

export function buildEscalateAudit(params: {
  companyId: string;
  /** Actor who triggered the escalation; absent when system-triggered (overdue). */
  userId?: string | null;
  approvalId: string;
  approvalType: string;
  documentNumber?: string | null;
  level: number;
  escalatedTo: string;
  reason: string;
}): AuditLogParams {
  const meta = auditRequestMetadata();
  return {
    companyId: params.companyId,
    userId: params.userId ?? undefined,
    action: AuditAction.ESCALATE,
    entityType: params.approvalType,
    entityId: params.approvalId,
    ipAddress: meta.ipAddress ?? undefined,
    userAgent: meta.userAgent ?? undefined,
    requestId: meta.requestId ?? undefined,
    metadata: {
      approvalId: params.approvalId,
      approvalType: params.approvalType,
      documentNumber: params.documentNumber ?? undefined,
      level: params.level,
      escalatedTo: params.escalatedTo,
      reason: params.reason,
      timestamp: new Date().toISOString(),
    },
  };
}
