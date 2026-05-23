import { Body, Controller, Delete, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { RequirePermission } from '../../common/decorators/require-permission.decorator';
import type { RequestUser } from '../../common/types/request-user';
import { CreateStorageLocationDto } from './dto/create-storage-location.dto';
import { UpdateStorageLocationDto } from './dto/update-storage-location.dto';
import { StorageLocationsService } from './storage-locations.service';

@ApiTags('storage-locations')
@ApiBearerAuth()
@Controller('storage-locations')
export class StorageLocationsController {
  constructor(private readonly storageLocations: StorageLocationsService) {}

  @RequirePermission('storage_location:read')
  @Get()
  list(@CurrentUser() user: RequestUser, @Query('shop_id') shopId?: string) {
    return this.storageLocations.list(user, { shop_id: shopId });
  }

  @RequirePermission('storage_location:write')
  @Post()
  create(@CurrentUser() user: RequestUser, @Body() dto: CreateStorageLocationDto) {
    return this.storageLocations.create(user, dto);
  }

  @RequirePermission('storage_location:read')
  @Get(':id')
  get(@CurrentUser() user: RequestUser, @Param('id') id: string) {
    return this.storageLocations.get(user, id);
  }

  @RequirePermission('storage_location:write')
  @Patch(':id')
  update(@CurrentUser() user: RequestUser, @Param('id') id: string, @Body() dto: UpdateStorageLocationDto) {
    return this.storageLocations.update(user, id, dto);
  }

  @RequirePermission('storage_location:write')
  @Delete(':id')
  remove(@CurrentUser() user: RequestUser, @Param('id') id: string) {
    return this.storageLocations.remove(user, id);
  }
}

