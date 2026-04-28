import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { DocumentStatus, Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import type { RequestUser } from '../../common/types/request-user';
import { assertShopScope } from '../../common/utils/shop-scope';
import { CreateContractDto, CreateContractItemDto } from './dto/create-contract.dto';
import { UpdateContractDto } from './dto/update-contract.dto';

@Injectable()
export class ContractsService {
  constructor(private readonly prisma: PrismaService) {}

  async list(user: RequestUser) {
    return this.prisma.contractHeader.findMany({
      where: user.shopId ? { shopId: user.shopId } : undefined,
      orderBy: { createdAt: 'desc' },
      include: {
        supplier: true,
        rfq: true,
        items: { include: { product: true } },
      },
    });
  }

  async create(user: RequestUser, dto: CreateContractDto) {
    const shopId = dto.shopId ?? user.shopId;
    if (!shopId) throw new BadRequestException('shopId is required');
    assertShopScope(user, shopId);
    const count = await this.prisma.contractHeader.count({ where: { shopId } });
    const contractNumber = `CT-${new Date().getFullYear()}-${String(count + 1).padStart(5, '0')}`;
    return this.prisma.contractHeader.create({
      data: {
        contractNumber,
        shopId,
        supplierId: dto.supplierId,
        rfqId: dto.rfqId ?? null,
        title: dto.title,
        paymentTerms: dto.paymentTerms ?? null,
        startDate: dto.startDate ? new Date(dto.startDate) : new Date(),
        endDate: dto.endDate ? new Date(dto.endDate) : null,
        notes: dto.notes ?? null,
        status: DocumentStatus.DRAFT,
        createdById: user.id,
        items: {
          create: (dto.items ?? []).map((item: CreateContractItemDto) => ({
            productId: item.productId ?? null,
            description: item.description ?? null,
            quantity: new Prisma.Decimal(item.quantity ?? 0),
            uom: item.uom ?? 'UNIT',
            unitPrice: new Prisma.Decimal(item.unitPrice ?? 0),
            lineValue: new Prisma.Decimal((item.quantity ?? 0) * (item.unitPrice ?? 0)),
            createdById: user.id,
          })),
        },
      },
      include: {
        supplier: true,
        rfq: true,
        items: { include: { product: true } },
      },
    });
  }

  async get(user: RequestUser, id: string) {
    const contract = await this.prisma.contractHeader.findUnique({
      where: { id },
      include: {
        supplier: true,
        rfq: true,
        items: { include: { product: true } },
      },
    });
    if (!contract) throw new NotFoundException('Contract not found');
    assertShopScope(user, contract.shopId);
    return contract;
  }

  async update(user: RequestUser, id: string, dto: UpdateContractDto) {
    const existing = await this.get(user, id);
    return this.prisma.$transaction(async (tx) => {
      await tx.contractItem.deleteMany({ where: { contractId: id } });
      return tx.contractHeader.update({
        where: { id },
        data: {
          supplierId: dto.supplierId ?? existing.supplierId,
          rfqId: dto.rfqId ?? existing.rfqId,
          title: dto.title ?? existing.title,
          paymentTerms: dto.paymentTerms ?? null,
          startDate: dto.startDate ? new Date(dto.startDate) : existing.startDate,
          endDate: dto.endDate ? new Date(dto.endDate) : null,
          notes: dto.notes ?? null,
          updatedById: user.id,
          items: {
            create: (dto.items ?? []).map((item: CreateContractItemDto) => ({
              productId: item.productId ?? null,
              description: item.description ?? null,
              quantity: new Prisma.Decimal(item.quantity ?? 0),
              uom: item.uom ?? 'UNIT',
              unitPrice: new Prisma.Decimal(item.unitPrice ?? 0),
              lineValue: new Prisma.Decimal((item.quantity ?? 0) * (item.unitPrice ?? 0)),
              createdById: user.id,
            })),
          },
        },
        include: {
          supplier: true,
          rfq: true,
          items: { include: { product: true } },
        },
      });
    });
  }

  async activate(user: RequestUser, id: string) {
    await this.get(user, id);
    return this.prisma.contractHeader.update({
      where: { id },
      data: { status: DocumentStatus.POSTED, postedAt: new Date(), updatedById: user.id },
    });
  }

  async terminate(user: RequestUser, id: string) {
    await this.get(user, id);
    return this.prisma.contractHeader.update({
      where: { id },
      data: { notes: `[Terminated ${new Date().toISOString()}]`, updatedById: user.id },
    });
  }
}

