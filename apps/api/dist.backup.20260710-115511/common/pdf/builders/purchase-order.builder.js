"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.buildPurchaseOrderPdfViewModel = buildPurchaseOrderPdfViewModel;
exports.purchaseOrderPdfFilename = purchaseOrderPdfFilename;
exports.renderPurchaseOrderHtml = renderPurchaseOrderHtml;
exports.resolvePurchaseOrderCompanyId = resolvePurchaseOrderCompanyId;
exports.loadPurchaseOrderForPdf = loadPurchaseOrderForPdf;
const common_1 = require("@nestjs/common");
const po_remarks_1 = require("../po-remarks");
const document_pdf_formatters_1 = require("../document-pdf.formatters");
const purchase_order_template_1 = require("../templates/purchase-order.template");
async function buildPurchaseOrderPdfViewModel(prisma, po, companyId) {
    const { humanRemarks, document } = (0, po_remarks_1.parsePoRemarks)(po.remarks ?? null);
    const [company, supplierRow, shop] = await Promise.all([
        prisma.company.findUnique({
            where: { id: companyId },
            select: { companyName: true, address: true },
        }),
        prisma.supplier.findFirst({
            where: {
                companyId,
                supplierName: { equals: po.supplier.trim(), mode: 'insensitive' },
            },
        }),
        prisma.shop.findUnique({
            where: { id: po.shopId },
            select: { shopName: true, address: true, contactPerson: true, mobile: true },
        }),
    ]);
    const buyerName = document.buyerCompanyName ?? company?.companyName ?? 'Softdigit Consulting';
    const buyerLines = [
        ...(0, document_pdf_formatters_1.splitAddressLines)(document.buyerAddress ?? company?.address),
        document.buyerPhone ? `Tel: ${document.buyerPhone}` : '',
    ].filter(Boolean);
    const supplierTitle = document.vendorCompanyName ?? supplierRow?.supplierName ?? po.supplier;
    const supplierCity = [supplierRow?.city, supplierRow?.state, supplierRow?.postalCode, supplierRow?.country]
        .filter(Boolean)
        .join(', ');
    const supplierLines = [
        document.vendorContact ?? supplierRow?.contactPerson ?? '',
        document.vendorAddress ?? supplierRow?.street ?? '',
        document.vendorCityStateZip ?? supplierCity,
        document.vendorPhone ?? supplierRow?.phone ? `Tel: ${document.vendorPhone ?? supplierRow?.phone}` : '',
    ].filter(Boolean);
    const plantName = document.shipToCompany ?? shop?.shopName ?? po.shop?.shopName ?? '';
    const deliveryLines = [
        plantName,
        ...(0, document_pdf_formatters_1.splitAddressLines)(document.shipToAddress ?? shop?.address),
        document.shipToCityStateZip ?? '',
        document.shipToPhone ?? shop?.mobile ? `Tel: ${document.shipToPhone ?? shop?.mobile}` : '',
        document.shipToName && document.shipToName !== plantName ? `Attn: ${document.shipToName}` : '',
    ].filter(Boolean);
    const lines = po.items.map((i) => {
        const qty = Number(i.orderQty);
        const rate = Number(i.rate);
        const taxPercent = document.lineItemTaxes?.find((t) => t.productId === i.productId)?.taxPercent ?? 0;
        const lineSubtotal = qty * rate;
        const lineTaxAmount = lineSubtotal * (taxPercent / 100);
        const lineTotal = lineSubtotal + lineTaxAmount;
        return {
            code: i.product?.productCode ?? i.productId,
            description: i.lineDescription?.trim() || i.product?.description || '',
            qty: Number.isInteger(qty) ? String(qty) : (0, document_pdf_formatters_1.formatDocumentMoney)(qty),
            unitPrice: (0, document_pdf_formatters_1.formatDocumentMoney)(rate),
            taxPercent: taxPercent > 0 ? `${(0, document_pdf_formatters_1.formatDocumentMoney)(taxPercent)}%` : '0%',
            taxAmount: (0, document_pdf_formatters_1.formatDocumentMoney)(lineTaxAmount),
            total: (0, document_pdf_formatters_1.formatDocumentMoney)(lineTotal),
        };
    });
    let vatAmt = Number(document.taxAmount) || 0;
    if (vatAmt === 0 && document.lineItemTaxes?.length) {
        vatAmt = po.items.reduce((sum, item) => {
            const taxPct = document.lineItemTaxes?.find((t) => t.productId === item.productId)?.taxPercent ?? 0;
            const sub = Number(item.orderQty) * Number(item.rate);
            return sum + sub * (taxPct / 100);
        }, 0);
    }
    if (vatAmt === 0) {
        vatAmt = Number(po.taxAmount) || 0;
    }
    const totalNet = po.items.reduce((sum, i) => sum + Number(i.lineValue), 0);
    const deliveryAmt = Number(document.shippingAmount) || 0;
    const storedGrandTotal = Number(po.totalValue) || 0;
    const grandTotal = Math.max(totalNet + vatAmt + deliveryAmt, storedGrandTotal);
    const minRows = 12;
    const padRowCount = Math.max(0, minRows - lines.length);
    return {
        poNumber: po.poNumber,
        poDate: (0, document_pdf_formatters_1.formatDocumentDate)(po.poDate),
        buyerName,
        buyerLines,
        supplierTitle,
        supplierLines,
        deliveryLines,
        deliveryDate: (0, document_pdf_formatters_1.formatDocumentDate)(po.poDate),
        paymentTerms: document.paymentTerms ?? supplierRow?.paymentTerms ?? '—',
        requestedBy: document.requisitioner ?? '—',
        department: document.department ?? '—',
        lines,
        padRowCount,
        specialInstructions: humanRemarks || '—',
        totalNet: (0, document_pdf_formatters_1.formatDocumentMoney)(totalNet),
        delivery: (0, document_pdf_formatters_1.formatDocumentMoney)(deliveryAmt),
        taxTotal: (0, document_pdf_formatters_1.formatDocumentMoney)(vatAmt),
        grandTotal: (0, document_pdf_formatters_1.formatDocumentMoney)(grandTotal),
    };
}
function purchaseOrderPdfFilename(poNumber) {
    return (0, document_pdf_formatters_1.documentPdfFilename)('purchase-order', poNumber);
}
function renderPurchaseOrderHtml(viewModel) {
    return (0, purchase_order_template_1.buildPurchaseOrderHtml)(viewModel);
}
async function resolvePurchaseOrderCompanyId(prisma, shopId) {
    const shopRow = await prisma.shop.findUnique({
        where: { id: shopId },
        select: { companyId: true },
    });
    if (!shopRow?.companyId) {
        throw new common_1.BadRequestException('Shop not linked to a company');
    }
    return shopRow.companyId;
}
async function loadPurchaseOrderForPdf(prisma, id) {
    const po = await prisma.purchaseOrderHeader.findUnique({
        where: { id },
        include: {
            shop: { select: { shopName: true } },
            items: { include: { product: { select: { productCode: true, description: true } } } },
        },
    });
    if (!po)
        throw new common_1.NotFoundException('Purchase order not found');
    return po;
}
//# sourceMappingURL=purchase-order.builder.js.map