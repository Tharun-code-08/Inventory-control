import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { productImageMulterOptions } from '../../common/upload/product-image-multer.options';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { RequirePermission } from '../../common/decorators/require-permission.decorator';
import type { RequestUser } from '../../common/types/request-user';
import { CursorPageDto } from '../../common/dto/cursor-page.dto';
import { BulkInventoryDto } from './dto/bulk-inventory.dto';
import { BulkProductUpsertDto } from './dto/bulk-product-upsert.dto';
import { CreateProductDto } from './dto/create-product.dto';
import { ListProductsDto } from './dto/list-products.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { SearchHsnDto } from './dto/search-hsn.dto';
import { GstHsnService } from './gst-hsn.service';
import { ProductsService } from './products.service';

@ApiTags('products')
@ApiBearerAuth()
@Controller('products')
export class ProductsController {
  constructor(
    private readonly products: ProductsService,
    private readonly gstHsn: GstHsnService,
  ) {}

  @RequirePermission('product:read')
  @Get()
  @ApiOperation({ summary: 'List products (paginated, shop-scoped, filterable)' })
  list(@CurrentUser() user: RequestUser, @Query() query: ListProductsDto) {
    return this.products.list(user, {
      shop_id: query.shop_id ?? query.shopId,
      category: query.category,
      is_active: query.is_active ?? query.isActive,
      search: query.search,
      page: query.page,
      limit: query.limit,
      company_catalog: query.company_catalog,
    });
  }

  @RequirePermission('product:write')
  @Post()
  @ApiOperation({ summary: 'Create a product' })
  create(@CurrentUser() user: RequestUser, @Body() dto: CreateProductDto) {
    return this.products.create(user, dto);
  }

  @RequirePermission('product:write')
  @Post('bulk-inventory')
  @ApiOperation({
    summary:
      'Bulk update plant-level inventory thresholds (min/max/reorder + optional storage location) by productCode + shopNumber',
  })
  bulkInventory(@CurrentUser() user: RequestUser, @Body() dto: BulkInventoryDto) {
    return this.products.bulkUpdateInventory(user, dto);
  }

  @RequirePermission('product:write')
  @Post('bulk-upsert')
  @ApiOperation({
    summary:
      'Validate or commit SKU-based bulk product upserts, including plant assignment and stock synchronization',
  })
  bulkUpsert(@CurrentUser() user: RequestUser, @Body() dto: BulkProductUpsertDto) {
    return this.products.bulkUpsert(user, dto);
  }

  @RequirePermission('product:read')
  @Get('hsn/search')
  @ApiOperation({
    summary: 'Search HSN codes via GST portal (description or code prefix)',
  })
  searchHsn(@Query() query: SearchHsnDto) {
    return this.gstHsn.search(query.q);
  }

  @RequirePermission('product:read')
  @Get(':id/stock-history')
  @ApiOperation({ summary: 'Cursor-paginated stock-ledger history for a product' })
  history(
    @CurrentUser() user: RequestUser,
    @Param('id', new ParseUUIDPipe()) id: string,
    @Query() page: CursorPageDto,
  ) {
    return this.products.stockHistory(user, id, page);
  }

  @RequirePermission('product:read')
  @Get(':id/reorder-suggestion')
  @ApiOperation({ summary: 'PO prefill from prior orders and stock thresholds' })
  reorderSuggestion(
    @CurrentUser() user: RequestUser,
    @Param('id', new ParseUUIDPipe()) id: string,
    @Query('shop_id') shop_id?: string,
  ) {
    return this.products.reorderSuggestion(user, id, shop_id);
  }

  @RequirePermission('product:read')
  @Get(':id')
  @ApiOperation({ summary: 'Get a product by id' })
  get(@CurrentUser() user: RequestUser, @Param('id', new ParseUUIDPipe()) id: string) {
    return this.products.get(user, id);
  }

  @RequirePermission('product:write')
  @Patch(':id')
  @ApiOperation({ summary: 'Update a product' })
  update(
    @CurrentUser() user: RequestUser,
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() dto: UpdateProductDto,
  ) {
    return this.products.update(user, id, dto);
  }

  @RequirePermission('product:write')
  @Post(':id/image')
  @ApiOperation({ summary: 'Upload or replace the product image (compressed + thumbnailed)' })
  @UseInterceptors(FileInterceptor('image', productImageMulterOptions))
  uploadImage(
    @CurrentUser() user: RequestUser,
    @Param('id', new ParseUUIDPipe()) id: string,
    @UploadedFile() image: Express.Multer.File,
  ) {
    return this.products.setImage(user, id, image);
  }

  @RequirePermission('product:write')
  @Delete(':id/image')
  @ApiOperation({ summary: 'Remove the product image' })
  removeImage(@CurrentUser() user: RequestUser, @Param('id', new ParseUUIDPipe()) id: string) {
    return this.products.removeImage(user, id);
  }

  @RequirePermission('product:write')
  @Get(':id/deletion-impact')
  @ApiOperation({ summary: 'Explain whether a product can be permanently deleted' })
  deletionImpact(@CurrentUser() user: RequestUser, @Param('id', new ParseUUIDPipe()) id: string) {
    return this.products.deletionImpact(user, id);
  }

  @RequirePermission('product:write')
  @Delete(':id')
  @ApiOperation({ summary: 'Delete a product (only if it has no stock history)' })
  remove(@CurrentUser() user: RequestUser, @Param('id', new ParseUUIDPipe()) id: string) {
    return this.products.remove(user, id);
  }
}
