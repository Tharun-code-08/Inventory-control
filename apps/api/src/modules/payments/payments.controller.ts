import { Body, Controller, Get, Headers, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiHeader, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { RequirePermission } from '../../common/decorators/require-permission.decorator';
import type { RequestUser } from '../../common/types/request-user';
import { CreatePaymentDto } from './dto/create-payment.dto';
import { ListPaymentsDto } from './dto/list-payments.dto';
import { PaymentsService } from './payments.service';

@ApiTags('payments')
@ApiBearerAuth()
@Controller('payments')
export class PaymentsController {
  constructor(private readonly payments: PaymentsService) {}

  @RequirePermission('shop:read')
  @Get()
  @ApiOperation({ summary: 'List payment receipts (paginated, shop-scoped)' })
  list(@CurrentUser() user: RequestUser, @Query() query: ListPaymentsDto) {
    return this.payments.list(user, query);
  }

  @RequirePermission('shop:write')
  @Post()
  @ApiOperation({ summary: 'Record a payment against an invoice (idempotent)' })
  @ApiHeader({
    name: 'x-idempotency-key',
    required: false,
    description:
      'Client-supplied idempotency key. Repeat requests with the same key return the original payment.',
  })
  @ApiResponse({ status: 201, description: 'The created (or replayed) payment receipt.' })
  @ApiResponse({ status: 409, description: 'Concurrent payment modified the invoice; please retry.' })
  @ApiResponse({ status: 400, description: 'Amount exceeds open balance or invoice is voided.' })
  create(
    @CurrentUser() user: RequestUser,
    @Body() dto: CreatePaymentDto,
    @Headers('x-idempotency-key') idempotencyKey?: string,
  ) {
    return this.payments.create(user, {
      ...dto,
      idempotencyKey: dto.idempotencyKey ?? idempotencyKey,
    });
  }
}
