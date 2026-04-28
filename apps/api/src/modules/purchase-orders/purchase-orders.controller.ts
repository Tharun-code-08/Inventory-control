import { Body, Controller, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { RequirePermission } from '../../common/decorators/require-permission.decorator';
import type { RequestUser } from '../../common/types/request-user';
import { CreatePurchaseOrderDto } from './dto/create-purchase-order.dto';
import { UpdatePurchaseOrderDto } from './dto/update-purchase-order.dto';
import { PurchaseOrdersService } from './purchase-orders.service';

@ApiTags('purchase-orders')
@ApiBearerAuth()
@Controller('purchase-orders')
export class PurchaseOrdersController {
  constructor(
    private readonly service: PurchaseOrdersService,
    @InjectQueue('exports') private readonly exportsQueue: Queue,
  ) {}

  @RequirePermission('purchase_order:read')
  @Get()
  list(
    @CurrentUser() user: RequestUser,
    @Query('shop_id') shopId?: string,
    @Query('cursor') cursor?: string,
    @Query('take') take?: string,
  ) {
    return this.service.list(user, { shop_id: shopId, cursor, take: take ? Number(take) : undefined });
  }

  @RequirePermission('purchase_order:create')
  @Post()
  create(@CurrentUser() user: RequestUser, @Body() dto: CreatePurchaseOrderDto) {
    return this.service.create(user, dto);
  }

  @RequirePermission('purchase_order:read')
  @Get(':id')
  get(@CurrentUser() user: RequestUser, @Param('id') id: string) {
    return this.service.get(user, id);
  }

  @RequirePermission('purchase_order:create')
  @Patch(':id')
  update(@CurrentUser() user: RequestUser, @Param('id') id: string, @Body() dto: UpdatePurchaseOrderDto) {
    return this.service.update(user, id, dto);
  }

  @RequirePermission('purchase_order:create')
  @Post(':id/confirm')
  confirm(@CurrentUser() user: RequestUser, @Param('id') id: string) {
    return this.service.confirm(user, id);
  }

  @RequirePermission('purchase_order:create')
  @Post(':id/cancel')
  cancel(@CurrentUser() user: RequestUser, @Param('id') id: string) {
    return this.service.cancel(user, id);
  }

  @RequirePermission('report:export')
  @Get(':id/export-pdf')
  async exportPdf(@CurrentUser() user: RequestUser, @Param('id') id: string) {
    await this.service.get(user, id);
    const job = await this.exportsQueue.add('po-pdf', { type: 'po-pdf', purchaseOrderId: id }, { removeOnComplete: true });
    return { jobId: job.id };
  }
}
