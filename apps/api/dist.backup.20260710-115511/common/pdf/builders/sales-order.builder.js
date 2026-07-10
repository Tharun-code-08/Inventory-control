"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.loadSalesOrderForPdf = loadSalesOrderForPdf;
exports.buildSalesOrderPdfViewModel = buildSalesOrderPdfViewModel;
exports.salesOrderPdfFilename = salesOrderPdfFilename;
exports.renderSalesOrderHtml = renderSalesOrderHtml;
const common_1 = require("@nestjs/common");
const client_1 = require("@prisma/client");
const gst_supply_type_1 = require("../../utils/gst-supply-type");
const document_pdf_formatters_1 = require("../document-pdf.formatters");
const gst_sales_document_template_1 = require("../templates/gst-sales-document.template");
const shop_company_1 = require("./shop-company");
const MIN_ROWS = 6;
function parseRemarksField(remarks, pattern) {
    if (!remarks)
        return undefined;
    const match = remarks.match(pattern);
    return match?.[1]?.split('\n')[0]?.trim() || undefined;
}
function parseSalesOrderRemarks(remarks) {
    const paymentTerms = parseRemarksField(remarks, /Payment terms:\s*(.+)/i);
    const customerPoNumber = parseRemarksField(remarks, /(?:Customer PO|PO #|PO No\.?):\s*(.+)/i) ??
        parseRemarksField(remarks, /PO:\s*(.+)/i);
    const subject = parseRemarksField(remarks, /(?:Subject|Sub):\s*(.+)/i);
    let notes = remarks?.trim() ?? '';
    notes = notes
        .replace(/Payment terms:\s*.+/i, '')
        .replace(/(?:Customer PO|PO #|PO No\.?|PO):\s*.+/i, '')
        .replace(/(?:Subject|Sub):\s*.+/i, '')
        .replace(/Delivery:\s*.+/i, '')
        .trim();
    return { paymentTerms, customerPoNumber, subject, notes: notes || undefined };
}
function placeOfSupplyFromCustomer(customer) {
    const state = customer.state?.trim();
    const stateCode = customer.taxId?.trim().slice(0, 2);
    if (!state && !stateCode)
        return undefined;
    if (state && stateCode)
        return `${state} (${stateCode})`;
    return state ?? stateCode;
}
function formatGstPercent(value) {
    return value > 0 ? `${(0, document_pdf_formatters_1.formatDocumentMoney)(value)}%` : '—';
}
function formatGstAmount(value) {
    return value > 0 ? (0, document_pdf_formatters_1.formatDocumentAmount)(value) : '—';
}
async function loadSalesOrderForPdf(prisma, id) {
    const order = await prisma.salesOrderHeader.findUnique({
        where: { id },
        include: {
            customer: true,
            shop: { select: { shopName: true } },
            salesQuotation: { select: { quoteNumber: true } },
            items: {
                include: {
                    product: { select: { productCode: true, description: true, hsnCode: true } },
                },
            },
        },
    });
    if (!order)
        throw new common_1.NotFoundException('Sales order not found');
    return order;
}
async function buildSalesOrderPdfViewModel(prisma, order) {
    const ctx = await (0, shop_company_1.loadShopCompanyContext)(prisma, order.shopId);
    const parsedRemarks = parseSalesOrderRemarks(order.remarks);
    const isInterState = (0, gst_supply_type_1.isInterStateSupply)(order.gstSupplyType ?? client_1.GstSupplyType.INTRA_STATE);
    const lines = order.items.map((item) => {
        const taxAmount = Number(item.taxAmount);
        const lineBase = Number(item.lineValue) - taxAmount;
        const cgstRate = Number(item.cgstRate ?? 0);
        const sgstRate = Number(item.sgstRate ?? 0);
        const igstRate = Number(item.igstRate ?? 0);
        const rateSum = cgstRate + sgstRate;
        const cgstAmount = isInterState || rateSum <= 0 ? 0 : (taxAmount * cgstRate) / rateSum;
        const sgstAmount = isInterState ? 0 : taxAmount - cgstAmount;
        const igstAmount = isInterState ? taxAmount : 0;
        return {
            description: item.product?.description ?? '—',
            hsnSac: item.product?.hsnCode ?? '—',
            qty: (0, document_pdf_formatters_1.formatDocumentMoney)(Number(item.quantity)),
            unitPrice: (0, document_pdf_formatters_1.formatDocumentAmount)(Number(item.unitPrice)),
            cgstPercent: formatGstPercent(cgstRate),
            cgstAmount: formatGstAmount(cgstAmount),
            sgstPercent: formatGstPercent(sgstRate),
            sgstAmount: formatGstAmount(sgstAmount),
            igstPercent: formatGstPercent(igstRate),
            igstAmount: formatGstAmount(igstAmount),
            amount: (0, document_pdf_formatters_1.formatDocumentAmount)(lineBase),
        };
    });
    const subtotal = Number(order.subtotalBeforeTax ?? 0) ||
        order.items.reduce((sum, item) => sum + Number(item.lineValue) - Number(item.taxAmount), 0);
    const discount = Number(order.discountAmount);
    const tax = Number(order.taxAmount);
    const storedTotal = order.totalValue != null ? Number(order.totalValue) : null;
    const computedTotal = subtotal - discount + tax;
    const grandTotal = storedTotal != null && storedTotal > 0 ? storedTotal : computedTotal;
    const cgstTotal = Number(order.totalCgst ?? 0) || (isInterState ? 0 : tax / 2);
    const sgstTotal = Number(order.totalSgst ?? 0) || (isInterState ? 0 : tax / 2);
    const igstTotal = Number(order.totalIgst ?? 0) || (isInterState ? tax : 0);
    const dominantIntra = order.items.find((item) => Number(item.cgstRate) > 0 || Number(item.sgstRate) > 0);
    const dominantInter = order.items.find((item) => Number(item.igstRate) > 0);
    const halfRate = dominantIntra
        ? (Number(dominantIntra.cgstRate) + Number(dominantIntra.sgstRate)) / 2
        : 0;
    const igstRateDominant = dominantInter ? Number(dominantInter.igstRate) : 0;
    const generatedAt = (0, document_pdf_formatters_1.formatDocumentDateTime)(new Date());
    let generatedBy = 'SoftdigitIMS';
    if (order.createdById) {
        const creator = await prisma.user.findUnique({
            where: { id: order.createdById },
            select: { name: true },
        });
        if (creator?.name)
            generatedBy = creator.name;
    }
    return {
        documentTitle: 'SALES ORDER',
        documentNumber: order.soNumber,
        documentDate: (0, document_pdf_formatters_1.formatDocumentDate)(order.orderDate),
        terms: parsedRemarks.paymentTerms,
        customerPoNumber: parsedRemarks.customerPoNumber ?? order.salesQuotation?.quoteNumber,
        placeOfSupply: order.customer ? placeOfSupplyFromCustomer(order.customer) : undefined,
        supplyTypeLabel: isInterState ? 'Inter-state supply (IGST)' : 'Intra-state supply (CGST + SGST)',
        isInterState,
        companyName: ctx.companyName,
        companyLines: ctx.companyLines,
        partyName: order.customer?.customerName ?? '—',
        partyLines: order.customer ? (0, shop_company_1.customerPartyLines)(order.customer) : [],
        subject: parsedRemarks.subject,
        lines,
        padRowCount: Math.max(0, MIN_ROWS - lines.length),
        subtotal: (0, document_pdf_formatters_1.formatDocumentAmount)(subtotal - discount),
        cgstTotal: (0, document_pdf_formatters_1.formatDocumentAmount)(cgstTotal),
        sgstTotal: (0, document_pdf_formatters_1.formatDocumentAmount)(sgstTotal),
        igstTotal: (0, document_pdf_formatters_1.formatDocumentAmount)(igstTotal),
        cgstRateLabel: halfRate > 0 ? `CGST ${(0, document_pdf_formatters_1.formatDocumentMoney)(halfRate)}%` : 'CGST',
        sgstRateLabel: halfRate > 0 ? `SGST ${(0, document_pdf_formatters_1.formatDocumentMoney)(halfRate)}%` : 'SGST',
        igstRateLabel: igstRateDominant > 0 ? `IGST ${(0, document_pdf_formatters_1.formatDocumentMoney)(igstRateDominant)}%` : 'IGST',
        totalDue: (0, document_pdf_formatters_1.formatDocumentAmount)(grandTotal),
        totalInWords: (0, document_pdf_formatters_1.amountInIndianWords)(grandTotal),
        notes: parsedRemarks.notes,
        termsAndConditions: parsedRemarks.paymentTerms
            ? `1. Payment is ${parsedRemarks.paymentTerms.toLowerCase()}`
            : undefined,
        generatedAt,
        generatedBy,
        footerNote: `Generated on ${generatedAt} by ${generatedBy} | SO ${order.soNumber}`,
    };
}
function salesOrderPdfFilename(soNumber) {
    return (0, document_pdf_formatters_1.documentPdfFilename)('sales-order', soNumber);
}
function renderSalesOrderHtml(viewModel) {
    return (0, gst_sales_document_template_1.buildGstSalesDocumentHtml)(viewModel);
}
//# sourceMappingURL=sales-order.builder.js.map