import { Body, Controller, Get, Headers, Param, ParseUUIDPipe, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiHeader, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { RequirePermission } from '../../common/decorators/require-permission.decorator';
import type { RequestUser } from '../../common/types/request-user';
import { CreateSupplierPaymentDto } from './dto/create-supplier-payment.dto';
import { ListSupplierPaymentsDto } from './dto/list-supplier-payments.dto';
import { ReverseSupplierPaymentDto } from './dto/reverse-supplier-payment.dto';
import { SupplierPaymentsService } from './supplier-payments.service';

@ApiTags('supplier-payments')
@ApiBearerAuth()
@Controller('supplier-payments')
export class SupplierPaymentsController {
  constructor(private readonly supplierPayments: SupplierPaymentsService) {}

  @RequirePermission('shop:read')
  @Get()
  @ApiOperation({ summary: 'List supplier payments (paginated, shop-scoped)' })
  list(@CurrentUser() user: RequestUser, @Query() query: ListSupplierPaymentsDto) {
    return this.supplierPayments.list(user, query);
  }

  @RequirePermission('shop:write')
  @Post()
  @ApiOperation({ summary: 'Record a payment against a supplier bill (idempotent)' })
  @ApiHeader({
    name: 'x-idempotency-key',
    required: false,
    description:
      'Client-supplied idempotency key. Repeat requests with the same key return the original payment.',
  })
  @ApiResponse({ status: 201, description: 'The created (or replayed) supplier payment.' })
  @ApiResponse({
    status: 409,
    description: 'Concurrent payment modified the supplier bill; please retry.',
  })
  @ApiResponse({
    status: 400,
    description: 'Amount exceeds open balance or supplier bill is voided.',
  })
  create(
    @CurrentUser() user: RequestUser,
    @Body() dto: CreateSupplierPaymentDto,
    @Headers('x-idempotency-key') idempotencyKey?: string,
  ) {
    return this.supplierPayments.create(user, {
      ...dto,
      idempotencyKey: dto.idempotencyKey ?? idempotencyKey,
    });
  }

  @RequirePermission('shop:write')
  @Post(':id/reverse')
  @ApiOperation({ summary: 'Reverse a supplier payment and restore bill balance' })
  @ApiResponse({ status: 409, description: 'Concurrent bill update; retry reversal.' })
  reverse(
    @CurrentUser() user: RequestUser,
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() dto: ReverseSupplierPaymentDto,
  ) {
    return this.supplierPayments.reverse(user, id, dto);
  }

  @RequirePermission('shop:write')
  @Post(':id/send')
  @ApiOperation({ summary: 'Email supplier payment to supplier (with PDF attachment)' })
  send(
    @CurrentUser() user: RequestUser,
    @Param('id', new ParseUUIDPipe()) id: string,
    @Query('resend') resend?: string,
  ) {
    return this.supplierPayments.sendToSupplier(user, id, { resend: resend === 'true' });
  }
}
