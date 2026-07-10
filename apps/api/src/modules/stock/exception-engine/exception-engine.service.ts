import { Injectable } from '@nestjs/common';
import { ExceptionType, Prisma } from '@prisma/client';
import { PrismaService } from '../../../prisma/prisma.service';
import { ExceptionRule, ExceptionInput, RuleContext } from './exception.rule';

@Injectable()
export class ExceptionEngineService {
  private rules: Map<string, ExceptionRule> = new Map();

  constructor(private readonly prisma: PrismaService) {}

  registerRule(rule: ExceptionRule): void {
    this.rules.set(rule.name, rule);
  }

  async executeAllRules(tx: Prisma.TransactionClient, companyId: string): Promise<void> {
    const context: RuleContext = { tx, companyId };
    const detectedByType = new Map<string, Set<string>>();

    for (const [, rule] of this.rules) {
      try {
        const exceptions = await rule.evaluate(context);
        const detected = new Set<string>();
        for (const ex of exceptions) {
          await this.createOrUpdate(tx, companyId, ex);
          detected.add(`${ex.entityType}:${ex.entityId}`);
        }
        detectedByType.set(rule.type, detected);
      } catch (error) {
        console.error(`Failed to execute rule ${rule.name}:`, error);
      }
    }

    // Auto-resolve: any OPEN/ACKNOWLEDGED exception whose rule ran but no
    // longer reports it has cleared itself (stock arrived, lot unblocked, …).
    for (const [type, detected] of detectedByType) {
      const openOnes = await tx.inventoryException.findMany({
        where: {
          companyId,
          type: type as ExceptionType,
          status: { in: ['OPEN', 'ACKNOWLEDGED'] },
        },
        select: { id: true, entityType: true, entityId: true },
      });
      for (const ex of openOnes) {
        if (!detected.has(`${ex.entityType}:${ex.entityId}`)) {
          await this.resolve(tx, ex.id, null, 'AUTOMATIC', 'Condition no longer detected');
        }
      }
    }
  }

  async createOrUpdate(
    tx: Prisma.TransactionClient,
    companyId: string,
    input: ExceptionInput,
  ): Promise<void> {
    const { type, severity, entityType, entityId, title, description, metadata } = input;

    // Check if OPEN/ACKNOWLEDGED exception already exists for deduplication
    const existing = await tx.inventoryException.findFirst({
      where: {
        companyId,
        type,
        entityType,
        entityId,
        status: { in: ['OPEN', 'ACKNOWLEDGED'] },
      },
    });

    if (existing) {
      // Dedup: just update lastDetectedAt and metadata
      await tx.inventoryException.update({
        where: { id: existing.id },
        data: {
          lastDetectedAt: new Date(),
          ...(metadata ? { metadata } : {}),
        },
      });
    } else {
      // Create new exception
      await tx.inventoryException.create({
        data: {
          companyId,
          type,
          severity,
          entityType,
          entityId,
          title,
          description,
          status: 'OPEN',
          firstDetectedAt: new Date(),
          lastDetectedAt: new Date(),
          metadata: metadata || {},
        },
      });
    }
  }

  async acknowledge(
    tx: Prisma.TransactionClient,
    exceptionId: string,
    userId: string,
  ): Promise<void> {
    await tx.inventoryException.update({
      where: { id: exceptionId },
      data: {
        status: 'ACKNOWLEDGED',
        acknowledgedAt: new Date(),
        acknowledgedBy: userId,
      },
    });
  }

  async resolve(
    tx: Prisma.TransactionClient,
    exceptionId: string,
    userId: string | null,
    resolutionType: 'AUTOMATIC' | 'MANUAL',
    resolutionNotes?: string,
  ): Promise<void> {
    await tx.inventoryException.update({
      where: { id: exceptionId },
      data: {
        status: 'RESOLVED',
        resolvedAt: new Date(),
        resolvedBy: userId,
        resolutionType,
        resolutionNotes,
      },
    });
  }

  async getExceptionsByCompany(
    companyId: string,
    filters?: {
      status?: 'OPEN' | 'ACKNOWLEDGED' | 'RESOLVED';
      severity?: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
      type?: string;
      limit?: number;
    },
  ) {
    return this.prisma.inventoryException.findMany({
      where: {
        companyId,
        ...(filters?.status && { status: filters.status }),
        ...(filters?.severity && { severity: filters.severity }),
        ...(filters?.type && { type: filters.type as ExceptionType }),
      },
      orderBy: {
        lastDetectedAt: 'desc',
      },
      take: filters?.limit || 100,
    });
  }

  async getExceptionCounts(companyId: string) {
    const [critical, high, medium, low, open, acknowledged] = await Promise.all([
      this.prisma.inventoryException.count({
        where: { companyId, severity: 'CRITICAL', status: { in: ['OPEN', 'ACKNOWLEDGED'] } },
      }),
      this.prisma.inventoryException.count({
        where: { companyId, severity: 'HIGH', status: { in: ['OPEN', 'ACKNOWLEDGED'] } },
      }),
      this.prisma.inventoryException.count({
        where: { companyId, severity: 'MEDIUM', status: { in: ['OPEN', 'ACKNOWLEDGED'] } },
      }),
      this.prisma.inventoryException.count({
        where: { companyId, severity: 'LOW', status: { in: ['OPEN', 'ACKNOWLEDGED'] } },
      }),
      this.prisma.inventoryException.count({
        where: { companyId, status: 'OPEN' },
      }),
      this.prisma.inventoryException.count({
        where: { companyId, status: 'ACKNOWLEDGED' },
      }),
    ]);

    return { critical, high, medium, low, open, acknowledged };
  }
}
