import { Body, Controller, Delete, Get, Param, Patch, Post, Query, UploadedFile, UseInterceptors } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { FileInterceptor } from '@nestjs/platform-express';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { RequirePermission } from '../../common/decorators/require-permission.decorator';
import type { RequestUser } from '../../common/types/request-user';
import { brandingMulterOptions } from '../../common/branding/branding-multer.options';
import { UpdateBrandingProfileDto } from '../../common/branding/dto/update-branding-profile.dto';
import { CreateShopDto } from './dto/create-shop.dto';
import { UpdateShopDto } from './dto/update-shop.dto';
import { ShopsService } from './shops.service';

@ApiTags('shops')
@ApiBearerAuth()
@Controller('shops')
export class ShopsController {
  constructor(private readonly shops: ShopsService) {}

  @RequirePermission('shop:read')
  @Get()
  list(
    @CurrentUser() user: RequestUser,
    @Query('is_active') isActive?: string,
    @Query('cursor') cursor?: string,
    @Query('take') take?: string,
  ) {
    return this.shops.list(user, {
      is_active: isActive === undefined ? undefined : isActive === 'true',
      cursor,
      take: take ? Number(take) : undefined,
    });
  }

  @RequirePermission('shop:write')
  @Post()
  create(@CurrentUser() user: RequestUser, @Body() dto: CreateShopDto) {
    return this.shops.create(user, dto);
  }

  @RequirePermission('shop:read')
  @Get(':id')
  get(@CurrentUser() user: RequestUser, @Param('id') id: string) {
    return this.shops.get(user, id);
  }

  @RequirePermission('shop:write')
  @Patch(':id')
  update(@CurrentUser() user: RequestUser, @Param('id') id: string, @Body() dto: UpdateShopDto) {
    return this.shops.update(user, id, dto);
  }

  @RequirePermission('shop:write')
  @Patch(':id/branding')
  @UseInterceptors(FileInterceptor('logo', brandingMulterOptions))
  updateBranding(
    @CurrentUser() user: RequestUser,
    @Param('id') id: string,
    @Body() dto: UpdateBrandingProfileDto,
    @UploadedFile() logo?: Express.Multer.File,
  ) {
    return this.shops.updateBranding(user, id, dto, logo);
  }

  @RequirePermission('shop:read')
  @Get(':id/branding')
  getBranding(@CurrentUser() user: RequestUser, @Param('id') id: string) {
    return this.shops.getBranding(user, id);
  }

  @RequirePermission('shop:write')
  @Delete(':id')
  remove(@CurrentUser() user: RequestUser, @Param('id') id: string) {
    return this.shops.remove(user, id);
  }
}
