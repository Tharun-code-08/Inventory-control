import { Prisma } from '@prisma/client';

export interface RuleContext {
  tx: Prisma.TransactionClient;
  companyId: string;
}

export interface ExceptionInput {
  type: 'EXPIRY' | 'LOW_STOCK' | 'TRANSFER' | 'BLOCKED_LOT' | 'INVENTORY_INTEGRITY';
  severity: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
  entityType: 'LOT' | 'PRODUCT' | 'TRANSFER' | 'STORAGE_LOCATION';
  entityId: string;
  title: string;
  description?: string;
  metadata?: Record<string, any>;
}

export abstract class ExceptionRule {
  abstract name: string;
  abstract type: string;

  abstract evaluate(context: RuleContext): Promise<ExceptionInput[]>;
}
