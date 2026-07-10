"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.VALID_GST_SLABS = void 0;
exports.validateGstSlab = validateGstSlab;
exports.validateIgstSlab = validateIgstSlab;
exports.resolveLineGstPercents = resolveLineGstPercents;
exports.computeSalesOrderLineTotals = computeSalesOrderLineTotals;
exports.productGstRateToLinePercents = productGstRateToLinePercents;
const common_1 = require("@nestjs/common");
const client_1 = require("@prisma/client");
const money_1 = require("./money");
const gst_supply_type_1 = require("./gst-supply-type");
exports.VALID_GST_SLABS = [0, 5, 12, 18, 28];
function round2(n) {
    return Math.round((n + Number.EPSILON) * 100) / 100;
}
function validateGstSlab(cgstPercent, sgstPercent) {
    if (cgstPercent < 0 || sgstPercent < 0) {
        throw new common_1.BadRequestException('CGST and SGST cannot be negative');
    }
    if (cgstPercent > 14 || sgstPercent > 14) {
        throw new common_1.BadRequestException('CGST and SGST cannot exceed 14% each');
    }
    const combined = round2(cgstPercent + sgstPercent);
    const valid = exports.VALID_GST_SLABS.some((slab) => Math.abs(slab - combined) < 0.001);
    if (!valid) {
        throw new common_1.BadRequestException(`Combined GST must be one of ${exports.VALID_GST_SLABS.join('%, ')}% (got ${combined}%)`);
    }
}
function validateIgstSlab(igstPercent) {
    if (igstPercent < 0) {
        throw new common_1.BadRequestException('IGST cannot be negative');
    }
    if (igstPercent > 28) {
        throw new common_1.BadRequestException('IGST cannot exceed 28%');
    }
    const valid = exports.VALID_GST_SLABS.some((slab) => Math.abs(slab - igstPercent) < 0.001);
    if (!valid) {
        throw new common_1.BadRequestException(`IGST must be one of ${exports.VALID_GST_SLABS.join('%, ')}% (got ${igstPercent}%)`);
    }
}
function resolveLineGstPercents(item, supplyType = client_1.GstSupplyType.INTRA_STATE) {
    if ((0, gst_supply_type_1.isInterStateSupply)(supplyType)) {
        if (item.igstRate != null) {
            const igstPercent = round2(Number(item.igstRate));
            validateIgstSlab(igstPercent);
            return { cgstPercent: 0, sgstPercent: 0, igstPercent };
        }
        const combinedPercent = round2((Number(item.taxRate ?? 0)) * 100);
        validateIgstSlab(combinedPercent);
        return { cgstPercent: 0, sgstPercent: 0, igstPercent: combinedPercent };
    }
    if (item.cgstRate != null || item.sgstRate != null) {
        const cgstPercent = round2(Number(item.cgstRate ?? 0));
        const sgstPercent = round2(Number(item.sgstRate ?? 0));
        validateGstSlab(cgstPercent, sgstPercent);
        return { cgstPercent, sgstPercent, igstPercent: 0 };
    }
    const combinedPercent = round2((Number(item.taxRate ?? 0)) * 100);
    const half = round2(combinedPercent / 2);
    validateGstSlab(half, half);
    return { cgstPercent: half, sgstPercent: half, igstPercent: 0 };
}
function computeSalesOrderLineTotals(item, supplyType = item.supplyType ?? client_1.GstSupplyType.INTRA_STATE) {
    const quantity = (0, money_1.asMoney)(item.quantity ?? 0);
    const unitPrice = (0, money_1.asMoney)(item.unitPrice ?? 0);
    const discount = (0, money_1.asMoney)(item.discountAmount ?? 0);
    const { cgstPercent, sgstPercent, igstPercent } = resolveLineGstPercents(item, supplyType);
    const subTotal = quantity.mul(unitPrice);
    const taxable = client_1.Prisma.Decimal.max(subTotal.sub(discount), new client_1.Prisma.Decimal(0));
    let cgstAmount = new client_1.Prisma.Decimal(0);
    let sgstAmount = new client_1.Prisma.Decimal(0);
    let igstAmount = new client_1.Prisma.Decimal(0);
    let taxAmount = new client_1.Prisma.Decimal(0);
    if ((0, gst_supply_type_1.isInterStateSupply)(supplyType)) {
        igstAmount = (0, money_1.roundMoney)(taxable.mul(new client_1.Prisma.Decimal(igstPercent)).div(100));
        taxAmount = igstAmount;
    }
    else {
        cgstAmount = (0, money_1.roundMoney)(taxable.mul(new client_1.Prisma.Decimal(cgstPercent)).div(100));
        sgstAmount = (0, money_1.roundMoney)(taxable.mul(new client_1.Prisma.Decimal(sgstPercent)).div(100));
        taxAmount = (0, money_1.roundMoney)(taxable.mul(new client_1.Prisma.Decimal(cgstPercent + sgstPercent)).div(100));
    }
    const lineValue = (0, money_1.roundMoney)(subTotal.sub(discount).add(taxAmount));
    const combinedPercent = (0, gst_supply_type_1.isInterStateSupply)(supplyType)
        ? igstPercent
        : cgstPercent + sgstPercent;
    const taxRate = new client_1.Prisma.Decimal(combinedPercent / 100);
    return {
        quantity,
        unitPrice: (0, money_1.roundMoney)(unitPrice),
        discountAmount: (0, money_1.roundMoney)(discount),
        cgstRate: new client_1.Prisma.Decimal(cgstPercent),
        sgstRate: new client_1.Prisma.Decimal(sgstPercent),
        igstRate: new client_1.Prisma.Decimal(igstPercent),
        taxRate,
        cgstAmount,
        sgstAmount,
        igstAmount,
        taxAmount,
        lineValue,
        taxable: (0, money_1.roundMoney)(taxable),
    };
}
function productGstRateToLinePercents(gstRatePercent, supplyType) {
    const combined = round2(Number(gstRatePercent) || 0);
    if (combined <= 0)
        return { cgstPercent: 0, sgstPercent: 0, igstPercent: 0 };
    if ((0, gst_supply_type_1.isInterStateSupply)(supplyType)) {
        validateIgstSlab(combined);
        return { cgstPercent: 0, sgstPercent: 0, igstPercent: combined };
    }
    const half = round2(combined / 2);
    validateGstSlab(half, half);
    return { cgstPercent: half, sgstPercent: half, igstPercent: 0 };
}
//# sourceMappingURL=sales-order-gst.js.map