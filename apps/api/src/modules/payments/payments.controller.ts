import { Body, Controller, Get, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { RequirePermission } from '../../common/decorators/require-permission.decorator';
import type { RequestUser } from '../../common/types/request-user';
import { CreatePaymentDto } from './dto/create-payment.dto';
import { PaymentsService } from './payments.service';

@ApiTags('payments')
@ApiBearerAuth()
@Controller('payments')
export class PaymentsController {
  constructor(private readonly payments: PaymentsService) {}

  @RequirePermission('shop:read')
  @Get()
  list(@CurrentUser() user: RequestUser) {
    return this.payments.list(user);
  }

  @RequirePermission('shop:write')
  @Post()
  create(@CurrentUser() user: RequestUser, @Body() dto: CreatePaymentDto) {
    return this.payments.create(user, dto);
  }
}

