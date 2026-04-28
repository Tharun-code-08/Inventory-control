import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { RequirePermission } from '../../common/decorators/require-permission.decorator';
import type { RequestUser } from '../../common/types/request-user';
import { CreateSalesOrderDto } from './dto/create-sales-order.dto';
import { SalesOrdersService } from './sales-orders.service';

@ApiTags('sales-orders')
@ApiBearerAuth()
@Controller('sales-orders')
export class SalesOrdersController {
  constructor(private readonly salesOrders: SalesOrdersService) {}

  @RequirePermission('shop:read')
  @Get()
  list(@CurrentUser() user: RequestUser) {
    return this.salesOrders.list(user);
  }

  @RequirePermission('shop:write')
  @Post()
  create(@CurrentUser() user: RequestUser, @Body() dto: CreateSalesOrderDto) {
    return this.salesOrders.create(user, dto);
  }

  @RequirePermission('shop:read')
  @Get(':id')
  get(@CurrentUser() user: RequestUser, @Param('id') id: string) {
    return this.salesOrders.get(user, id);
  }

  @RequirePermission('shop:write')
  @Post(':id/confirm')
  confirm(@CurrentUser() user: RequestUser, @Param('id') id: string) {
    return this.salesOrders.confirm(user, id);
  }

  @RequirePermission('shop:write')
  @Post(':id/fulfill')
  fulfill(@CurrentUser() user: RequestUser, @Param('id') id: string) {
    return this.salesOrders.fulfill(user, id);
  }
}

