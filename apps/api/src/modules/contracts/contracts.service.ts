import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { DocumentStatus, Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { SubscriptionService } from '../billing/subscription.service';
import { DocumentNumberService } from '../stock/document-number.service';
import type { RequestUser } from '../../common/types/request-user';
import { assertShopScope, shopListWhere } from '../../common/utils/shop-scope';
import { CreateContractDto, CreateContractItemDto } from './dto/create-contract.dto';
import { UpdateContractDto } from './dto/update-contract.dto';

@Injectable()
export class ContractsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly subscriptions: SubscriptionService,
    private readonly numbers: DocumentNumberService,
  ) {}

  async list(user: RequestUser) {
    return this.prisma.contractHeader.findMany({
      where: { shop: shopListWhere(user) },
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
    await this.subscriptions.assertFeatureForShop(shopId, 'contracts');
    const startDate = dto.startDate ? new Date(dto.startDate) : new Date();
    return this.prisma.$transaction(async (tx) => {
      const contractNumber = await this.numbers.nextConfiguredShopScopedNumber(tx, {
        shopId,
        docType: 'CT',
        date: startDate,
      });
      return tx.contractHeader.create({
        data: {
          contractNumber,
          shopId,
          supplierId: dto.supplierId,
          rfqId: dto.rfqId ?? null,
          title: dto.title,
          paymentTerms: dto.paymentTerms ?? null,
          startDate,
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
    await this.subscriptions.assertFeatureForShop(contract.shopId, 'contracts');
    return contract;
  }

  async update(user: RequestUser, id: string, dto: UpdateContractDto) {
    const existing = await this.get(user, id);
    await this.subscriptions.assertFeatureForShop(existing.shopId, 'contracts');
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
    const contract = await this.get(user, id);
    await this.subscriptions.assertFeatureForShop(contract.shopId, 'contracts');
    return this.prisma.contractHeader.update({
      where: { id },
      data: { status: DocumentStatus.POSTED, postedAt: new Date(), updatedById: user.id },
    });
  }

  async terminate(user: RequestUser, id: string) {
    const contract = await this.get(user, id);
    await this.subscriptions.assertFeatureForShop(contract.shopId, 'contracts');
    return this.prisma.contractHeader.update({
      where: { id },
      data: { notes: `[Terminated ${new Date().toISOString()}]`, updatedById: user.id },
    });
  }
}

