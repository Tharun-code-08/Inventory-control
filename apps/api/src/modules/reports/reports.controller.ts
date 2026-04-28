import { Body, Controller, Get, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { RequirePermission } from '../../common/decorators/require-permission.decorator';
import type { RequestUser } from '../../common/types/request-user';
import { ExportReportDto } from './dto/export-report.dto';
import { ReportsService } from './reports.service';

@ApiTags('reports')
@ApiBearerAuth()
@Controller('reports')
export class ReportsController {
  constructor(
    private readonly reports: ReportsService,
    @InjectQueue('exports') private readonly exportsQueue: Queue,
  ) {}

  @RequirePermission('report:view')
  @Get('inventory')
  inventory(
    @CurrentUser() user: RequestUser,
    @Query('shop_id') shopId?: string,
    @Query('category') category?: string,
    @Query('low_stock_only') low?: string,
  ) {
    return this.reports.inventory(user, {
      shop_id: shopId,
      category,
      low_stock_only: low === 'true',
    });
  }

  @RequirePermission('report:view')
  @Get('low-stock')
  lowStock(@CurrentUser() user: RequestUser, @Query('shop_id') shopId?: string) {
    return this.reports.lowStock(user, shopId);
  }

  @RequirePermission('report:view')
  @Get('fast-moving')
  fastMoving(
    @CurrentUser() user: RequestUser,
    @Query('shop_id') shopId: string,
    @Query('date_from') dateFrom: string,
    @Query('date_to') dateTo: string,
    @Query('limit') limit?: string,
  ) {
    return this.reports.fastMoving(user, {
      shop_id: shopId,
      date_from: dateFrom,
      date_to: dateTo,
      limit: limit ? Number(limit) : undefined,
    });
  }

  @RequirePermission('report:view')
  @Get('damaged-stock')
  damaged(@CurrentUser() user: RequestUser, @Query('shop_id') shopId?: string) {
    return this.reports.damagedRegister(user, shopId);
  }

  @RequirePermission('report:view')
  @Get('gr-register')
  gr(@CurrentUser() user: RequestUser, @Query('date_from') dateFrom: string, @Query('date_to') dateTo: string, @Query('shop_id') shopId?: string) {
    return this.reports.grRegister(user, dateFrom, dateTo, shopId);
  }

  @RequirePermission('report:view')
  @Get('gi-register')
  gi(@CurrentUser() user: RequestUser, @Query('date_from') dateFrom: string, @Query('date_to') dateTo: string, @Query('shop_id') shopId?: string) {
    return this.reports.giRegister(user, dateFrom, dateTo, shopId);
  }

  @RequirePermission('report:view')
  @Get('stock-ledger')
  ledger(
    @CurrentUser() user: RequestUser,
    @Query('product_id') productId?: string,
    @Query('date_from') dateFrom?: string,
    @Query('date_to') dateTo?: string,
    @Query('shop_id') shopId?: string,
  ) {
    return this.reports.stockLedger(user, productId, dateFrom, dateTo, shopId);
  }

  @RequirePermission('report:view')
  @Get('shop-summary')
  shopSummary(@CurrentUser() user: RequestUser, @Query('shop_id') shopId?: string) {
    return this.reports.shopSummary(user, shopId);
  }

  @RequirePermission('report:export')
  @Post('export')
  async export(@Body() body: ExportReportDto) {
    const job = await this.exportsQueue.add(
      'report-xlsx',
      { type: 'report-xlsx', reportType: body.reportType, filters: body.filters },
      { removeOnComplete: true },
    );
    return { jobId: job.id };
  }
}
