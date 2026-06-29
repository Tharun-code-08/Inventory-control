import { Injectable, Logger } from '@nestjs/common';
import { AuditAction, AuditLog, AuditSeverity, Prisma } from '@prisma/client';
import type { RequestUser } from '../../common/types/request-user';
import { PrismaService } from '../../prisma/prisma.service';
import { RequestContextStore } from '../../common/context/request-context';
import { redactSensitive } from '../../common/utils/redact';

export type AuditLogParams = {
  companyId?: string | null;
  userId?: string | null;
  action: AuditAction;
  entityType?: string;
  entityId?: string;
  oldValues?: Prisma.InputJsonValue;
  newValues?: Prisma.InputJsonValue;
  ipAddress?: string | null;
  userAgent?: string | null;
  deviceId?: string | null;
  metadata?: Prisma.InputJsonValue;
  reason?: string; // Flexible string instead of enum
  severity?: AuditSeverity;
  requestId?: string;
};

export type AuditFilterParams = {
  action?: AuditAction;
  entityType?: string;
  entityId?: string;
  userId?: string;
  startDate?: Date;
  endDate?: Date;
  ipAddress?: string;
  searchQuery?: string;
};

export type PaginationParams = {
  page: number;
  limit: number;
  sortBy?: 'createdAt' | 'userId' | 'action';
  sortOrder?: 'asc' | 'desc';
};

@Injectable()
export class AuditService {
  private readonly logger = new Logger('AuditService');

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Convenience method for tenant‑scoped audit logs. Extracts companyId from actor.
   * Non-blocking: audit failures do not fail the operation.
   */
  async logTenant(
    actor: RequestUser,
    params: Omit<AuditLogParams, 'companyId' | 'userId'>,
    _tx?: Prisma.TransactionClient,
  ): Promise<void> {
    // Use actor's company if available, otherwise leave as null for LOGIN_FAILED scenarios
    const companyId = actor.companyId ?? null;
    await this.logAsync({ ...params, companyId, userId: actor.id });
  }

  /**
   * Write an audit row. Never throws. Failures are logged but don't block operations.
   * Sensitive fields (passwords, tokens) are automatically redacted.
   */
  async log(params: AuditLogParams, _tx?: Prisma.TransactionClient): Promise<void> {
    await this.logAsync(params);
  }

  /**
   * Audit write. Awaited by callers so the row is durable before the operation
   * responds, but failures are caught and logged here — audit is observability
   * and must never break the operation. The write always uses the base Prisma
   * connection (never the caller's `tx`) so a failed audit insert cannot poison
   * the operation's transaction.
   */
  private async logAsync(params: AuditLogParams): Promise<void> {
    try {
      const client = this.prisma;

      // Resolve requestId from the explicit param, falling back to the per-request
      // AsyncLocalStorage context so every audit is traceable without each caller
      // threading it through manually.
      const requestId = params.requestId ?? RequestContextStore.getRequestId() ?? null;

      // Merge requestId into metadata for end-to-end traceability — every audit
      // record carries the originating requestId both as a column and in metadata.
      // Only merge into object-shaped metadata; otherwise preserve as-is.
      const baseMetadata =
        params.metadata && typeof params.metadata === 'object' && !Array.isArray(params.metadata)
          ? (params.metadata as Record<string, unknown>)
          : undefined;
      const metadata = requestId
        ? { ...(baseMetadata ?? {}), requestId }
        : params.metadata ?? undefined;

      // Build data object with conditional fields for proper Prisma typing
      const data: Prisma.AuditLogCreateInput = {
        companyId: params.companyId || undefined,
        userId: params.userId || undefined,
        action: params.action,
        entityType: params.entityType ?? null,
        entityId: params.entityId ?? null,
        oldValues: redactSensitive(params.oldValues),
        newValues: redactSensitive(params.newValues),
        ipAddress: params.ipAddress ?? null,
        userAgent: params.userAgent ?? null,
        deviceId: params.deviceId ?? null,
        metadata,
        reason: params.reason ?? undefined,
        severity: params.severity ?? undefined,
        requestId,
      } as any;

      await client.auditLog.create({ data });
    } catch (error) {
      // Log audit failure but never throw — audit is observability, not critical path
      this.logger.error(`Audit write failed for action ${params.action}:`, error);
    }
  }

  /**
   * Get all audit logs for a company with optional filtering and pagination
   */
  async findAll(
    companyId: string,
    filters: AuditFilterParams,
    pagination: PaginationParams,
  ): Promise<{ data: AuditLog[]; total: number }> {
    const where: Prisma.AuditLogWhereInput = {
      companyId,
      ...(filters.action && { action: filters.action }),
      ...(filters.entityType && { entityType: filters.entityType }),
      ...(filters.entityId && { entityId: filters.entityId }),
      ...(filters.userId && { userId: filters.userId }),
      ...(filters.ipAddress && { ipAddress: filters.ipAddress }),
      ...(filters.startDate || filters.endDate
        ? {
            createdAt: {
              ...(filters.startDate && { gte: filters.startDate }),
              ...(filters.endDate && { lte: filters.endDate }),
            },
          }
        : {}),
    };

    const [data, total] = await Promise.all([
      this.prisma.auditLog.findMany({
        where,
        include: { user: { select: { id: true, email: true, name: true } } },
        orderBy: {
          [pagination.sortBy || 'createdAt']: pagination.sortOrder || 'desc',
        },
        skip: (pagination.page - 1) * pagination.limit,
        take: pagination.limit,
      }),
      this.prisma.auditLog.count({ where }),
    ]);

    return { data, total };
  }

  /**
   * Get single audit log by ID
   */
  async findById(id: string, companyId: string): Promise<AuditLog | null> {
    return this.prisma.auditLog.findFirst({
      where: { id, companyId },
      include: { user: { select: { id: true, email: true, name: true } } },
    });
  }

  /**
   * Get all audit logs for a specific user
   */
  async findByUser(
    companyId: string,
    userId: string,
    pagination: PaginationParams,
  ): Promise<{ data: AuditLog[]; total: number }> {
    const where = { companyId, userId };

    const [data, total] = await Promise.all([
      this.prisma.auditLog.findMany({
        where,
        include: { user: { select: { id: true, email: true, name: true } } },
        orderBy: { [pagination.sortBy || 'createdAt']: pagination.sortOrder || 'desc' },
        skip: (pagination.page - 1) * pagination.limit,
        take: pagination.limit,
      }),
      this.prisma.auditLog.count({ where }),
    ]);

    return { data, total };
  }

  /**
   * Get all audit logs for a specific entity
   */
  async findByEntity(companyId: string, entityType: string, entityId: string): Promise<AuditLog[]> {
    return this.prisma.auditLog.findMany({
      where: { companyId, entityType, entityId },
      include: { user: { select: { id: true, email: true, name: true } } },
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * Export audit logs as CSV
   */
  async exportCsv(companyId: string, filters: AuditFilterParams): Promise<string> {
    const where: Prisma.AuditLogWhereInput = {
      companyId,
      ...(filters.action && { action: filters.action }),
      ...(filters.entityType && { entityType: filters.entityType }),
      ...(filters.entityId && { entityId: filters.entityId }),
      ...(filters.userId && { userId: filters.userId }),
    };

    const logs = await this.prisma.auditLog.findMany({
      where,
      include: { user: { select: { id: true, email: true, name: true } } },
      orderBy: { createdAt: 'desc' },
      take: 10000, // Limit to 10k rows for export
    });

    // CSV headers
    const headers = [
      'ID',
      'Timestamp',
      'User',
      'Email',
      'Action',
      'Entity Type',
      'Entity ID',
      'Old Values',
      'New Values',
      'IP Address',
      'Device ID',
      'Reason',
      'Severity',
    ];

    const rows = logs.map((log) => [
      log.id,
      log.createdAt.toISOString(),
      log.user?.name || '',
      log.user?.email || '',
      log.action,
      log.entityType || '',
      log.entityId || '',
      JSON.stringify(log.oldValues || {}),
      JSON.stringify(log.newValues || {}),
      log.ipAddress || '',
      log.deviceId || '',
      log.reason || '',
      log.severity || '',
    ]);

    // Escape CSV values
    const csvHeaders = headers.map((h) => `"${h}"`).join(',');
    const csvRows = rows
      .map((row) =>
        row
          .map((cell) => {
            const str = typeof cell === 'string' ? cell : JSON.stringify(cell);
            return `"${str.replace(/"/g, '""')}"`;
          })
          .join(','),
      )
      .join('\n');

    return `${csvHeaders}\n${csvRows}`;
  }

  /**
   * Clear audit logs older than specified days
   */
  async clearOldLogs(daysToKeep: number = 90): Promise<number> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);

    const result = await this.prisma.auditLog.deleteMany({
      where: {
        createdAt: { lt: cutoffDate },
      },
    });

    return result.count;
  }
}

