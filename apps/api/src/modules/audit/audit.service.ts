import { Injectable, BadRequestException } from '@nestjs/common';
import { AuditAction, AuditLog, Prisma } from '@prisma/client';
import type { RequestUser } from '../../common/types/request-user';
import { assertCompanyId } from '../../common/utils/assert-company-id';
import { PrismaService } from '../../prisma/prisma.service';
import { redactSensitive } from '../../common/utils/redact';

export type AuditLogParams = {
  companyId: string;
  userId: string;
  action: AuditAction;
  entityType?: string;
  entityId?: string;
  oldValues?: Prisma.InputJsonValue;
  newValues?: Prisma.InputJsonValue;
  ipAddress?: string | null;
  userAgent?: string | null;
  deviceId?: string | null;
  metadata?: Prisma.InputJsonValue;
  reason?: string;
  severity?: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
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
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Convenience method for tenant‑scoped audit logs. Extracts companyId from actor.
   */
  async logTenant(
    actor: RequestUser,
    params: Omit<AuditLogParams, 'companyId' | 'userId'>,
    tx?: Prisma.TransactionClient,
  ) {
    const companyId = assertCompanyId(actor);
    return this.log({ ...params, companyId, userId: actor.id }, tx);
  }

  /**
   * Write an audit row for tenant-scoped events (requires companyId).
   * Sensitive fields (passwords, tokens) are automatically redacted.
   */
  async log(params: AuditLogParams, tx?: Prisma.TransactionClient) {
    const client: Prisma.TransactionClient | PrismaService = tx ?? this.prisma;

    await client.auditLog.create({
      data: {
        companyId: params.companyId,
        userId: params.userId,
        action: params.action,
        entityType: params.entityType ?? null,
        entityId: params.entityId ?? null,
        oldValues: redactSensitive(params.oldValues),
        newValues: redactSensitive(params.newValues),
        ipAddress: params.ipAddress ?? null,
        userAgent: params.userAgent ?? null,
        deviceId: params.deviceId ?? null,
        metadata: params.metadata ?? null,
        reason: params.reason ?? null,
        severity: params.severity ?? null,
        requestId: params.requestId ?? null,
      },
    });
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
      log.user.name || '',
      log.user.email || '',
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

