import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma, SalesOrderStatus, TransactionType } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import type { RequestUser } from '../../common/types/request-user';
import { assertShopScope, defaultShopFilter } from '../../common/utils/shop-scope';
import { StockService } from '../stock/stock.service';
import { CreateSalesOrderDto, CreateSalesOrderItemDto } from './dto/create-sales-order.dto';

@Injectable()
export class SalesOrdersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly stock: StockService,
  ) {}

  async list(user: RequestUser) {
    const scopedShop = defaultShopFilter(user);
    return this.prisma.salesOrderHeader.findMany({
      where: scopedShop ? { shopId: scopedShop } : undefined,
      orderBy: { orderDate: 'desc' },
      include: { customer: true, items: { include: { product: true } } },
    });
  }

  async create(user: RequestUser, dto: CreateSalesOrderDto) {
    const shopId = dto.shopId ?? user.shopId;
    if (!shopId) throw new BadRequestException('shopId is required');
    assertShopScope(user, shopId);
    const count = await this.prisma.salesOrderHeader.count({ where: { shopId } });
    const soNumber = `SO-${new Date().getFullYear()}-${String(count + 1).padStart(5, '0')}`;
    return this.prisma.salesOrderHeader.create({
      data: {
        soNumber,
        orderDate: dto.orderDate ? new Date(dto.orderDate) : new Date(),
        expectedDate: dto.expectedDate ? new Date(dto.expectedDate) : null,
        customerId: dto.customerId,
        shopId,
        status: SalesOrderStatus.DRAFT,
        remarks: dto.remarks ?? null,
        totalValue: new Prisma.Decimal(
          (dto.items ?? []).reduce(
            (sum: number, it: CreateSalesOrderItemDto) => sum + Number(it.quantity ?? 0) * Number(it.unitPrice ?? 0),
            0,
          ),
        ),
        createdById: user.id,
        items: {
          create: (dto.items ?? []).map((item: CreateSalesOrderItemDto) => ({
            productId: item.productId,
            quantity: new Prisma.Decimal(item.quantity ?? 0),
            uom: item.uom ?? 'UNIT',
            unitPrice: new Prisma.Decimal(item.unitPrice ?? 0),
            lineValue: new Prisma.Decimal(Number(item.quantity ?? 0) * Number(item.unitPrice ?? 0)),
            createdById: user.id,
          })),
        },
      },
      include: { customer: true, items: { include: { product: true } } },
    });
  }

  async get(user: RequestUser, id: string) {
    const so = await this.prisma.salesOrderHeader.findUnique({
      where: { id },
      include: { customer: true, items: { include: { product: true } } },
    });
    if (!so) throw new NotFoundException('Sales order not found');
    assertShopScope(user, so.shopId);
    return so;
  }

  async confirm(user: RequestUser, id: string) {
    const so = await this.get(user, id);
    if (so.status !== SalesOrderStatus.DRAFT) return so;
    return this.prisma.salesOrderHeader.update({
      where: { id },
      data: { status: SalesOrderStatus.CONFIRMED, updatedById: user.id },
      include: { customer: true, items: { include: { product: true } } },
    });
  }

  async fulfill(user: RequestUser, id: string) {
    const so = await this.get(user, id);
    return this.prisma.$transaction(async (tx) => {
      for (const item of so.items) {
        await this.stock.postMovement(tx, {
          type: TransactionType.GOODS_ISSUE,
          ref: so.soNumber,
          date: new Date(),
          shopId: so.shopId,
          productId: item.productId,
          inQty: 0,
          outQty: Number(item.quantity),
          unitRate: Number(item.unitPrice),
          remarks: 'Sales order fulfillment',
          userId: user.id,
        });
      }
      return tx.salesOrderHeader.update({
        where: { id },
        data: { status: SalesOrderStatus.FULFILLED, updatedById: user.id },
        include: { customer: true, items: { include: { product: true } } },
      });
    });
  }
}

