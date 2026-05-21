import { Body, Controller, Get, Param, ParseUUIDPipe, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { RequirePermission } from '../../common/decorators/require-permission.decorator';
import type { RequestUser } from '../../common/types/request-user';
import { CreateSalesOrderDto } from './dto/create-sales-order.dto';
import { ListSalesOrdersDto } from './dto/list-sales-orders.dto';
import { SalesOrdersService } from './sales-orders.service';

@ApiTags('sales-orders')
@ApiBearerAuth()
@Controller('sales-orders')
export class SalesOrdersController {
  constructor(private readonly salesOrders: SalesOrdersService) {}

  @RequirePermission('shop:read')
  @Get()
  @ApiOperation({ summary: 'List sales orders (paginated, shop-scoped, filterable)' })
  @ApiResponse({ status: 200, description: 'Page of sales orders with cursor-pagination meta.' })
  list(@CurrentUser() user: RequestUser, @Query() query: ListSalesOrdersDto) {
    return this.salesOrders.list(user, query);
  }

  @RequirePermission('shop:write')
  @Post()
  @ApiOperation({ summary: 'Create a sales order (DRAFT)' })
  @ApiResponse({ status: 201, description: 'The created sales order with line items.' })
  create(@CurrentUser() user: RequestUser, @Body() dto: CreateSalesOrderDto) {
    return this.salesOrders.create(user, dto);
  }

  @RequirePermission('shop:read')
  @Get(':id')
  @ApiOperation({ summary: 'Get a sales order by id' })
  get(@CurrentUser() user: RequestUser, @Param('id', new ParseUUIDPipe()) id: string) {
    return this.salesOrders.get(user, id);
  }

  @RequirePermission('shop:write')
  @Post(':id/confirm')
  @ApiOperation({ summary: 'Confirm a DRAFT sales order' })
  @ApiResponse({ status: 200, description: 'Sales order with status=CONFIRMED.' })
  @ApiResponse({ status: 409, description: 'State transitioned concurrently.' })
  confirm(@CurrentUser() user: RequestUser, @Param('id', new ParseUUIDPipe()) id: string) {
    return this.salesOrders.confirm(user, id);
  }

  @RequirePermission('shop:write')
  @Post(':id/fulfill')
  @ApiOperation({ summary: 'Fulfill a CONFIRMED sales order (issues stock)' })
  @ApiResponse({ status: 200, description: 'Sales order with status=FULFILLED.' })
  @ApiResponse({ status: 409, description: 'Already fulfilled or modified concurrently.' })
  @ApiResponse({ status: 422, description: 'Insufficient stock for one or more lines.' })
  fulfill(@CurrentUser() user: RequestUser, @Param('id', new ParseUUIDPipe()) id: string) {
    return this.salesOrders.fulfill(user, id);
  }
}
