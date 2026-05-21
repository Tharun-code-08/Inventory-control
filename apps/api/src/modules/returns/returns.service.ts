import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  AuditAction,
  CostingMethod,
  CreditNoteStatus,
  Prisma,
  ReturnStatus,
  TransactionType,
} from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import type { RequestUser } from '../../common/types/request-user';
import { assertShopScope, defaultShopFilter } from '../../common/utils/shop-scope';
import { asMoney, roundMoney } from '../../common/utils/money';
import { AuditService } from '../audit/audit.service';
import { DocumentNumberService } from '../stock/document-number.service';
import { CostingService } from '../stock/costing.service';
import { StockService } from '../stock/stock.service';
import { CreateCustomerReturnDto } from './dto/create-customer-return.dto';
import { CreateSupplierReturnDto } from './dto/create-supplier-return.dto';

@Injectable()
export class ReturnsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly stock: StockService,
    private readonly costing: CostingService,
    private readonly numbers: DocumentNumberService,
    private readonly audit: AuditService,
  ) {}

  // -- Customer returns -----------------------------------------------------

  async createCustomerReturn(user: RequestUser, dto: CreateCustomerReturnDto) {
    const shopId = dto.shopId ?? defaultShopFilter(user) ?? user.shopId;
    if (!shopId) throw new BadRequestException('shopId is required');
    assertShopScope(user, shopId);

    const returnDate = dto.returnDate ? new Date(dto.returnDate) : new Date();
    let total = new Prisma.Decimal(0);
    const items = dto.items.map((it) => {
      const quantity = asMoney(it.quantity);
      const unitPrice = asMoney(it.unitPrice);
      const lineValue = roundMoney(quantity.mul(unitPrice));
      total = total.add(lineValue);
      return {
        productId: it.productId,
        quantity,
        uom: it.uom ?? 'UNIT',
        unitPrice: roundMoney(unitPrice),
        lineValue,
      };
    });

    return this.prisma.$transaction(async (tx) => {
      const number = await this.numbers.nextNumber(tx, {
        shopId,
        docType: 'CRT',
        prefix: 'CRT',
        date: returnDate,
      });
      const created = await tx.customerReturn.create({
        data: {
          returnNumber: number,
          returnDate,
          shopId,
          customerId: dto.customerId,
          invoiceId: dto.invoiceId ?? null,
          salesOrderId: dto.salesOrderId ?? null,
          reason: dto.reason ?? null,
          remarks: dto.remarks ?? null,
          status: ReturnStatus.DRAFT,
          totalValue: roundMoney(total),
          createdById: user.id,
          items: { create: items },
        },
        include: { items: true },
      });
      await this.audit.log(
        {
          userId: user.id,
          action: AuditAction.CREATE,
          entityType: 'CUSTOMER_RETURN',
          entityId: created.id,
          newValues: {
            returnNumber: created.returnNumber,
            customerId: created.customerId,
            totalValue: created.totalValue.toString(),
          },
        },
        tx,
      );
      return created;
    });
  }

  /**
   * Post a customer return. This:
   *   1. Atomically transitions the return to POSTED.
   *   2. Records a positive stock movement per line (qty back into stock).
   *   3. Records a cost-layer inflow at the same unit cost.
   *   4. Creates a CreditNote for the total.
   * Idempotent on a per-line key so retries do not double-stock.
   */
  async postCustomerReturn(user: RequestUser, id: string) {
    const ret = await this.prisma.customerReturn.findUnique({
      where: { id },
      include: { items: true },
    });
    if (!ret) throw new NotFoundException('Customer return not found');
    assertShopScope(user, ret.shopId);
    if (ret.status === ReturnStatus.POSTED) return ret;
    if (ret.status !== ReturnStatus.DRAFT) {
      throw new BadRequestException(`Cannot post return in status ${ret.status}`);
    }

    const shop = await this.prisma.shop.findUnique({
      where: { id: ret.shopId },
      select: { costingMethod: true },
    });
    const method = shop?.costingMethod ?? CostingMethod.AVERAGE;

    return this.prisma.$transaction(async (tx) => {
      const transitioned = await tx.customerReturn.updateMany({
        where: { id, status: ReturnStatus.DRAFT },
        data: {
          status: ReturnStatus.POSTED,
          postedAt: new Date(),
          updatedById: user.id,
        },
      });
      if (transitioned.count === 0) {
        throw new ConflictException('Customer return state changed concurrently');
      }

      for (const line of ret.items) {
        await this.stock.postMovementOnce(tx, {
          type: TransactionType.GOODS_RECEIPT,
          ref: ret.returnNumber,
          date: ret.returnDate,
          shopId: ret.shopId,
          productId: line.productId,
          inQty: Number(line.quantity),
          outQty: 0,
          unitRate: Number(line.unitPrice),
          remarks: 'Customer return',
          sourceType: 'CUSTOMER_RETURN',
          sourceId: ret.id,
          sourceLineId: line.id,
          idempotencyKey: `cust-ret:${ret.id}:${line.id}`,
          userId: user.id,
        });
        await this.costing.recordInflow(tx, {
          shopId: ret.shopId,
          productId: line.productId,
          qty: new Prisma.Decimal(line.quantity),
          unitCost: new Prisma.Decimal(line.unitPrice),
          method,
        });
      }

      const creditNumber = await this.numbers.nextNumber(tx, {
        shopId: ret.shopId,
        docType: 'CN',
        prefix: 'CN',
        date: ret.returnDate,
      });
      await tx.creditNote.create({
        data: {
          creditNumber,
          creditDate: ret.returnDate,
          shopId: ret.shopId,
          customerId: ret.customerId,
          invoiceId: ret.invoiceId,
          returnId: ret.id,
          status: CreditNoteStatus.ISSUED,
          amount: ret.totalValue,
          createdById: user.id,
        },
      });

      await this.audit.log(
        {
          userId: user.id,
          action: AuditAction.POST,
          entityType: 'CUSTOMER_RETURN',
          entityId: ret.id,
          newValues: { status: ReturnStatus.POSTED, creditNumber },
        },
        tx,
      );

      return tx.customerReturn.findUniqueOrThrow({
        where: { id },
        include: { items: true, creditNote: true },
      });
    });
  }

  // -- Supplier returns -----------------------------------------------------

  async createSupplierReturn(user: RequestUser, dto: CreateSupplierReturnDto) {
    const shopId = dto.shopId ?? defaultShopFilter(user) ?? user.shopId;
    if (!shopId) throw new BadRequestException('shopId is required');
    assertShopScope(user, shopId);

    const returnDate = dto.returnDate ? new Date(dto.returnDate) : new Date();
    let total = new Prisma.Decimal(0);
    const items = dto.items.map((it) => {
      const quantity = asMoney(it.quantity);
      const unitCost = asMoney(it.unitCost);
      const lineValue = roundMoney(quantity.mul(unitCost));
      total = total.add(lineValue);
      return {
        productId: it.productId,
        quantity,
        uom: it.uom ?? 'UNIT',
        unitCost: roundMoney(unitCost),
        lineValue,
      };
    });

    return this.prisma.$transaction(async (tx) => {
      const number = await this.numbers.nextNumber(tx, {
        shopId,
        docType: 'SRT',
        prefix: 'SRT',
        date: returnDate,
      });
      const created = await tx.supplierReturn.create({
        data: {
          returnNumber: number,
          returnDate,
          shopId,
          supplierName: dto.supplierName,
          purchaseOrderId: dto.purchaseOrderId ?? null,
          reason: dto.reason ?? null,
          remarks: dto.remarks ?? null,
          status: ReturnStatus.DRAFT,
          totalValue: roundMoney(total),
          createdById: user.id,
          items: { create: items },
        },
        include: { items: true },
      });
      await this.audit.log(
        {
          userId: user.id,
          action: AuditAction.CREATE,
          entityType: 'SUPPLIER_RETURN',
          entityId: created.id,
        },
        tx,
      );
      return created;
    });
  }

  async postSupplierReturn(user: RequestUser, id: string) {
    const ret = await this.prisma.supplierReturn.findUnique({
      where: { id },
      include: { items: true },
    });
    if (!ret) throw new NotFoundException('Supplier return not found');
    assertShopScope(user, ret.shopId);
    if (ret.status === ReturnStatus.POSTED) return ret;
    if (ret.status !== ReturnStatus.DRAFT) {
      throw new BadRequestException(`Cannot post return in status ${ret.status}`);
    }

    const shop = await this.prisma.shop.findUnique({
      where: { id: ret.shopId },
      select: { costingMethod: true },
    });
    const method = shop?.costingMethod ?? CostingMethod.AVERAGE;

    return this.prisma.$transaction(async (tx) => {
      const transitioned = await tx.supplierReturn.updateMany({
        where: { id, status: ReturnStatus.DRAFT },
        data: { status: ReturnStatus.POSTED, postedAt: new Date(), updatedById: user.id },
      });
      if (transitioned.count === 0) {
        throw new ConflictException('Supplier return state changed concurrently');
      }
      for (const line of ret.items) {
        // Consume cost layers / weighted-avg for the actual cost going OUT.
        const { unitCost } = await this.costing.recordOutflow(tx, {
          shopId: ret.shopId,
          productId: line.productId,
          qty: new Prisma.Decimal(line.quantity),
          method,
        });
        await this.stock.postMovementOnce(tx, {
          type: TransactionType.GOODS_ISSUE,
          ref: ret.returnNumber,
          date: ret.returnDate,
          shopId: ret.shopId,
          productId: line.productId,
          inQty: 0,
          outQty: Number(line.quantity),
          unitRate: unitCost.gt(0) ? unitCost : new Prisma.Decimal(line.unitCost),
          remarks: 'Supplier return',
          sourceType: 'SUPPLIER_RETURN',
          sourceId: ret.id,
          sourceLineId: line.id,
          idempotencyKey: `sup-ret:${ret.id}:${line.id}`,
          userId: user.id,
        });
      }
      await this.audit.log(
        {
          userId: user.id,
          action: AuditAction.POST,
          entityType: 'SUPPLIER_RETURN',
          entityId: ret.id,
        },
        tx,
      );
      return tx.supplierReturn.findUniqueOrThrow({
        where: { id },
        include: { items: true },
      });
    });
  }

  async listCustomerReturns(user: RequestUser) {
    const shopId = defaultShopFilter(user);
    return this.prisma.customerReturn.findMany({
      where: shopId ? { shopId } : undefined,
      orderBy: { createdAt: 'desc' },
      take: 200,
      include: { customer: true },
    });
  }

  async listSupplierReturns(user: RequestUser) {
    const shopId = defaultShopFilter(user);
    return this.prisma.supplierReturn.findMany({
      where: shopId ? { shopId } : undefined,
      orderBy: { createdAt: 'desc' },
      take: 200,
    });
  }
}
