import {
  Body,
  Controller,
  Get,
  Headers,
  HttpCode,
  Ip,
  Post,
  Query,
} from '@nestjs/common';
import { AuditAction, AuditSeverity } from '@prisma/client';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { RequirePermission } from '../../common/decorators/require-permission.decorator';
import type { RequestUser } from '../../common/types/request-user';
import { AuditService } from '../audit/audit.service';
import { DashboardService } from './dashboard.service';
import { DashboardEventDto } from './dto/dashboard-event.dto';

const EVENT_ACTION: Record<DashboardEventDto['type'], AuditAction> = {
  opened: AuditAction.VIEW_DASHBOARD,
  card: AuditAction.DASHBOARD_CARD_CLICKED,
  action: AuditAction.DASHBOARD_ACTION_TAKEN,
  exit: AuditAction.DASHBOARD_EXIT,
  attention_resolved: AuditAction.ATTENTION_ITEM_RESOLVED,
};

@ApiTags('dashboard')
@ApiBearerAuth()
@Controller('dashboard')
export class DashboardController {
  constructor(
    private readonly dashboard: DashboardService,
    private readonly audit: AuditService,
  ) {}

  @RequirePermission('report:view')
  @Get('summary')
  summary(@CurrentUser() user: RequestUser, @Query('shop_id') shopId?: string) {
    return this.dashboard.summary(user, shopId);
  }

  // Month 1: Executive Dashboard - 4 cards, 30 seconds
  @RequirePermission('report:view')
  @Get('executive')
  async executive(@CurrentUser() user: RequestUser, @Query('shop_id') shopId?: string) {
    return this.dashboard.executive(user, shopId);
  }

  /**
   * Month 1 telemetry sink. Persists the three behavioural events the Week 4
   * Reality Report depends on (open / first-click / action) into the audit log.
   * Severity LOW keeps them out of the security-audit signal. Fire-and-forget
   * from the client; failures here must never break a dashboard open.
   */
  @RequirePermission('report:view')
  @Post('events')
  @HttpCode(204)
  async recordEvent(
    @CurrentUser() user: RequestUser,
    @Body() event: DashboardEventDto,
    @Ip() ip: string,
    @Headers('user-agent') userAgent?: string,
  ): Promise<void> {
    await this.audit.logTenant(user, {
      action: EVENT_ACTION[event.type],
      entityType: 'Dashboard',
      severity: AuditSeverity.LOW,
      ipAddress: ip ?? null,
      userAgent: userAgent ?? null,
      metadata: {
        // Event-specific metadata
        card: event.card ?? null,
        firstClick: event.firstClick ?? false,
        action: event.action ?? null,
        loadTimeMs: event.loadTimeMs ?? null,
        sessionId: event.sessionId ?? null,
        // DASHBOARD_EXIT metadata
        durationMs: event.durationMs ?? null,
        cardsViewed: event.cardsViewed ?? null,
        actionsTaken: event.actionsTaken ?? null,
        firstCard: event.firstCard ?? null,
        openedAt: event.openedAt ?? null,
        closedAt: event.closedAt ?? null,
        // ATTENTION_ITEM_RESOLVED metadata
        itemId: event.itemId ?? null,
        itemType: event.itemType ?? null,
        resolution: event.resolution ?? null,
      },
    });
  }
}
