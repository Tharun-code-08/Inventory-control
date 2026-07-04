import { Body, Controller, Get, Headers, Param, ParseUUIDPipe, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { RequirePermission } from '../../common/decorators/require-permission.decorator';
import type { RequestUser } from '../../common/types/request-user';
import { CreateInvoiceDto } from './dto/create-invoice.dto';
import { ListInvoicesDto } from './dto/list-invoices.dto';
import { InvoicesService } from './invoices.service';

@ApiTags('invoices')
@ApiBearerAuth()
@Controller('invoices')
export class InvoicesController {
  constructor(private readonly invoices: InvoicesService) {}

  @RequirePermission('shop:read')
  @Get()
  @ApiOperation({ summary: 'List invoices (paginated, shop-scoped, filterable)' })
  list(@CurrentUser() user: RequestUser, @Query() query: ListInvoicesDto) {
    return this.invoices.list(user, query);
  }

  @RequirePermission('shop:write')
  @Post()
  @ApiOperation({ summary: 'Create an invoice (optionally linked to a sales order)' })
  @ApiResponse({ status: 409, description: 'Sales order has already been invoiced.' })
  create(
    @CurrentUser() user: RequestUser,
    @Body() dto: CreateInvoiceDto,
    @Headers('x-idempotency-key') idempotencyKey?: string,
  ) {
    return this.invoices.create(user, {
      ...dto,
      idempotencyKey: dto.idempotencyKey ?? idempotencyKey,
    });
  }

  @RequirePermission('shop:write')
  @Post(':id/send')
  @ApiOperation({ summary: 'Email invoice to customer (with PDF attachment)' })
  send(
    @CurrentUser() user: RequestUser,
    @Param('id', new ParseUUIDPipe()) id: string,
    @Query('resend') resend?: string,
  ) {
    return this.invoices.sendToCustomer(user, id, { resend: resend === 'true' });
  }

  @RequirePermission('shop:read')
  @Get(':id')
  @ApiOperation({ summary: 'Get an invoice by id' })
  get(@CurrentUser() user: RequestUser, @Param('id', new ParseUUIDPipe()) id: string) {
    return this.invoices.get(user, id);
  }
}
