import { Body, Controller, Get, Headers, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiHeader, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { RequirePermission } from '../../common/decorators/require-permission.decorator';
import type { RequestUser } from '../../common/types/request-user';
import { CreateSupplierPaymentDto } from './dto/create-supplier-payment.dto';
import { ListSupplierPaymentsDto } from './dto/list-supplier-payments.dto';
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
}
