"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.loadShopCompanyContext = loadShopCompanyContext;
exports.buildCompanyPartyLines = buildCompanyPartyLines;
exports.customerPartyLines = customerPartyLines;
exports.supplierPartyLines = supplierPartyLines;
const common_1 = require("@nestjs/common");
const document_pdf_formatters_1 = require("../document-pdf.formatters");
async function loadShopCompanyContext(prisma, shopId) {
    const shop = await prisma.shop.findUnique({
        where: { id: shopId },
        select: {
            shopName: true,
            address: true,
            email: true,
            taxId: true,
            companyId: true,
            company: { select: { companyName: true, address: true } },
        },
    });
    if (!shop?.companyId) {
        throw new common_1.BadRequestException('Shop not linked to a company');
    }
    const companyName = shop.company?.companyName ?? shop.shopName ?? 'Company';
    const companyLines = buildCompanyPartyLines({
        address: shop.company?.address ?? shop.address,
        gstin: shop.taxId,
        email: shop.email,
    });
    return {
        companyId: shop.companyId,
        companyName,
        companyLines,
        shopName: shop.shopName,
        shopLines: (0, document_pdf_formatters_1.splitAddressLines)(shop.address),
        shopEmail: shop.email,
        shopGstin: shop.taxId,
    };
}
function buildCompanyPartyLines(args) {
    const lines = (0, document_pdf_formatters_1.splitAddressLines)(args.address);
    if (args.gstin?.trim())
        lines.push(`GSTIN: ${args.gstin.trim()}`);
    if (args.email?.trim())
        lines.push(`Email: ${args.email.trim()}`);
    return lines;
}
function customerPartyLines(customer) {
    const cityLine = [customer.city, customer.state, customer.postalCode, customer.country]
        .filter(Boolean)
        .join(', ');
    return [
        customer.street ?? '',
        cityLine,
        customer.phone ? `Tel: ${customer.phone}` : '',
        customer.email ?? '',
        customer.taxId ? `GSTIN: ${customer.taxId}` : '',
        customer.pan ? `PAN: ${customer.pan}` : '',
    ].filter(Boolean);
}
function supplierPartyLines(supplier) {
    const cityLine = [supplier.city, supplier.state, supplier.postalCode, supplier.country]
        .filter(Boolean)
        .join(', ');
    return [
        supplier.contactPerson ?? '',
        supplier.street ?? '',
        cityLine,
        supplier.phone ? `Tel: ${supplier.phone}` : '',
        supplier.email ?? '',
        supplier.taxId ? `Tax ID: ${supplier.taxId}` : '',
        supplier.vatNumber ? `VAT: ${supplier.vatNumber}` : '',
    ].filter(Boolean);
}
//# sourceMappingURL=shop-company.js.map