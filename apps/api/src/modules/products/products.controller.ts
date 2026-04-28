import { Body, Controller, Delete, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { RequirePermission } from '../../common/decorators/require-permission.decorator';
import type { RequestUser } from '../../common/types/request-user';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { ProductsService } from './products.service';

@ApiTags('products')
@ApiBearerAuth()
@Controller('products')
export class ProductsController {
  constructor(private readonly products: ProductsService) {}

  @RequirePermission('product:read')
  @Get()
  list(
    @CurrentUser() user: RequestUser,
    @Query('shop_id') shopId?: string,
    @Query('shopId') legacyShopId?: string,
    @Query('category') category?: string,
    @Query('is_active') isActive?: string,
    @Query('isActive') legacyIsActive?: string,
    @Query('search') search?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.products.list(user, {
      shop_id: shopId ?? legacyShopId,
      category,
      is_active:
        isActive !== undefined
          ? isActive === 'true'
          : legacyIsActive !== undefined
            ? legacyIsActive === 'true'
            : undefined,
      search,
      page: page ? Number(page) : undefined,
      limit: limit ? Number(limit) : undefined,
    });
  }

  @RequirePermission('product:write')
  @Post()
  create(@CurrentUser() user: RequestUser, @Body() dto: CreateProductDto) {
    return this.products.create(user, dto);
  }

  @RequirePermission('product:read')
  @Get(':id/stock-history')
  history(
    @CurrentUser() user: RequestUser,
    @Param('id') id: string,
    @Query('cursor') cursor?: string,
    @Query('take') take?: string,
  ) {
    return this.products.stockHistory(user, id, {
      cursor,
      take: take ? Number(take) : undefined,
    });
  }

  @RequirePermission('product:read')
  @Get(':id')
  get(@CurrentUser() user: RequestUser, @Param('id') id: string) {
    return this.products.get(user, id);
  }

  @RequirePermission('product:write')
  @Patch(':id')
  update(@CurrentUser() user: RequestUser, @Param('id') id: string, @Body() dto: UpdateProductDto) {
    return this.products.update(user, id, dto);
  }

  @RequirePermission('product:write')
  @Delete(':id')
  remove(@CurrentUser() user: RequestUser, @Param('id') id: string) {
    return this.products.remove(user, id);
  }
}
