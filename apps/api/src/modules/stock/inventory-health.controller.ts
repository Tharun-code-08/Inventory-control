import { Controller, Get, Post, Body, Param, Query, HttpCode, HttpStatus, NotFoundException, ForbiddenException } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { RequirePermission } from '../../common/decorators/require-permission.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import type { RequestUser } from '../../common/types/request-user';
import { PrismaService } from '../../prisma/prisma.service';
import { assertCompanyId } from '../../common/utils/assert-company-id';
import { ExceptionEngineService } from './exception-engine/exception-engine.service';
import { HealthScoreService } from './exception-engine/health-score.service';

@ApiTags('inventory-health')
@ApiBearerAuth()
@Controller('inventory-health')
export class InventoryHealthController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly exceptionEngine: ExceptionEngineService,
    private readonly healthScore: HealthScoreService,
  ) {}

  @RequirePermission('inventory:health:view')
  @Get('summary')
  @HttpCode(HttpStatus.OK)
  async getSummary(@CurrentUser() user: RequestUser) {
    const companyId = assertCompanyId(user);

    const [exceptionCounts, healthScoreResult, byType, expired] = await Promise.all([
      this.exceptionEngine.getExceptionCounts(companyId),
      this.healthScore.calculateHealthScore(companyId),
      this.prisma.inventoryException.groupBy({
        by: ['type'],
        where: { companyId, status: { in: ['OPEN', 'ACKNOWLEDGED'] } },
        _count: { _all: true },
      }),
      this.prisma.inventoryException.count({
        where: {
          companyId,
          type: 'EXPIRY',
          status: { in: ['OPEN', 'ACKNOWLEDGED'] },
          metadata: { path: ['expired'], equals: true },
        },
      }),
    ]);

    const typeCount = (type: string) =>
      byType.find((row) => row.type === type)?._count._all ?? 0;

    return {
      health: {
        score: healthScoreResult.score,
        topDeductions: healthScoreResult.topDeductions,
      },
      kpis: {
        critical: exceptionCounts.critical,
        high: exceptionCounts.high,
        expiring: typeCount('EXPIRY') - expired,
        expired,
        lowStock: typeCount('LOW_STOCK'),
        pendingTransfers: typeCount('TRANSFER'),
        blockedLots: typeCount('BLOCKED_LOT'),
      },
      lastUpdated: new Date(),
    };
  }

  @RequirePermission('inventory:health:view')
  @Get()
  @HttpCode(HttpStatus.OK)
  async getFullDashboard(@CurrentUser() user: RequestUser) {
    const companyId = assertCompanyId(user);

    const [exceptions, healthScoreResult] = await Promise.all([
      this.exceptionEngine.getExceptionsByCompany(companyId, { limit: 1000 }),
      this.healthScore.calculateHealthScore(companyId),
    ]);

    // Group exceptions by type for dashboard sections
    const exceptionsByType = new Map<string, typeof exceptions>();
    for (const ex of exceptions) {
      if (!exceptionsByType.has(ex.type)) {
        exceptionsByType.set(ex.type, []);
      }
      exceptionsByType.get(ex.type)!.push(ex);
    }

    return {
      health: {
        score: healthScoreResult.score,
        topDeductions: healthScoreResult.topDeductions,
        breakdown: healthScoreResult.breakdown,
      },
      exceptions,
      exceptionsByType: Object.fromEntries(exceptionsByType),
      lastUpdated: new Date(),
    };
  }

  @RequirePermission('inventory:health:view')
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  async refresh(@CurrentUser() user: RequestUser) {
    const companyId = assertCompanyId(user);
    await this.prisma.$transaction(async (tx) => {
      await this.exceptionEngine.executeAllRules(tx, companyId);
    });
    return { success: true, refreshedAt: new Date() };
  }

  @RequirePermission('inventory:health:view')
  @Get('exceptions')
  @HttpCode(HttpStatus.OK)
  async listExceptions(
    @CurrentUser() user: RequestUser,
    @Query('status') status?: string,
    @Query('severity') severity?: string,
    @Query('type') type?: string,
  ) {
    const companyId = assertCompanyId(user);

    return this.exceptionEngine.getExceptionsByCompany(companyId, {
      status: status as any,
      severity: severity as any,
      type,
    });
  }

  @RequirePermission('inventory:health:view')
  @Post('exceptions/:id/acknowledge')
  @HttpCode(HttpStatus.OK)
  async acknowledgeException(
    @CurrentUser() user: RequestUser,
    @Param('id') exceptionId: string,
  ) {
    const companyId = assertCompanyId(user);

    await this.prisma.$transaction(async (tx: import('@prisma/client').Prisma.TransactionClient) => {
      // Verify exception belongs to user's company
      const exception = await tx.inventoryException.findUnique({
        where: { id: exceptionId },
      });

      if (!exception) {
        throw new NotFoundException('Exception not found');
      }

      if (exception.companyId !== companyId) {
        throw new ForbiddenException('Exception outside company scope');
      }

      await this.exceptionEngine.acknowledge(tx, exceptionId, user.id);
    });

    return { success: true };
  }

  @RequirePermission('inventory:health:view')
  @Post('exceptions/:id/resolve')
  @HttpCode(HttpStatus.OK)
  async resolveException(
    @CurrentUser() user: RequestUser,
    @Param('id') exceptionId: string,
    @Body() body: { resolutionNotes?: string },
  ) {
    const companyId = assertCompanyId(user);

    await this.prisma.$transaction(async (tx: import('@prisma/client').Prisma.TransactionClient) => {
      const exception = await tx.inventoryException.findUnique({
        where: { id: exceptionId },
      });

      if (!exception) {
        throw new NotFoundException('Exception not found');
      }

      if (exception.companyId !== companyId) {
        throw new ForbiddenException('Exception outside company scope');
      }

      await this.exceptionEngine.resolve(
        tx,
        exceptionId,
        user.id,
        'MANUAL',
        body.resolutionNotes,
      );
    });

    return { success: true };
  }
}
