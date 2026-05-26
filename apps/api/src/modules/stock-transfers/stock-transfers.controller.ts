import { Body, Controller, Get, Param, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { RequirePermission } from '../../common/decorators/require-permission.decorator';
import type { RequestUser } from '../../common/types/request-user';
import { CreateStockTransferDto } from './dto/create-stock-transfer.dto';
import { ListStockTransfersDto } from './dto/list-stock-transfers.dto';
import { StockTransfersService } from './stock-transfers.service';

@ApiTags('stock-transfers')
@ApiBearerAuth()
@Controller('stock-transfers')
export class StockTransfersController {
  constructor(private readonly service: StockTransfersService) {}

  @RequirePermission('stock_transfer:read')
  @Get()
  list(@CurrentUser() user: RequestUser, @Query() query: ListStockTransfersDto) {
    return this.service.list(user, query);
  }

  @RequirePermission('stock_transfer:create')
  @Post()
  create(@CurrentUser() user: RequestUser, @Body() dto: CreateStockTransferDto) {
    return this.service.create(user, dto);
  }

  @RequirePermission('stock_transfer:read')
  @Get(':id')
  get(@CurrentUser() user: RequestUser, @Param('id') id: string) {
    return this.service.get(user, id);
  }

  @RequirePermission('stock_transfer:create')
  @Post(':id/post')
  post(@CurrentUser() user: RequestUser, @Param('id') id: string) {
    return this.service.post(user, id);
  }
}
