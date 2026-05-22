import { Body, Controller, Get, Param, ParseUUIDPipe, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { RequirePermission } from '../../common/decorators/require-permission.decorator';
import type { RequestUser } from '../../common/types/request-user';
import { CreateSalesQuotationDto } from './dto/create-sales-quotation.dto';
import { SalesQuotationsService } from './sales-quotations.service';

@ApiTags('sales-quotations')
@ApiBearerAuth()
@Controller('sales-quotations')
export class SalesQuotationsController {
  constructor(private readonly salesQuotations: SalesQuotationsService) {}

  @RequirePermission('shop:read')
  @Get()
  list(
    @CurrentUser() user: RequestUser,
    @Query('customer_id') customerId?: string,
  ) {
    return this.salesQuotations.list(user, customerId);
  }

  @RequirePermission('shop:read')
  @Get(':id')
  get(@CurrentUser() user: RequestUser, @Param('id', new ParseUUIDPipe()) id: string) {
    return this.salesQuotations.get(user, id);
  }

  @RequirePermission('shop:write')
  @Post()
  create(@CurrentUser() user: RequestUser, @Body() dto: CreateSalesQuotationDto) {
    return this.salesQuotations.create(user, dto);
  }

  @RequirePermission('shop:write')
  @Post(':id/send')
  send(@CurrentUser() user: RequestUser, @Param('id', new ParseUUIDPipe()) id: string) {
    return this.salesQuotations.send(user, id);
  }

  @RequirePermission('shop:write')
  @Post(':id/accept')
  accept(@CurrentUser() user: RequestUser, @Param('id', new ParseUUIDPipe()) id: string) {
    return this.salesQuotations.accept(user, id);
  }

  @RequirePermission('shop:write')
  @Post(':id/convert-to-sales-order')
  @ApiOperation({ summary: 'Convert quotation to a draft sales order' })
  convertToSalesOrder(
    @CurrentUser() user: RequestUser,
    @Param('id', new ParseUUIDPipe()) id: string,
  ) {
    return this.salesQuotations.convertToSalesOrder(user, id);
  }
}
