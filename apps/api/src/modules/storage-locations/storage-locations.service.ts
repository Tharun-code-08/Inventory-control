import { Injectable, NotFoundException } from '@nestjs/common';
import { throwDuplicateRecordConflict } from '../../common/errors/duplicate-conflict';
import { PrismaService } from '../../prisma/prisma.service';
import type { RequestUser } from '../../common/types/request-user';
import { assertShopScope, storageLocationListWhere } from '../../common/utils/shop-scope';
import { CreateStorageLocationDto } from './dto/create-storage-location.dto';
import { UpdateStorageLocationDto } from './dto/update-storage-location.dto';

@Injectable()
export class StorageLocationsService {
  constructor(private readonly prisma: PrismaService) {}

  private normalizeCode(code: string) {
    return code.trim().toUpperCase();
  }

  private async assertUniqueCode(
    shopId: string,
    code: string,
    excludeId?: string,
    user?: RequestUser,
  ) {
    const normalized = this.normalizeCode(code);
    const existing = await this.prisma.storageLocation.findUnique({
      where: { shopId_code: { shopId, code: normalized } },
      select: { id: true, code: true, name: true, isActive: true },
    });
    if (existing && existing.id !== excludeId) {
      throwDuplicateRecordConflict(
        `Storage location code "${normalized}" already exists for this plant`,
        {
          recordId: existing.id,
          recordCode: existing.code,
          recordName: existing.name,
          entity: 'StorageLocation',
          listPath: '/storage-locations',
          isArchived: !existing.isActive,
        },
        user
          ? {
              userId: user.id,
              userEmail: user.email,
              shopId: user.shopId,
              companyId: user.companyId,
            }
          : undefined,
      );
    }
    return normalized;
  }

  async list(user: RequestUser, query: { shop_id?: string }) {
    return this.prisma.storageLocation.findMany({
      where: storageLocationListWhere(user, query.shop_id),
      orderBy: [{ shopId: 'asc' }, { code: 'asc' }],
      include: { shop: true },
    });
  }

  async create(user: RequestUser, dto: CreateStorageLocationDto) {
    assertShopScope(user, dto.shopId);
    const code = await this.assertUniqueCode(dto.shopId, dto.code, undefined, user);
    return this.prisma.storageLocation.create({
      data: {
        shopId: dto.shopId,
        code,
        name: dto.name.trim(),
        description: dto.description?.trim() ?? null,
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
    const shopId = dto.shopId ?? existing.shopId;
    if (dto.shopId) assertShopScope(user, dto.shopId);
    const code =
      dto.code !== undefined
        ? await this.assertUniqueCode(shopId, dto.code, id, user)
        : existing.code;
    return this.prisma.storageLocation.update({
      where: { id },
      data: {
        shopId,
        code,
        name: dto.name?.trim(),
        description: dto.description?.trim(),
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

