import { Controller, Get, Post, UseGuards } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { SubscriptionInvoiceService } from '../subscription-lifecycle/subscription-invoice.service';
import { PlatformAdminGuard } from './platform-admin.guard';
import { PlatformSubscriptionsService } from './platform-subscriptions.service';

@ApiTags('platform')
@Controller('platform/subscriptions')
@UseGuards(PlatformAdminGuard)
export class PlatformSubscriptionsController {
  constructor(
    private readonly platform: PlatformSubscriptionsService,
    private readonly invoices: SubscriptionInvoiceService,
  ) {}

  @Get('dashboard')
  @ApiOperation({ summary: 'Platform super-admin subscription conversion dashboard' })
  async dashboard() {
    return this.platform.getDashboard();
  }

  @Post('backfill-invoices')
  @ApiOperation({ summary: 'Backfill SaaS subscription invoices for all paid companies' })
  async backfillInvoices() {
    return this.invoices.backfillAllPaidCompanies();
  }
}
