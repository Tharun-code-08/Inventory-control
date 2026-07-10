"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.gstStateCodeFromTaxId = gstStateCodeFromTaxId;
exports.resolveGstSupplyType = resolveGstSupplyType;
exports.isInterStateSupply = isInterStateSupply;
const client_1 = require("@prisma/client");
function gstStateCodeFromTaxId(taxId) {
    const trimmed = taxId?.trim().toUpperCase() ?? '';
    if (trimmed.length < 2)
        return null;
    const code = trimmed.slice(0, 2);
    return /^\d{2}$/.test(code) ? code : null;
}
function resolveGstSupplyType(args) {
    const shopCode = gstStateCodeFromTaxId(args.shopTaxId);
    const customerCode = gstStateCodeFromTaxId(args.customerTaxId);
    if (!shopCode || !customerCode)
        return client_1.GstSupplyType.INTRA_STATE;
    return shopCode !== customerCode ? client_1.GstSupplyType.INTER_STATE : client_1.GstSupplyType.INTRA_STATE;
}
function isInterStateSupply(supplyType) {
    return supplyType === client_1.GstSupplyType.INTER_STATE;
}
//# sourceMappingURL=gst-supply-type.js.map