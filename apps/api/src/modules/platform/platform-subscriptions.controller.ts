import { Controller, Get, Post, UseGuards } from '@nestjs/common';
import { AuditAction } from '@prisma/client';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import type { RequestUser } from '../../common/types/request-user';
import { SubscriptionInvoiceService } from '../subscription-lifecycle/subscription-invoice.service';
import { PlatformAdminGuard } from './platform-admin.guard';
import { PlatformAuditService } from './platform-audit.service';
import { PlatformSubscriptionsService } from './platform-subscriptions.service';

@ApiTags('platform')
@Controller('platform/subscriptions')
@UseGuards(PlatformAdminGuard)
export class PlatformSubscriptionsController {
  constructor(
    private readonly platform: PlatformSubscriptionsService,
    private readonly invoices: SubscriptionInvoiceService,
    private readonly platformAudit: PlatformAuditService,
  ) {}

  @Get('dashboard')
  @ApiOperation({ summary: 'Platform super-admin subscription conversion dashboard' })
  async dashboard(@CurrentUser() user: RequestUser) {
    await this.platformAudit.logPlatformAction({
      userId: user.id,
      adminEmail: user.email,
      action: 'platform_dashboard_view',
    });
    return this.platform.getDashboard();
  }

  @Post('backfill-invoices')
  @ApiOperation({ summary: 'Backfill SaaS subscription invoices for all paid companies' })
  async backfillInvoices(@CurrentUser() user: RequestUser) {
    const result = await this.invoices.backfillAllPaidCompanies();
    await this.platformAudit.logPlatformAction({
      userId: user.id,
      adminEmail: user.email,
      action: 'platform_subscription_backfill',
      entityType: 'PlatformSubscription',
      entityId: user.id,
      auditAction: AuditAction.POST,
      extra: { result },
    });
    return result;
  }
}
