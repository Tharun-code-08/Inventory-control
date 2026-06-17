import { Body, Controller, Get, Param, Post, Put, Query, UseInterceptors } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { StripReadonlyBodyInterceptor } from '../../common/interceptors/strip-readonly-body.interceptor';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import type { RequestUser } from '../../common/types/request-user';
import { PreviewEmailTemplateDto, UpdateEmailNotificationsDto } from './dto/update-email-notifications.dto';
import { EmailNotificationsService } from './email-notifications.service';

@ApiTags('settings')
@ApiBearerAuth()
@UseInterceptors(new StripReadonlyBodyInterceptor())
@Controller('settings/email-notifications')
export class EmailNotificationsController {
  constructor(private readonly emailNotifications: EmailNotificationsService) {}

  @Get()
  list(@CurrentUser() user: RequestUser, @Query('shopId') shopId?: string) {
    return this.emailNotifications.getEffectiveConfig(user, shopId?.trim() || null);
  }

  @Put()
  updateCompanyDefaults(@CurrentUser() user: RequestUser, @Body() dto: UpdateEmailNotificationsDto) {
    return this.emailNotifications.saveCompanyDefaults(user, dto);
  }

  @Put('shops/:shopId')
  updateShopOverrides(
    @CurrentUser() user: RequestUser,
    @Param('shopId') shopId: string,
    @Body() dto: UpdateEmailNotificationsDto,
  ) {
    return this.emailNotifications.saveShopOverrides(user, shopId, dto);
  }

  @Post('preview')
  preview(@CurrentUser() user: RequestUser, @Body() dto: PreviewEmailTemplateDto) {
    return this.emailNotifications.previewTemplate(user, dto);
  }
}
