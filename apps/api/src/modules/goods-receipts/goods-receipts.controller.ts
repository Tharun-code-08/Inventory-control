import { Body, Controller, Delete, Get, Header, Headers, Param, Patch, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { DocumentStatus } from '@prisma/client';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { SkipEnvelope } from '../../common/decorators/skip-envelope.decorator';
import { RequirePermission } from '../../common/decorators/require-permission.decorator';
import type { RequestUser } from '../../common/types/request-user';
import { CreateGoodsReceiptDto } from './dto/create-goods-receipt.dto';
import { UpdateGoodsReceiptDto } from './dto/update-goods-receipt.dto';
import { GoodsReceiptsService } from './goods-receipts.service';

@ApiTags('goods-receipts')
@ApiBearerAuth()
@Controller('goods-receipts')
export class GoodsReceiptsController {
  constructor(private readonly service: GoodsReceiptsService) {}

  @RequirePermission('goods_receipt:read')
  @Get()
  list(
    @CurrentUser() user: RequestUser,
    @Query('shop_id') shopId?: string,
    @Query('date_from') dateFrom?: string,
    @Query('date_to') dateTo?: string,
    @Query('status') status?: DocumentStatus,
    @Query('cursor') cursor?: string,
    @Query('take') take?: string,
  ) {
    return this.service.list(user, {
      shop_id: shopId,
      date_from: dateFrom,
      date_to: dateTo,
      status,
      cursor,
      take: take ? Number(take) : undefined,
    });
  }

  @RequirePermission('goods_receipt:create')
  @Post()
  create(
    @CurrentUser() user: RequestUser,
    @Body() dto: CreateGoodsReceiptDto,
    @Headers('x-idempotency-key') idempotencyKey?: string,
  ) {
    return this.service.create(user, {
      ...dto,
      idempotencyKey: dto.idempotencyKey ?? idempotencyKey,
    });
  }

  @SkipEnvelope()
  @RequirePermission('goods_receipt:read')
  @Get(':id/print')
  @Header('Content-Type', 'text/html; charset=utf-8')
  print(@CurrentUser() user: RequestUser, @Param('id') id: string) {
    return this.service.print(user, id);
  }

  @RequirePermission('goods_receipt:read')
  @Get(':id')
  get(@CurrentUser() user: RequestUser, @Param('id') id: string) {
    return this.service.get(user, id);
  }

  @RequirePermission('goods_receipt:create')
  @Patch(':id')
  update(@CurrentUser() user: RequestUser, @Param('id') id: string, @Body() dto: UpdateGoodsReceiptDto) {
    return this.service.update(user, id, dto);
  }

  @RequirePermission('goods_receipt:create')
  @Post(':id/post')
  post(@CurrentUser() user: RequestUser, @Param('id') id: string) {
    return this.service.post(user, id);
  }

  @RequirePermission('goods_receipt:create')
  @Post(':id/send')
  send(
    @CurrentUser() user: RequestUser,
    @Param('id') id: string,
    @Query('resend') resend?: string,
  ) {
    return this.service.sendToSupplier(user, id, { resend: resend === 'true' });
  }

  @RequirePermission('goods_receipt:create')
  @Delete(':id')
  remove(@CurrentUser() user: RequestUser, @Param('id') id: string) {
    return this.service.remove(user, id);
  }
}
