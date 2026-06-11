import { Injectable } from '@nestjs/common';
import { AuditAction, Prisma } from '@prisma/client';
import type { RequestUser } from '../../common/types/request-user';
import { assertCompanyId } from '../../common/utils/assert-company-id';
import { PrismaService } from '../../prisma/prisma.service';
import { redactSensitive } from '../../common/utils/redact';

export type AuditLogParams = {
  companyId: string;
  userId: string;
  action: AuditAction;
  entityType: string;
  entityId: string;
  oldValues?: Prisma.InputJsonValue;
  newValues?: Prisma.InputJsonValue;
  ipAddress?: string | null;
  userAgent?: string | null;
};

export type PlatformAuditLogParams = {
  userId: string;
  action: AuditAction;
  entityType: string;
  entityId: string;
  oldValues?: Prisma.InputJsonValue;
  newValues?: Prisma.InputJsonValue;
  ipAddress?: string | null;
  userAgent?: string | null;
};

@Injectable()
export class AuditService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Convenience method for tenant‑scoped audit logs. It extracts `companyId`
   * from the provided `actor` and forwards to `log`. Throws if missing.
   */
  async logTenant(actor: RequestUser, params: Omit<AuditLogParams, 'companyId' | 'userId'>, tx?: Prisma.TransactionClient) {
    const companyId = assertCompanyId(actor);
    return this.log({ ...params, companyId, userId: actor.id }, tx);
  }

  /**
   * Write an audit row for tenant‑scoped events (requires companyId).
   * Pass an active `tx` (Prisma transaction client) when called
   * inside a `prisma.$transaction` so the audit row commits and rolls back together
   * with the business write. When `tx` is omitted the root client is used.
   */
  async log(params: AuditLogParams, tx?: Prisma.TransactionClient) {
    const client: Prisma.TransactionClient | PrismaService = tx ?? this.prisma;
    // Scrub keys like password*/token*/secret/csrf/apiKey before persisting:
    // audit_log has broader read access than the rows it mirrors, so a leak
    // here would defeat the purpose of bcrypt + cookie hardening.
    await client.auditLog.create({
      data: {
        companyId: params.companyId,
        userId: params.userId,
        action: params.action,
        entityType: params.entityType,
        entityId: params.entityId,
        oldValues: redactSensitive(params.oldValues),
        newValues: redactSensitive(params.newValues),
        ipAddress: params.ipAddress ?? null,
        userAgent: params.userAgent ?? null,
      },
    });
  }

  /**
   * Write an audit row for platform‑scoped events (no companyId).
   * Accepts all standard fields except `companyId` and writes to PlatformAuditLog.
   */
  async logPlatform(params: PlatformAuditLogParams, tx?: Prisma.TransactionClient) {
    const client: Prisma.TransactionClient | PrismaService = tx ?? this.prisma;
    await client.platformAuditLog.create({
      data: {
        userId: params.userId,
        action: params.action,
        entityType: params.entityType,
        entityId: params.entityId,
        oldValues: redactSensitive(params.oldValues),
        newValues: redactSensitive(params.newValues),
        ipAddress: params.ipAddress ?? null,
        userAgent: params.userAgent ?? null,
      },
    });
  }
}

