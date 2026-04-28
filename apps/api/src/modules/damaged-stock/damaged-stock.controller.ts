import { Body, Controller, Get, Header, Param, Patch, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { SkipEnvelope } from '../../common/decorators/skip-envelope.decorator';
import { RequirePermission } from '../../common/decorators/require-permission.decorator';
import type { RequestUser } from '../../common/types/request-user';
import { CreateDamagedStockDto } from './dto/create-damaged-stock.dto';
import { UpdateDamagedStockDto } from './dto/update-damaged-stock.dto';
import { DamagedStockService } from './damaged-stock.service';

@ApiTags('damaged-stock')
@ApiBearerAuth()
@Controller('damaged-stock')
export class DamagedStockController {
  constructor(private readonly service: DamagedStockService) {}

  @RequirePermission('damage:read')
  @Get()
  list(
    @CurrentUser() user: RequestUser,
    @Query('shop_id') shopId?: string,
    @Query('cursor') cursor?: string,
    @Query('take') take?: string,
  ) {
    return this.service.list(user, { shop_id: shopId, cursor, take: take ? Number(take) : undefined });
  }

  @RequirePermission('damage:create')
  @Post()
  create(@CurrentUser() user: RequestUser, @Body() dto: CreateDamagedStockDto) {
    return this.service.create(user, dto);
  }

  @SkipEnvelope()
  @RequirePermission('damage:read')
  @Get(':id/print')
  @Header('Content-Type', 'text/html; charset=utf-8')
  print(@CurrentUser() user: RequestUser, @Param('id') id: string) {
    return this.service.print(user, id);
  }

  @RequirePermission('damage:read')
  @Get(':id')
  get(@CurrentUser() user: RequestUser, @Param('id') id: string) {
    return this.service.get(user, id);
  }

  @RequirePermission('damage:create')
  @Patch(':id')
  update(@CurrentUser() user: RequestUser, @Param('id') id: string, @Body() dto: UpdateDamagedStockDto) {
    return this.service.update(user, id, dto);
  }

  @RequirePermission('damage:create')
  @Post(':id/post')
  post(@CurrentUser() user: RequestUser, @Param('id') id: string) {
    return this.service.post(user, id);
  }
}
