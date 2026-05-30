import { Body, Controller, Get, Param, ParseUUIDPipe, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { RequirePermission } from '../../common/decorators/require-permission.decorator';
import type { RequestUser } from '../../common/types/request-user';
import { CreateSupplierBillDto } from './dto/create-supplier-bill.dto';
import { ListSupplierBillsDto } from './dto/list-supplier-bills.dto';
import { VoidSupplierBillDto } from './dto/void-supplier-bill.dto';
import { SupplierBillsService } from './supplier-bills.service';

@ApiTags('supplier-bills')
@ApiBearerAuth()
@Controller('supplier-bills')
export class SupplierBillsController {
  constructor(private readonly supplierBills: SupplierBillsService) {}

  @RequirePermission('shop:read')
  @Get()
  @ApiOperation({ summary: 'List supplier bills (paginated, shop-scoped, filterable)' })
  list(@CurrentUser() user: RequestUser, @Query() query: ListSupplierBillsDto) {
    return this.supplierBills.list(user, query);
  }

  @RequirePermission('shop:write')
  @Post('from-gr/:grId')
  @ApiOperation({ summary: 'Create a supplier bill from a posted goods receipt' })
  @ApiResponse({ status: 409, description: 'Goods receipt has already been billed.' })
  createFromGoodsReceipt(
    @CurrentUser() user: RequestUser,
    @Param('grId', new ParseUUIDPipe()) grId: string,
    @Body() dto: CreateSupplierBillDto,
  ) {
    return this.supplierBills.createFromGoodsReceipt(user, grId, dto);
  }

  @RequirePermission('shop:read')
  @Get(':id')
  @ApiOperation({ summary: 'Get a supplier bill by id' })
  get(@CurrentUser() user: RequestUser, @Param('id', new ParseUUIDPipe()) id: string) {
    return this.supplierBills.get(user, id);
  }

  @RequirePermission('shop:write')
  @Post(':id/void')
  @ApiOperation({ summary: 'Void an unpaid issued supplier bill' })
  @ApiResponse({ status: 400, description: 'Bill has payments or is not in ISSUED status.' })
  voidBill(
    @CurrentUser() user: RequestUser,
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() dto: VoidSupplierBillDto,
  ) {
    return this.supplierBills.voidBill(user, id, dto);
  }

  @RequirePermission('shop:write')
  @Post(':id/send')
  @ApiOperation({ summary: 'Email supplier bill to supplier (with PDF attachment)' })
  send(
    @CurrentUser() user: RequestUser,
    @Param('id', new ParseUUIDPipe()) id: string,
    @Query('resend') resend?: string,
  ) {
    return this.supplierBills.sendToSupplier(user, id, { resend: resend === 'true' });
  }
}
