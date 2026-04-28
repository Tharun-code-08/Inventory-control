import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { DocumentStatus, Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import type { RequestUser } from '../../common/types/request-user';
import { assertShopScope, defaultShopFilter } from '../../common/utils/shop-scope';
import { CreateRfqDto, CreateRfqItemDto } from './dto/create-rfq.dto';
import { UpdateRfqDto } from './dto/update-rfq.dto';

@Injectable()
export class RfqsService {
  constructor(private readonly prisma: PrismaService) {}

  async list(user: RequestUser) {
    const scopedShop = defaultShopFilter(user);
    return this.prisma.rfqHeader.findMany({
      where: scopedShop ? { shopId: scopedShop } : undefined,
      orderBy: { createdAt: 'desc' },
      include: {
        shop: true,
        suppliers: { include: { supplier: true } },
        items: { include: { product: true } },
      },
    });
  }

  async create(user: RequestUser, dto: CreateRfqDto) {
    const shopId = dto.shopId ?? user.shopId;
    if (!shopId) throw new BadRequestException('shopId is required');
    assertShopScope(user, shopId);
    const count = await this.prisma.rfqHeader.count({ where: { shopId } });
    const rfqNumber = `RFQ-${new Date().getFullYear()}-${String(count + 1).padStart(5, '0')}`;
    return this.prisma.rfqHeader.create({
      data: {
        rfqNumber,
        rfqDate: dto.rfqDate ? new Date(dto.rfqDate) : new Date(),
        deadline: dto.deadline ? new Date(dto.deadline) : null,
        title: dto.title,
        notes: dto.notes ?? null,
        shopId,
        status: DocumentStatus.DRAFT,
        createdById: user.id,
        suppliers: {
          create: (dto.suppliers ?? []).map((supplierId: string) => ({ supplierId })),
        },
        items: {
          create: (dto.items ?? []).map((item: CreateRfqItemDto) => ({
            productId: item.productId ?? null,
            description: item.description ?? null,
            quantity: new Prisma.Decimal(item.quantity ?? 0),
            uom: item.uom ?? 'UNIT',
            specifications: item.specifications ?? null,
            createdById: user.id,
          })),
        },
      },
      include: {
        shop: true,
        suppliers: { include: { supplier: true } },
        items: { include: { product: true } },
      },
    });
  }

  async get(user: RequestUser, id: string) {
    const rfq = await this.prisma.rfqHeader.findUnique({
      where: { id },
      include: {
        shop: true,
        suppliers: { include: { supplier: true } },
        items: { include: { product: true } },
      },
    });
    if (!rfq) throw new NotFoundException('RFQ not found');
    assertShopScope(user, rfq.shopId);
    return rfq;
  }

  async update(user: RequestUser, id: string, dto: UpdateRfqDto) {
    const existing = await this.get(user, id);
    return this.prisma.$transaction(async (tx) => {
      await tx.rfqSupplier.deleteMany({ where: { rfqId: id } });
      await tx.rfqItem.deleteMany({ where: { rfqHeaderId: id } });
      const updated = await tx.rfqHeader.update({
        where: { id },
        data: {
          rfqDate: dto.rfqDate ? new Date(dto.rfqDate) : existing.rfqDate,
          deadline: dto.deadline ? new Date(dto.deadline) : null,
          title: dto.title ?? existing.title,
          notes: dto.notes ?? null,
          updatedById: user.id,
          suppliers: {
            create: (dto.suppliers ?? []).map((supplierId: string) => ({ supplierId })),
          },
          items: {
            create: (dto.items ?? []).map((item: CreateRfqItemDto) => ({
              productId: item.productId ?? null,
              description: item.description ?? null,
              quantity: new Prisma.Decimal(item.quantity ?? 0),
              uom: item.uom ?? 'UNIT',
              specifications: item.specifications ?? null,
              createdById: user.id,
            })),
          },
        },
        include: {
          shop: true,
          suppliers: { include: { supplier: true } },
          items: { include: { product: true } },
        },
      });
      return updated;
    });
  }

  async send(user: RequestUser, id: string) {
    const existing = await this.get(user, id);
    return this.prisma.rfqHeader.update({
      where: { id },
      data: {
        status: DocumentStatus.POSTED,
        postedAt: new Date(),
        updatedById: user.id,
        notes: `${existing.notes ?? ''}\n[Sent ${new Date().toISOString()}]`.trim(),
      },
    });
  }

  async close(user: RequestUser, id: string) {
    await this.get(user, id);
    return this.prisma.rfqHeader.update({
      where: { id },
      data: {
        notes: `[Closed ${new Date().toISOString()}]`,
        updatedById: user.id,
      },
    });
  }
}

