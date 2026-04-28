import { Injectable } from '@nestjs/common';
import { DocumentStatus, Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import type { RequestUser } from '../../common/types/request-user';
import { assertShopScope, defaultShopFilter } from '../../common/utils/shop-scope';

export type DashboardSummaryPayload = {
  totalProducts: number;
  totalStockValue: number;
  lowStockCount: number;
  recentTransactions: number;
  monthlyMovement: { month: string; receipts: number; issues: number }[];
  categoryBreakdown: { category: string; count: number }[];
  recentGoodsReceipts: Array<{
    id: string;
    grNumber: string;
    grDate: string;
    supplier: string;
    totalValue: number;
    status: string;
  }>;
  recentGoodsIssues: Array<{
    id: string;
    giNumber: string;
    giDate: string;
    issueReason: string;
    status: string;
  }>;
  lowStockProducts: Array<{
    id: string;
    productCode: string;
    description: string;
    currentStock: number;
    minStockLevel: number;
  }>;
};

function endOfMonth(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth() + 1, 0, 23, 59, 59, 999);
}

@Injectable()
export class DashboardService {
  constructor(private readonly prisma: PrismaService) {}

  async summary(user: RequestUser, shop_id?: string): Promise<DashboardSummaryPayload> {
    const shopScope = defaultShopFilter(user);
    const shopId = shopScope ?? shop_id;
    if (shop_id) assertShopScope(user, shop_id);

    const productWhere: Prisma.ProductWhereInput = {
      isActive: true,
      ...(shopId ? { shopId } : {}),
    };

    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const [totalProducts, products, catGroups, recentGrHeaders, recentGiHeaders] = await Promise.all([
      this.prisma.product.count({ where: productWhere }),
      this.prisma.product.findMany({
        where: productWhere,
        include: { stockSummaries: true },
      }),
      this.prisma.product.groupBy({
        by: ['category'],
        where: productWhere,
        _count: { _all: true },
      }),
      this.prisma.goodsReceiptHeader.findMany({
        where: shopId ? { shopId } : {},
        orderBy: { grDate: 'desc' },
        take: 5,
        include: { items: { select: { lineValue: true } } },
      }),
      this.prisma.goodsIssueHeader.findMany({
        where: shopId ? { shopId } : {},
        orderBy: { giDate: 'desc' },
        take: 5,
      }),
    ]);

    let totalStockValue = 0;
    type LowRow = DashboardSummaryPayload['lowStockProducts'][number];
    const lowCandidates: LowRow[] = [];

    for (const p of products) {
      const stockRow = p.stockSummaries.find((s) => s.shopId === p.shopId);
      const qty = Number(stockRow?.currentStock ?? 0);
      const minLevel = Number(p.minStockLevel);
      const unitValue = Number(p.sellingPrice);
      totalStockValue += qty * unitValue;
      if (qty < minLevel) {
        lowCandidates.push({
          id: p.id,
          productCode: p.productCode,
          description: p.description,
          currentStock: qty,
          minStockLevel: minLevel,
        });
      }
    }

    lowCandidates.sort((a, b) => {
      const ra = a.minStockLevel > 0 ? a.currentStock / a.minStockLevel : 0;
      const rb = b.minStockLevel > 0 ? b.currentStock / b.minStockLevel : 0;
      return ra - rb;
    });
    const lowStockProducts = lowCandidates.slice(0, 10);
    const lowStockCount = lowCandidates.length;

    const [gr30, gi30] = await Promise.all([
      this.prisma.goodsReceiptHeader.count({
        where: {
          status: DocumentStatus.POSTED,
          grDate: { gte: thirtyDaysAgo },
          ...(shopId ? { shopId } : {}),
        },
      }),
      this.prisma.goodsIssueHeader.count({
        where: {
          status: DocumentStatus.POSTED,
          giDate: { gte: thirtyDaysAgo },
          ...(shopId ? { shopId } : {}),
        },
      }),
    ]);
    const recentTransactions = gr30 + gi30;

    const now = new Date();
    const monthlyMovement: DashboardSummaryPayload['monthlyMovement'] = [];
    for (let i = 5; i >= 0; i -= 1) {
      const start = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const end = endOfMonth(start);
      const grWhere: Prisma.GoodsReceiptHeaderWhereInput = {
        status: DocumentStatus.POSTED,
        grDate: { gte: start, lte: end },
        ...(shopId ? { shopId } : {}),
      };
      const giWhere: Prisma.GoodsIssueHeaderWhereInput = {
        status: DocumentStatus.POSTED,
        giDate: { gte: start, lte: end },
        ...(shopId ? { shopId } : {}),
      };
      const [receipts, issues] = await Promise.all([
        this.prisma.goodsReceiptHeader.count({ where: grWhere }),
        this.prisma.goodsIssueHeader.count({ where: giWhere }),
      ]);
      monthlyMovement.push({
        month: start.toLocaleString('en-US', { month: 'short', year: 'numeric' }),
        receipts,
        issues,
      });
    }

    const categoryBreakdown = catGroups.map((g) => ({
      category: g.category?.trim() ? g.category : 'Uncategorized',
      count: g._count._all,
    }));

    const recentGoodsReceipts = recentGrHeaders.map((gr) => ({
      id: gr.id,
      grNumber: gr.grNumber,
      grDate: gr.grDate.toISOString(),
      supplier: gr.supplierName,
      totalValue: gr.items.reduce((sum, line) => sum + Number(line.lineValue), 0),
      status: gr.status,
    }));

    const recentGoodsIssues = recentGiHeaders.map((gi) => ({
      id: gi.id,
      giNumber: gi.giNumber,
      giDate: gi.giDate.toISOString(),
      issueReason: gi.issueReason,
      status: gi.status,
    }));

    return {
      totalProducts,
      totalStockValue: Math.round(totalStockValue * 100) / 100,
      lowStockCount,
      recentTransactions,
      monthlyMovement,
      categoryBreakdown,
      recentGoodsReceipts,
      recentGoodsIssues,
      lowStockProducts,
    };
  }
}
