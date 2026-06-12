import { Body, Controller, Get, Param, Put } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { RequirePermission } from '../../common/decorators/require-permission.decorator';
import type { RequestUser } from '../../common/types/request-user';
import { CompanySettingsService } from './company-settings.service';
import { UpsertSettingDto } from './dto/upsert-setting.dto';

@ApiTags('company-settings')
@ApiBearerAuth()
@Controller('company-settings')
export class CompanySettingsController {
  constructor(private readonly service: CompanySettingsService) {}

  @RequirePermission('company:read')
  @Get()
  list(@CurrentUser() user: RequestUser) {
    return this.service.list(user);
  }

  @RequirePermission('company:read')
  @Get(':key')
  get(@CurrentUser() user: RequestUser, @Param('key') key: string) {
    return this.service.get(user, key);
  }

  @RequirePermission('company:write')
  @Put(':key')
  upsert(
    @CurrentUser() user: RequestUser,
    @Param('key') key: string,
    @Body() dto: UpsertSettingDto,
  ) {
    return this.service.upsert(user, key, dto.value);
  }
}
