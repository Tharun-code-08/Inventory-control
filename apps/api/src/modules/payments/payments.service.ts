import { Injectable, NotFoundException } from '@nestjs/common';
import { InvoiceStatus, Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import type { RequestUser } from '../../common/types/request-user';
import { assertShopScope } from '../../common/utils/shop-scope';
import { CreatePaymentDto } from './dto/create-payment.dto';

@Injectable()
export class PaymentsService {
  constructor(private readonly prisma: PrismaService) {}

  async list(user: RequestUser) {
    return this.prisma.paymentReceipt.findMany({
      where: user.shopId ? { shopId: user.shopId } : undefined,
      orderBy: { receiptDate: 'desc' },
      include: { invoice: true, shop: true },
    });
  }

  async create(user: RequestUser, dto: CreatePaymentDto) {
    const invoice = await this.prisma.invoiceHeader.findUnique({ where: { id: dto.invoiceId } });
    if (!invoice) throw new NotFoundException('Invoice not found');
    assertShopScope(user, invoice.shopId);

    const count = await this.prisma.paymentReceipt.count({ where: { shopId: invoice.shopId } });
    const receiptNumber = dto.receiptNumber?.trim() || `RCPT-${new Date().getFullYear()}-${String(count + 1).padStart(5, '0')}`;
    const amount = new Prisma.Decimal(dto.amount ?? 0);
    return this.prisma.$transaction(async (tx) => {
      const payment = await tx.paymentReceipt.create({
        data: {
          receiptNumber,
          receiptDate: dto.receiptDate ? new Date(dto.receiptDate) : new Date(),
          invoiceId: invoice.id,
          shopId: invoice.shopId,
          amount,
          method: dto.method ?? null,
          reference: dto.reference ?? null,
          remarks: dto.remarks ?? null,
          createdById: user.id,
        },
        include: { invoice: true, shop: true },
      });

      const newPaid = new Prisma.Decimal(invoice.paidValue).add(amount);
      const status =
        newPaid.greaterThanOrEqualTo(invoice.totalValue) ? InvoiceStatus.PAID : InvoiceStatus.PARTIALLY_PAID;

      await tx.invoiceHeader.update({
        where: { id: invoice.id },
        data: {
          paidValue: newPaid,
          status,
          updatedById: user.id,
        },
      });
      return payment;
    });
  }
}

