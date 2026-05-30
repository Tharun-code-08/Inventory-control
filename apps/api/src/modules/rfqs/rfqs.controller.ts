import { Body, Controller, Delete, Get, Headers, Param, Patch, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { RequirePermission } from '../../common/decorators/require-permission.decorator';
import type { RequestUser } from '../../common/types/request-user';
import { CreateRfqDto } from './dto/create-rfq.dto';
import { UpdateRfqDto } from './dto/update-rfq.dto';
import { RfqsService } from './rfqs.service';

@ApiTags('rfqs')
@ApiBearerAuth()
@Controller('rfqs')
export class RfqsController {
  constructor(private readonly rfqs: RfqsService) {}

  @RequirePermission('rfq:read')
  @Get()
  list(@CurrentUser() user: RequestUser) {
    return this.rfqs.list(user);
  }

  @RequirePermission('rfq:write')
  @Post()
  create(@CurrentUser() user: RequestUser, @Body() dto: CreateRfqDto) {
    return this.rfqs.create(user, dto);
  }

  @RequirePermission('rfq:read')
  @Get(':id')
  get(@CurrentUser() user: RequestUser, @Param('id') id: string) {
    return this.rfqs.get(user, id);
  }

  @RequirePermission('rfq:read')
  @Get(':id/fulfillment')
  fulfillment(@CurrentUser() user: RequestUser, @Param('id') id: string) {
    return this.rfqs.fulfillment(user, id);
  }

  @RequirePermission('rfq:read')
  @Get(':id/deletion-impact')
  deletionImpact(@CurrentUser() user: RequestUser, @Param('id') id: string) {
    return this.rfqs.deletionImpact(user, id);
  }

  @RequirePermission('rfq:write')
  @Patch(':id')
  update(
    @CurrentUser() user: RequestUser,
    @Param('id') id: string,
    @Body() dto: UpdateRfqDto,
    @Headers('if-unmodified-since') ifUnmodifiedSince?: string,
  ) {
    return this.rfqs.update(user, id, {
      ...dto,
      ifUnmodifiedSince: dto.ifUnmodifiedSince ?? ifUnmodifiedSince,
    });
  }

  @RequirePermission('rfq:write')
  @Post(':id/send')
  send(@CurrentUser() user: RequestUser, @Param('id') id: string) {
    return this.rfqs.send(user, id);
  }

  @RequirePermission('rfq:write')
  @Post(':id/resend-invites')
  resendInvites(@CurrentUser() user: RequestUser, @Param('id') id: string) {
    return this.rfqs.resendInvites(user, id);
  }

  @RequirePermission('rfq:write')
  @Post(':id/close')
  close(@CurrentUser() user: RequestUser, @Param('id') id: string) {
    return this.rfqs.close(user, id);
  }

  @RequirePermission('rfq:write')
  @Delete(':id')
  remove(@CurrentUser() user: RequestUser, @Param('id') id: string) {
    return this.rfqs.remove(user, id);
  }
}

