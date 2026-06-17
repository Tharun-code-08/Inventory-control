import {
  Controller,
  Get,
  Post,
  Patch,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags, ApiQuery } from '@nestjs/swagger';
import { JwtAuthGuard } from '@/common/guards/jwt-auth.guard';
import { CurrentUser } from '@/common/decorators/current-user.decorator';
import { NotificationService, NotificationPreferenceService } from './services';
import {
  CreateNotificationDto,
  NotificationResponseDto,
  NotificationListResponseDto,
  NotificationFilterDto,
  UpdateNotificationPreferenceDto,
  NotificationPreferenceResponseDto,
} from './dto';

@ApiTags('Notifications')
@Controller('notifications')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class NotificationController {
  private readonly logger = new Logger(NotificationController.name);

  constructor(
    private readonly notificationService: NotificationService,
    private readonly preferenceService: NotificationPreferenceService,
  ) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create and send a notification' })
  @ApiResponse({ status: 201, type: NotificationResponseDto })
  async createNotification(
    @Body() dto: CreateNotificationDto,
    @CurrentUser() user: any,
  ): Promise<NotificationResponseDto> {
    this.logger.debug(`Creating notification for user ${user.id}`);
    return this.notificationService.create(dto, user.id, user.companyId!);
  }

  @Get()
  @ApiOperation({ summary: 'Get notifications for current user' })
  @ApiResponse({ status: 200, type: NotificationListResponseDto })
  @ApiQuery({ name: 'page', required: false, type: Number, example: 1 })
  @ApiQuery({ name: 'limit', required: false, type: Number, example: 20 })
  @ApiQuery({ name: 'isRead', required: false, type: Boolean })
  @ApiQuery({ name: 'module', required: false, type: String })
  @ApiQuery({ name: 'priority', required: false, type: String })
  async getNotifications(
    @Query() filter: NotificationFilterDto,
    @CurrentUser() user: any,
  ): Promise<NotificationListResponseDto> {
    const { data, total, unreadCount } = await this.notificationService.getNotifications(
      user.id,
      user.companyId!,
      filter,
    );

    const page = filter.page || 1;
    const limit = filter.limit || 20;
    const hasMore = page * limit < total;

    return {
      data: data as NotificationResponseDto[],
      total,
      page,
      limit,
      unreadCount,
      hasMore,
    };
  }

  @Get('/unread/count')
  @ApiOperation({ summary: 'Get unread notification count' })
  @ApiResponse({ status: 200, schema: { properties: { count: { type: 'number' } } } })
  async getUnreadCount(
    @CurrentUser() user: any,
  ): Promise<{ count: number }> {
    const count = await this.notificationService.getUnreadCount(user.id, user.companyId!);
    return { count };
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a single notification' })
  @ApiResponse({ status: 200, type: NotificationResponseDto })
  async getNotification(
    @Param('id') notificationId: string,
    @CurrentUser() user: any,
  ): Promise<NotificationResponseDto> {
    return this.notificationService.getNotification(notificationId, user.id);
  }

  @Patch(':id/read')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Mark notification as read' })
  @ApiResponse({ status: 200, type: NotificationResponseDto })
  async markAsRead(
    @Param('id') notificationId: string,
    @CurrentUser() user: any,
  ): Promise<NotificationResponseDto> {
    return this.notificationService.markAsRead(notificationId, user.id);
  }

  @Patch('/read-all')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Mark all notifications as read' })
  @ApiResponse({ status: 200, schema: { properties: { updated: { type: 'number' } } } })
  async markAllAsRead(
    @CurrentUser() user: any,
  ): Promise<{ updated: number }> {
    const result = await this.notificationService.markAllAsRead(user.id, user.companyId!);
    return result;
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Delete a notification' })
  @ApiResponse({ status: 200, type: NotificationResponseDto })
  async deleteNotification(
    @Param('id') notificationId: string,
    @CurrentUser() user: any,
  ): Promise<NotificationResponseDto> {
    return this.notificationService.delete(notificationId, user.id, user.companyId!);
  }

  @Get('/reference/:referenceType/:referenceId')
  @ApiOperation({ summary: 'Get notifications for a specific reference' })
  @ApiResponse({ status: 200, type: [NotificationResponseDto] })
  async getNotificationsByReference(
    @Param('referenceType') referenceType: string,
    @Param('referenceId') referenceId: string,
    @CurrentUser() user: any,
  ): Promise<NotificationResponseDto[]> {
    return this.notificationService.getNotificationsByReference(referenceType, referenceId, user.companyId!);
  }

  // ========== PREFERENCES ENDPOINTS ==========

  @Get('preferences/my')
  @ApiOperation({ summary: 'Get current user notification preferences' })
  @ApiResponse({ status: 200, type: NotificationPreferenceResponseDto })
  async getMyPreferences(
    @CurrentUser() user: any,
  ): Promise<NotificationPreferenceResponseDto> {
    return this.preferenceService.getOrCreatePreferences(user.id, user.companyId!);
  }

  @Get('preferences/:userId')
  @ApiOperation({ summary: 'Get user notification preferences (admin)' })
  @ApiResponse({ status: 200, type: NotificationPreferenceResponseDto })
  async getUserPreferences(
    @Param('userId') userId: string,
  ): Promise<NotificationPreferenceResponseDto> {
    return this.preferenceService.getPreferences(userId);
  }

  @Put('preferences/my')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Update current user notification preferences' })
  @ApiResponse({ status: 200, type: NotificationPreferenceResponseDto })
  async updateMyPreferences(
    @Body() dto: UpdateNotificationPreferenceDto,
    @CurrentUser() user: any,
  ): Promise<NotificationPreferenceResponseDto> {
    return this.preferenceService.updatePreferences(user.id, user.companyId!, dto);
  }

  @Put('preferences/:userId')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Update user notification preferences (admin)' })
  @ApiResponse({ status: 200, type: NotificationPreferenceResponseDto })
  async updateUserPreferences(
    @Param('userId') userId: string,
    @Body() dto: UpdateNotificationPreferenceDto,
    @CurrentUser() user: any,
  ): Promise<NotificationPreferenceResponseDto> {
    return this.preferenceService.updatePreferences(user.id, user.companyId!, dto);
  }

  @Post('preferences/:userId/reset')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Reset user preferences to defaults' })
  @ApiResponse({ status: 200, type: NotificationPreferenceResponseDto })
  async resetPreferences(
    @Param('userId') userId: string,
    @CurrentUser() user: any,
  ): Promise<NotificationPreferenceResponseDto> {
    return this.preferenceService.resetToDefaults(user.id, user.companyId!);
  }

  @Post('preferences/:userId/toggle-all')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Toggle all preferences for a user' })
  @ApiResponse({ status: 200, type: NotificationPreferenceResponseDto })
  async toggleAllPreferences(
    @Param('userId') userId: string,
    @Body() body: { enable: boolean },
    @CurrentUser() user: any,
  ): Promise<NotificationPreferenceResponseDto> {
    return this.preferenceService.bulkToggle(user.id, user.companyId!, body.enable);
  }
}

