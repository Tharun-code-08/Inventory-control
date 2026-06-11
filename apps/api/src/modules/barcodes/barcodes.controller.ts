import { Body, Controller, Delete, Get, Param, ParseUUIDPipe, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { ScanAction, ScanSource } from '@prisma/client';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { RequirePermission } from '../../common/decorators/require-permission.decorator';
import type { RequestUser } from '../../common/types/request-user';
import { BarcodesService } from './barcodes.service';
import { CreateBarcodeDto } from './dto/create-barcode.dto';
import { LookupBarcodeDto } from './dto/lookup-barcode.dto';

@ApiTags('barcodes')
@ApiBearerAuth()
@Controller('barcodes')
export class BarcodesController {
  constructor(private readonly barcodes: BarcodesService) {}

  @RequirePermission('product:read')
  @Get('lookup')
  @ApiOperation({ summary: 'Resolve a scanned barcode to a product (logs the scan)' })
  lookup(@CurrentUser() user: RequestUser, @Query() query: LookupBarcodeDto) {
    return this.barcodes.lookup(
      user,
      query.code,
      query.action ?? ScanAction.LOOKUP,
      query.shopId,
      query.source ?? ScanSource.API,
    );
  }

  @RequirePermission('product:read')
  @Get('scan-logs')
  @ApiOperation({ summary: 'Recent scan history for the company (audit)' })
  scanLogs(@CurrentUser() user: RequestUser, @Query('take') take?: string) {
    return this.barcodes.scanLogs(user, take ? Number(take) : undefined);
  }

  @RequirePermission('product:read')
  @Get('products/:productId')
  @ApiOperation({ summary: 'List barcodes registered for a product' })
  list(@CurrentUser() user: RequestUser, @Param('productId', new ParseUUIDPipe()) productId: string) {
    return this.barcodes.listForProduct(user, productId);
  }

  @RequirePermission('product:write')
  @Post('products/:productId')
  @ApiOperation({ summary: 'Register a barcode for a product' })
  create(
    @CurrentUser() user: RequestUser,
    @Param('productId', new ParseUUIDPipe()) productId: string,
    @Body() dto: CreateBarcodeDto,
  ) {
    return this.barcodes.create(user, productId, dto);
  }

  @RequirePermission('product:write')
  @Post('products/:productId/generate')
  @ApiOperation({ summary: 'Register the product code as an internal barcode (idempotent)' })
  generate(@CurrentUser() user: RequestUser, @Param('productId', new ParseUUIDPipe()) productId: string) {
    return this.barcodes.generateInternal(user, productId);
  }

  @RequirePermission('product:write')
  @Delete(':id')
  @ApiOperation({ summary: 'Remove a barcode mapping' })
  remove(@CurrentUser() user: RequestUser, @Param('id', new ParseUUIDPipe()) id: string) {
    return this.barcodes.remove(user, id);
  }
}
