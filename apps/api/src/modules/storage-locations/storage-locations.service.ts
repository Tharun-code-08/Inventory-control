import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import type { RequestUser } from '../../common/types/request-user';
import { assertShopScope, storageLocationListWhere } from '../../common/utils/shop-scope';
import { CreateStorageLocationDto } from './dto/create-storage-location.dto';
import { UpdateStorageLocationDto } from './dto/update-storage-location.dto';

@Injectable()
export class StorageLocationsService {
  constructor(private readonly prisma: PrismaService) {}

  async list(user: RequestUser, query: { shop_id?: string }) {
    return this.prisma.storageLocation.findMany({
      where: storageLocationListWhere(user, query.shop_id),
      orderBy: [{ shopId: 'asc' }, { code: 'asc' }],
      include: { shop: true },
    });
  }

  async create(user: RequestUser, dto: CreateStorageLocationDto) {
    assertShopScope(user, dto.shopId);
    return this.prisma.storageLocation.create({
      data: {
        shopId: dto.shopId,
        code: dto.code,
        name: dto.name,
        description: dto.description ?? null,
        isActive: dto.isActive ?? true,
        createdById: user.id,
      },
      include: { shop: true },
    });
  }

  async get(user: RequestUser, id: string) {
    const row = await this.prisma.storageLocation.findUnique({ where: { id }, include: { shop: true } });
    if (!row) throw new NotFoundException('Storage location not found');
    assertShopScope(user, row.shopId);
    return row;
  }

  async update(user: RequestUser, id: string, dto: UpdateStorageLocationDto) {
    const existing = await this.get(user, id);
    if (dto.shopId) assertShopScope(user, dto.shopId);
    return this.prisma.storageLocation.update({
      where: { id },
      data: {
        shopId: dto.shopId ?? existing.shopId,
        code: dto.code,
        name: dto.name,
        description: dto.description,
        isActive: dto.isActive,
        updatedById: user.id,
      },
      include: { shop: true },
    });
  }

  async remove(user: RequestUser, id: string) {
    await this.get(user, id);
    return this.prisma.storageLocation.update({
      where: { id },
      data: { isActive: false, updatedById: user.id },
    });
  }
}

