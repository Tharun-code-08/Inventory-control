import { Body, Controller, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { RequirePermission } from '../../common/decorators/require-permission.decorator';
import type { RequestUser } from '../../common/types/request-user';
import { CreateQuotationDto } from './dto/create-quotation.dto';
import { UpdateQuotationDto } from './dto/update-quotation.dto';
import { QuotationsService } from './quotations.service';

@ApiTags('quotations')
@ApiBearerAuth()
@Controller('quotations')
export class QuotationsController {
  constructor(private readonly quotations: QuotationsService) {}

  @RequirePermission('quote:read')
  @Get()
  list(@CurrentUser() user: RequestUser, @Query('rfq_id') rfqId?: string) {
    return this.quotations.list(user, rfqId);
  }

  @RequirePermission('quote:write')
  @Post()
  create(@CurrentUser() user: RequestUser, @Body() dto: CreateQuotationDto) {
    return this.quotations.create(user, dto);
  }

  @RequirePermission('quote:read')
  @Get(':id')
  get(@CurrentUser() user: RequestUser, @Param('id') id: string) {
    return this.quotations.get(user, id);
  }

  @RequirePermission('quote:write')
  @Patch(':id')
  update(@CurrentUser() user: RequestUser, @Param('id') id: string, @Body() dto: UpdateQuotationDto) {
    return this.quotations.update(user, id, dto);
  }

  @RequirePermission('quote:write')
  @Post(':id/submit')
  submit(@CurrentUser() user: RequestUser, @Param('id') id: string) {
    return this.quotations.submit(user, id);
  }

  @RequirePermission('quote:write')
  @Post(':id/accept-auto-link')
  acceptAndAutoLink(@CurrentUser() user: RequestUser, @Param('id') id: string) {
    return this.quotations.acceptAndAutoLink(user, id);
  }
}

