import { BadRequestException } from '@nestjs/common';
import { Prisma, ReturnStatus, SupplierBillStatus } from '@prisma/client';
import type { PrismaService } from '../../prisma/prisma.service';

type DbClient = PrismaService | Prisma.TransactionClient;

const OPEN_BILL_STATUSES: SupplierBillStatus[] = [
  SupplierBillStatus.DRAFT,
  SupplierBillStatus.ISSUED,
  SupplierBillStatus.PARTIALLY_PAID,
  SupplierBillStatus.PAID,
];

export async function getGrDownstreamLinks(db: DbClient, grId: string) {
  const [supplierBillCount, supplierPaymentCount, supplierReturnCount] = await Promise.all([
    db.supplierBillHeader.count({
      where: { goodsReceiptId: grId, status: { not: SupplierBillStatus.VOID } },
    }),
    db.supplierPayment.count({
      where: { supplierBill: { goodsReceiptId: grId } },
    }),
    db.supplierReturn.count({
      where: {
        goodsReceiptId: grId,
        status: { not: ReturnStatus.CANCELLED },
      },
    }),
  ]);

  return {
    supplierBillCount,
    supplierPaymentCount,
    supplierReturnCount,
    hasFinancialLinks:
      supplierBillCount > 0 || supplierPaymentCount > 0 || supplierReturnCount > 0,
  };
}

export async function assertGrMutationAllowed(
  db: DbClient,
  args: { grId: string; action: 'update' | 'delete' | 'unpost' },
) {
  const links = await getGrDownstreamLinks(db, args.grId);
  if (!links.hasFinancialLinks) return;

  const parts: string[] = [];
  if (links.supplierBillCount > 0) {
    parts.push(`${links.supplierBillCount} supplier bill(s)`);
  }
  if (links.supplierPaymentCount > 0) {
    parts.push(`${links.supplierPaymentCount} payment(s)`);
  }
  if (links.supplierReturnCount > 0) {
    parts.push(`${links.supplierReturnCount} supplier return(s)`);
  }

  const verb =
    args.action === 'delete' ? 'delete' : args.action === 'unpost' ? 'reverse' : 'modify';
  throw new BadRequestException(
    `Cannot ${verb} this goods receipt because downstream documents exist: ${parts.join(', ')}.`,
  );
}

export async function getSupplierBillDownstreamLinks(db: DbClient, billId: string) {
  const [paymentCount, paidAgg] = await Promise.all([
    db.supplierPayment.count({ where: { supplierBillId: billId } }),
    db.supplierBillHeader.findUnique({
      where: { id: billId },
      select: { paidValue: true },
    }),
  ]);

  const paidValue = paidAgg?.paidValue ?? new Prisma.Decimal(0);

  return {
    paymentCount,
    hasPayments: paymentCount > 0 || paidValue.gt(0),
    paidValue,
  };
}

export async function assertSupplierBillMutationAllowed(
  db: DbClient,
  args: { billId: string; action: 'void' | 'update' | 'delete' },
) {
  const links = await getSupplierBillDownstreamLinks(db, args.billId);
  if (!links.hasPayments) return;

  throw new BadRequestException(
    `Cannot ${args.action} this supplier bill because ${links.paymentCount} payment(s) exist (paid ${links.paidValue.toString()}).`,
  );
}

/** Returns true when a non-void bill already exists for the GR (call inside locked transaction). */
export async function grHasOpenBill(db: DbClient, grId: string): Promise<boolean> {
  const count = await db.supplierBillHeader.count({
    where: { goodsReceiptId: grId, status: { in: OPEN_BILL_STATUSES } },
  });
  return count > 0;
}
