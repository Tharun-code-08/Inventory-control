import { Body, Controller, Delete, Get, Param, Post, Query } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { createHash } from 'crypto';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { RequirePermission } from '../../common/decorators/require-permission.decorator';
import type { RequestUser } from '../../common/types/request-user';
import { ExportReportDto } from './dto/export-report.dto';
import { CreateSavedFilterDto } from './dto/create-saved-filter.dto';
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
  @Get('analytics/overview')
  overview(
    @CurrentUser() user: RequestUser,
    @Query('shop_id') shopId?: string,
    @Query('date_from') dateFrom?: string,
    @Query('date_to') dateTo?: string,
  ) {
    return this.reports.analyticsOverview(user, {
      shop_id: shopId,
      date_from: dateFrom,
      date_to: dateTo,
    });
  }

  @RequirePermission('report:view')
  @Get('po-summary')
  poSummary(
    @CurrentUser() user: RequestUser,
    @Query('shop_id') shopId?: string,
    @Query('date_from') dateFrom?: string,
    @Query('date_to') dateTo?: string,
    @Query('po_number') poNumber?: string,
    @Query('supplier') supplier?: string,
    @Query('status') status?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.reports.purchaseOrderSummary(user, {
      shop_id: shopId,
      date_from: dateFrom,
      date_to: dateTo,
      po_number: poNumber,
      supplier,
      status,
      page: page ? Number(page) : undefined,
      limit: limit ? Number(limit) : undefined,
    });
  }

  @RequirePermission('report:view')
  @Get('sales-summary')
  salesSummary(
    @CurrentUser() user: RequestUser,
    @Query('shop_id') shopId?: string,
    @Query('date_from') dateFrom?: string,
    @Query('date_to') dateTo?: string,
    @Query('order_number') orderNumber?: string,
    @Query('customer') customer?: string,
    @Query('status') status?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.reports.salesOrderSummary(user, {
      shop_id: shopId,
      date_from: dateFrom,
      date_to: dateTo,
      order_number: orderNumber,
      customer,
      status,
      page: page ? Number(page) : undefined,
      limit: limit ? Number(limit) : undefined,
    });
  }

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
  lowStock(
    @CurrentUser() user: RequestUser,
    @Query('shop_id') shopId?: string,
    @Query('category') category?: string,
  ) {
    return this.reports.lowStock(user, shopId, category);
  }

  @RequirePermission('report:view')
  @Get('dead-stock')
  deadStock(
    @CurrentUser() user: RequestUser,
    @Query('shop_id') shopId?: string,
    @Query('category') category?: string,
    @Query('supplier') supplier?: string,
    @Query('days_unsold') daysUnsold?: string,
    @Query('sort_by') sortBy?: 'stockValue' | 'daysUnsold',
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    const days = daysUnsold ? Number(daysUnsold) : 90;
    return this.reports.deadStock(user, {
      shop_id: shopId,
      category,
      supplier,
      days_unsold: days,
      sort_by: sortBy,
      page: page ? Number(page) : undefined,
      limit: limit ? Number(limit) : undefined,
    });
  }

  @RequirePermission('report:view')
  @Get('reorder-intelligence')
  reorderIntelligence(
    @CurrentUser() user: RequestUser,
    @Query('shop_id') shopId: string,
    @Query('date_from') dateFrom?: string,
    @Query('date_to') dateTo?: string,
    @Query('category') category?: string,
    @Query('stock_status') stockStatus?: 'IN_STOCK' | 'BELOW_MIN' | 'OVERSTOCK',
    @Query('sort_by') sortBy?: 'urgency' | 'daysLeft' | 'avgSalesPerDay',
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.reports.reorderIntelligence(user, {
      shop_id: shopId,
      date_from: dateFrom,
      date_to: dateTo,
      category,
      stock_status: stockStatus,
      sort_by: sortBy,
      page: page ? Number(page) : undefined,
      limit: limit ? Number(limit) : undefined,
    });
  }

  @RequirePermission('report:view')
  @Get('customer-aging')
  customerAging(
    @CurrentUser() user: RequestUser,
    @Query('shop_id') shopId?: string,
    @Query('show_overdue_only') showOverdueOnly?: string,
    @Query('customer_name') customerName?: string,
    @Query('sort_by') sortBy?: 'totalOutstanding' | 'overdueAmount' | 'riskScore',
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.reports.customerAging(user, {
      shop_id: shopId,
      show_overdue_only: showOverdueOnly === 'true',
      customer_name: customerName,
      sort_by: sortBy,
      page: page ? Number(page) : undefined,
      limit: limit ? Number(limit) : undefined,
    });
  }

  @RequirePermission('report:view')
  @Get('product-profitability')
  productProfitability(
    @CurrentUser() user: RequestUser,
    @Query('shop_id') shopId?: string,
    @Query('date_from') dateFrom?: string,
    @Query('date_to') dateTo?: string,
    @Query('category') category?: string,
    @Query('show_loss_only') showLossOnly?: string,
    @Query('sort_by') sortBy?: 'profit' | 'margin' | 'revenue',
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.reports.productProfitability(user, {
      shop_id: shopId,
      date_from: dateFrom,
      date_to: dateTo,
      category,
      show_loss_only: showLossOnly === 'true',
      sort_by: sortBy,
      page: page ? Number(page) : undefined,
      limit: limit ? Number(limit) : undefined,
    });
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
  gr(
    @CurrentUser() user: RequestUser,
    @Query('date_from') dateFrom?: string,
    @Query('date_to') dateTo?: string,
    @Query('shop_id') shopId?: string,
    @Query('gr_number') grNumber?: string,
    @Query('status') status?: string,
    @Query('product_id') productId?: string,
    @Query('category') category?: string,
  ) {
    return this.reports.grRegister(user, {
      date_from: dateFrom,
      date_to: dateTo,
      shop_id: shopId,
      gr_number: grNumber,
      status,
      product_id: productId,
      category,
    });
  }

  @RequirePermission('report:view')
  @Get('gi-register')
  gi(
    @CurrentUser() user: RequestUser,
    @Query('date_from') dateFrom?: string,
    @Query('date_to') dateTo?: string,
    @Query('shop_id') shopId?: string,
  ) {
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
  shopSummary(
    @CurrentUser() user: RequestUser,
    @Query('shop_id') shopId?: string,
    @Query('date_from') dateFrom?: string,
    @Query('date_to') dateTo?: string,
  ) {
    return this.reports.shopSummary(user, { shop_id: shopId, date_from: dateFrom, date_to: dateTo });
  }

  @RequirePermission('report:view')
  @Get('executive-summary')
  executiveSummary(
    @CurrentUser() user: RequestUser,
    @Query('shop_id') shopId?: string,
    @Query('date_from') dateFrom?: string,
    @Query('date_to') dateTo?: string,
  ) {
    return this.reports.executiveSummary(user, {
      shop_id: shopId,
      date_from: dateFrom,
      date_to: dateTo,
    });
  }

  @RequirePermission('report:view')
  @Get('inventory-aging')
  inventoryAging(
    @CurrentUser() user: RequestUser,
    @Query('shop_id') shopId?: string,
    @Query('bucket') bucket?: string,
  ) {
    return this.reports.inventoryAging(user, { shop_id: shopId, bucket });
  }

  @RequirePermission('report:view')
  @Get('rfq-summary')
  rfqSummary(
    @CurrentUser() user: RequestUser,
    @Query('shop_id') shopId?: string,
    @Query('date_from') dateFrom?: string,
    @Query('date_to') dateTo?: string,
  ) {
    return this.reports.rfqSummary(user, { shop_id: shopId, date_from: dateFrom, date_to: dateTo });
  }

  @RequirePermission('report:view')
  @Get('saved-filters')
  savedFilters(@CurrentUser() user: RequestUser, @Query('report_type') reportType?: string) {
    return this.reports.listSavedFilters(user, reportType);
  }

  @RequirePermission('report:view')
  @Post('saved-filters')
  createSavedFilter(@CurrentUser() user: RequestUser, @Body() body: CreateSavedFilterDto) {
    return this.reports.createSavedFilter(user, {
      reportType: body.reportType,
      name: body.name,
      filterJson: body.filterJson as Prisma.InputJsonValue,
    });
  }

  @RequirePermission('report:view')
  @Delete('saved-filters/:id')
  deleteSavedFilter(@CurrentUser() user: RequestUser, @Param('id') id: string) {
    return this.reports.deleteSavedFilter(user, id);
  }

  @RequirePermission('report:export')
  @Post('export')
  async export(@CurrentUser() user: RequestUser, @Body() body: ExportReportDto) {
    // Stable jobId so a duplicate click within the dedup window does not
    // generate two reports. We hash filters so different inputs do not collide.
    const filtersHash = createHash('sha1')
      .update(JSON.stringify(body.filters ?? {}))
      .digest('hex')
      .slice(0, 12);
    const shopId = user.shopId ?? 'global';
    const jobId = `exp:${shopId}:${body.reportType}:${filtersHash}`;
    const job = await this.exportsQueue.add(
      'report-xlsx',
      { type: 'report-xlsx', reportType: body.reportType, filters: body.filters },
      { jobId },
    );
    return { jobId: job.id };
  }
}
