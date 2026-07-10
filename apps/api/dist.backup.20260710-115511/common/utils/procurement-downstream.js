"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getGrDownstreamLinks = getGrDownstreamLinks;
exports.assertGrMutationAllowed = assertGrMutationAllowed;
exports.getSupplierBillDownstreamLinks = getSupplierBillDownstreamLinks;
exports.assertSupplierBillMutationAllowed = assertSupplierBillMutationAllowed;
exports.grHasOpenBill = grHasOpenBill;
const common_1 = require("@nestjs/common");
const client_1 = require("@prisma/client");
const OPEN_BILL_STATUSES = [
    client_1.SupplierBillStatus.DRAFT,
    client_1.SupplierBillStatus.ISSUED,
    client_1.SupplierBillStatus.PARTIALLY_PAID,
    client_1.SupplierBillStatus.PAID,
];
async function getGrDownstreamLinks(db, grId) {
    const [supplierBillCount, supplierPaymentCount, supplierReturnCount] = await Promise.all([
        db.supplierBillHeader.count({
            where: { goodsReceiptId: grId, status: { not: client_1.SupplierBillStatus.VOID } },
        }),
        db.supplierPayment.count({
            where: { supplierBill: { goodsReceiptId: grId } },
        }),
        db.supplierReturn.count({
            where: {
                goodsReceiptId: grId,
                status: { not: client_1.ReturnStatus.CANCELLED },
            },
        }),
    ]);
    return {
        supplierBillCount,
        supplierPaymentCount,
        supplierReturnCount,
        hasFinancialLinks: supplierBillCount > 0 || supplierPaymentCount > 0 || supplierReturnCount > 0,
    };
}
async function assertGrMutationAllowed(db, args) {
    const links = await getGrDownstreamLinks(db, args.grId);
    if (!links.hasFinancialLinks)
        return;
    const parts = [];
    if (links.supplierBillCount > 0) {
        parts.push(`${links.supplierBillCount} supplier bill(s)`);
    }
    if (links.supplierPaymentCount > 0) {
        parts.push(`${links.supplierPaymentCount} payment(s)`);
    }
    if (links.supplierReturnCount > 0) {
        parts.push(`${links.supplierReturnCount} supplier return(s)`);
    }
    const verb = args.action === 'delete' ? 'delete' : args.action === 'unpost' ? 'reverse' : 'modify';
    throw new common_1.BadRequestException(`Cannot ${verb} this goods receipt because downstream documents exist: ${parts.join(', ')}.`);
}
async function getSupplierBillDownstreamLinks(db, billId) {
    const [paymentCount, paidAgg] = await Promise.all([
        db.supplierPayment.count({ where: { supplierBillId: billId } }),
        db.supplierBillHeader.findUnique({
            where: { id: billId },
            select: { paidValue: true },
        }),
    ]);
    const paidValue = paidAgg?.paidValue ?? new client_1.Prisma.Decimal(0);
    return {
        paymentCount,
        hasPayments: paymentCount > 0 || paidValue.gt(0),
        paidValue,
    };
}
async function assertSupplierBillMutationAllowed(db, args) {
    const links = await getSupplierBillDownstreamLinks(db, args.billId);
    if (!links.hasPayments)
        return;
    throw new common_1.BadRequestException(`Cannot ${args.action} this supplier bill because ${links.paymentCount} payment(s) exist (paid ${links.paidValue.toString()}).`);
}
async function grHasOpenBill(db, grId) {
    const count = await db.supplierBillHeader.count({
        where: { goodsReceiptId: grId, status: { in: OPEN_BILL_STATUSES } },
    });
    return count > 0;
}
//# sourceMappingURL=procurement-downstream.js.map