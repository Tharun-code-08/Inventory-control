import { Body, Controller, Get, Headers, Param, Patch, Post, Query, Res } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import type { Response } from 'express';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { RequireAnyPermission } from '../../common/decorators/require-any-permission.decorator';
import { RequirePermission } from '../../common/decorators/require-permission.decorator';
import type { RequestUser } from '../../common/types/request-user';
import { DocumentPdfService } from '../../common/pdf/document-pdf.service';
import { CreatePurchaseOrderDto } from './dto/create-purchase-order.dto';
import { UpdatePurchaseOrderDto } from './dto/update-purchase-order.dto';
import { ListPurchaseOrdersDto } from './dto/list-purchase-orders.dto';
import { PurchaseOrdersService } from './purchase-orders.service';
import { PoCancelService } from './po-cancel.service';
import { RequestPoCancelDto, ConfirmPoCancelDto } from './dto/cancel-purchase-order.dto';

@ApiTags('purchase-orders')
@ApiBearerAuth()
@Controller('purchase-orders')
export class PurchaseOrdersController {
  constructor(
    private readonly service: PurchaseOrdersService,
    private readonly poCancel: PoCancelService,
    private readonly documentPdf: DocumentPdfService,
  ) {}

  @RequirePermission('purchase_order:read')
  @Get()
  list(
    @CurrentUser() user: RequestUser,
    @Query() query: ListPurchaseOrdersDto,
  ) {
    return this.service.list(user, query);
  }

  @RequirePermission('purchase_order:create')
  @Post()
  create(
    @CurrentUser() user: RequestUser,
    @Body() dto: CreatePurchaseOrderDto,
    @Headers('x-idempotency-key') idempotencyKey?: string,
  ) {
    const payload = { ...dto, idempotencyKey: dto.idempotencyKey ?? idempotencyKey };
    return this.service.create(user, payload).then(async (po) => {
      if (dto.sendToSupplier) {
        await this.service.sendToSupplier(user, po.id);
      }
      return po;
    });
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
  confirm(@CurrentUser() user: RequestUser, @Param('id') id: string, @Headers('x-idempotency-key') idempotencyKey?: string) {
    return this.service.confirm(user, id, idempotencyKey);
  }

  @RequirePermission('purchase_order:create')
  @Post(':id/cancel/request')
  requestCancel(@CurrentUser() user: RequestUser, @Param('id') id: string, @Body() dto: RequestPoCancelDto) {
    return this.poCancel.requestCancel(user, id, dto.reason);
  }

  @RequirePermission('purchase_order:create')
  @Post(':id/cancel/confirm')
  confirmCancel(@CurrentUser() user: RequestUser, @Param('id') id: string, @Body() dto: ConfirmPoCancelDto) {
    return this.poCancel.confirmCancel(user, id, dto.reason, dto.otp);
  }

  @RequirePermission('purchase_order:create')
  @Post(':id/cancel')
  cancel(@CurrentUser() user: RequestUser, @Param('id') id: string, @Headers('x-idempotency-key') idempotencyKey?: string) {
    return this.service.cancel(user, id, idempotencyKey);
  }

  @RequireAnyPermission('purchase_order:create', 'purchase_order:approve')
  @Post(':id/send')
  send(
    @CurrentUser() user: RequestUser,
    @Param('id') id: string,
    @Query('resend') resend?: string,
  ) {
    return this.service.sendToSupplier(user, id, { resend: resend === 'true' });
  }

  @RequirePermission('purchase_order:read')
  @Get(':id/export-pdf')
  async exportPdf(
    @CurrentUser() user: RequestUser,
    @Param('id') id: string,
    @Res() res: Response,
  ) {
    const result = await this.documentPdf.renderPurchaseOrderPdf(user, id);
    res.set({
      'Content-Type': result.contentType,
      'Content-Disposition': `attachment; filename="${result.filename}"`,
      'Content-Length': result.buffer.length,
    });
    res.send(result.buffer);
  }
}
