import { Injectable } from '@nestjs/common';
import { ExceptionType, Prisma } from '@prisma/client';
import { PrismaService } from '../../../prisma/prisma.service';

type Category = 'expiry' | 'transfers' | 'lowStock' | 'quality' | 'integrity';
type Severity = 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';

interface CategoryWeights {
  maxDeduction: number;
  /** Deduction per open exception, by severity. */
  perSeverity: Record<Severity, number>;
}

export type WeightConfig = Record<Category, CategoryWeights>;

interface HealthScoreResult {
  score: number;
  topDeductions: Array<{ label: string; deduction: number }>;
  breakdown: Record<Category, number>;
}

const TYPE_TO_CATEGORY: Record<ExceptionType, Category> = {
  EXPIRY: 'expiry',
  TRANSFER: 'transfers',
  LOW_STOCK: 'lowStock',
  BLOCKED_LOT: 'quality',
  INVENTORY_INTEGRITY: 'integrity',
};

const CATEGORY_LABELS: Record<Category, string> = {
  expiry: 'Expiry',
  transfers: 'Transfers',
  lowStock: 'Low Stock',
  quality: 'Blocked Lots',
  integrity: 'Inventory Integrity',
};

const DEFAULT_WEIGHTS: WeightConfig = {
  expiry: { maxDeduction: 30, perSeverity: { CRITICAL: 10, HIGH: 5, MEDIUM: 3, LOW: 1 } },
  transfers: { maxDeduction: 20, perSeverity: { CRITICAL: 8, HIGH: 5, MEDIUM: 3, LOW: 1 } },
  lowStock: { maxDeduction: 20, perSeverity: { CRITICAL: 6, HIGH: 4, MEDIUM: 2, LOW: 1 } },
  quality: { maxDeduction: 15, perSeverity: { CRITICAL: 8, HIGH: 5, MEDIUM: 3, LOW: 1 } },
  integrity: { maxDeduction: 15, perSeverity: { CRITICAL: 10, HIGH: 6, MEDIUM: 3, LOW: 1 } },
};

@Injectable()
export class HealthScoreService {
  constructor(private readonly prisma: PrismaService) {}

  async calculateHealthScore(companyId: string): Promise<HealthScoreResult> {
    const config = await this.getCompanyWeights(companyId);
    const exceptions = await this.prisma.inventoryException.findMany({
      where: { companyId, status: { in: ['OPEN', 'ACKNOWLEDGED'] } },
      select: { type: true, severity: true },
    });

    const rawByCategory: Record<Category, number> = {
      expiry: 0,
      transfers: 0,
      lowStock: 0,
      quality: 0,
      integrity: 0,
    };

    for (const ex of exceptions) {
      const category = TYPE_TO_CATEGORY[ex.type];
      const weights = config[category] ?? DEFAULT_WEIGHTS[category];
      rawByCategory[category] += weights.perSeverity[ex.severity as Severity] ?? 1;
    }

    const breakdown = Object.fromEntries(
      (Object.keys(rawByCategory) as Category[]).map((cat) => [
        cat,
        Math.min(rawByCategory[cat], (config[cat] ?? DEFAULT_WEIGHTS[cat]).maxDeduction),
      ]),
    ) as Record<Category, number>;

    const totalDeduction = Object.values(breakdown).reduce((a, b) => a + b, 0);
    const score = Math.max(0, 100 - totalDeduction);

    const topDeductions = (Object.entries(breakdown) as Array<[Category, number]>)
      .filter(([, deduction]) => deduction > 0)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([category, deduction]) => ({
        label: CATEGORY_LABELS[category],
        deduction,
      }));

    return { score, topDeductions, breakdown };
  }

  private async getCompanyWeights(companyId: string): Promise<WeightConfig> {
    const row = await this.prisma.companyHealthScoreConfig.findUnique({
      where: { companyId },
    });
    if (!row) return DEFAULT_WEIGHTS;

    try {
      const parsed = typeof row.config === 'string' ? JSON.parse(row.config) : row.config;
      const weights = (parsed as { weights?: Partial<WeightConfig> })?.weights;
      if (!weights) return DEFAULT_WEIGHTS;
      return { ...DEFAULT_WEIGHTS, ...weights };
    } catch {
      return DEFAULT_WEIGHTS;
    }
  }

  async setCompanyWeights(companyId: string, weights: WeightConfig): Promise<void> {
    const config = { schemaVersion: 1, weights } as unknown as Prisma.InputJsonValue;
    await this.prisma.companyHealthScoreConfig.upsert({
      where: { companyId },
      update: { config },
      create: { companyId, config },
    });
  }
}
