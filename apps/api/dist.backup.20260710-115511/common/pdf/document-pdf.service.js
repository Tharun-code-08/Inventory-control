"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.DocumentPdfService = void 0;
const common_1 = require("@nestjs/common");
const client_1 = require("@prisma/client");
const shop_scope_1 = require("../utils/shop-scope");
const prisma_service_1 = require("../../prisma/prisma.service");
const branding_resolver_service_1 = require("../branding/branding-resolver.service");
const html_to_pdf_service_1 = require("./html-to-pdf.service");
const document_pdf_types_1 = require("./document-pdf.types");
const purchase_order_builder_1 = require("./builders/purchase-order.builder");
const invoice_builder_1 = require("./builders/invoice.builder");
const sales_order_builder_1 = require("./builders/sales-order.builder");
const supplier_bill_builder_1 = require("./builders/supplier-bill.builder");
const supplier_payment_builder_1 = require("./builders/supplier-payment.builder");
const payment_receipt_builder_1 = require("./builders/payment-receipt.builder");
const goods_receipt_builder_1 = require("./builders/goods-receipt.builder");
const goods_issue_builder_1 = require("./builders/goods-issue.builder");
const goods_return_builder_1 = require("./builders/goods-return.builder");
const sales_quotation_builder_1 = require("./builders/sales-quotation.builder");
const READ_PERMISSION_BY_KIND = {
    'purchase-order': 'purchase_order:read',
    invoice: 'shop:read',
    'sales-order': 'shop:read',
    'supplier-bill': 'shop:read',
    'supplier-payment': 'shop:read',
    payment: 'shop:read',
    'goods-receipt': 'goods_receipt:read',
    'goods-issue': 'goods_issue:read',
    'goods-return': 'shop:read',
    'sales-quotation': 'shop:read',
};
let DocumentPdfService = class DocumentPdfService {
    prisma;
    branding;
    constructor(prisma, branding) {
        this.prisma = prisma;
        this.branding = branding;
    }
    async shopNameForId(shopId) {
        const shop = await this.prisma.shop.findUnique({ where: { id: shopId }, select: { shopName: true } });
        return shop?.shopName ?? 'Shop';
    }
    buildSnapshot(branding, shopName, templateVersion) {
        return {
            companyName: branding.companyName,
            shopName,
            logoVersion: branding.logoVersion ?? null,
            brandingVersion: branding.brandingVersion ?? null,
            templateVersion: templateVersion ?? null,
            generatedAt: new Date().toISOString(),
        };
    }
    async persistSnapshot(kind, id, snapshot, templateVersion) {
        const data = {
            brandingSnapshot: snapshot,
            templateVersion: templateVersion ?? undefined,
        };
        switch (kind) {
            case 'purchase-order':
                await this.prisma.purchaseOrderHeader.update({ where: { id }, data });
                return;
            case 'invoice':
                await this.prisma.invoiceHeader.update({ where: { id }, data });
                return;
            case 'sales-order':
                await this.prisma.salesOrderHeader.update({ where: { id }, data });
                return;
            case 'supplier-bill':
                await this.prisma.supplierBillHeader.update({ where: { id }, data });
                return;
            case 'supplier-payment':
                await this.prisma.supplierPayment.update({ where: { id }, data });
                return;
            case 'payment':
                await this.prisma.paymentReceipt.update({ where: { id }, data });
                return;
            case 'goods-receipt':
                await this.prisma.goodsReceiptHeader.update({ where: { id }, data });
                return;
            case 'goods-issue':
                await this.prisma.goodsIssueHeader.update({ where: { id }, data });
                return;
            case 'goods-return':
                await this.prisma.supplierReturn.update({ where: { id }, data });
                return;
            case 'sales-quotation':
                await this.prisma.salesQuotationHeader.update({ where: { id }, data });
                return;
            default:
                return;
        }
    }
    async applyBranding(args) {
        const snapshot = args.brandingMode === client_1.BrandingMode.SNAPSHOT ? args.brandingSnapshot ?? null : null;
        const branding = await this.branding.resolveForShop(args.shopId, { snapshot });
        args.viewModel.brandingLogoUrl = branding.logoUrl ?? null;
        args.viewModel.brandingInitials = branding.initials;
        if ('sealUrl' in args.viewModel) {
            args.viewModel.sealUrl = branding.sealUrl ?? null;
        }
        if ('signatureUrl' in args.viewModel) {
            args.viewModel.signatureUrl = branding.signatureUrl ?? null;
        }
        if ('footerNote' in args.viewModel) {
            const existing = args.viewModel.footerNote?.trim();
            args.viewModel.footerNote =
                branding.footerText?.trim() ||
                    existing ||
                    'This document was generated by SoftdigitIMS.';
        }
        if (snapshot?.companyName) {
            args.viewModel.companyName = snapshot.companyName;
            const buyer = args.viewModel;
            if (buyer.buyerName) {
                buyer.buyerName = snapshot.companyName;
            }
        }
        if (args.brandingMode === client_1.BrandingMode.SNAPSHOT) {
            const shopName = snapshot?.shopName ?? (await this.shopNameForId(args.shopId));
            const nextSnapshot = snapshot ?? this.buildSnapshot(branding, shopName, args.templateVersion);
            if (!args.brandingSnapshot) {
                await this.persistSnapshot(args.kind, args.id, nextSnapshot, branding.brandingVersion ?? null);
            }
        }
    }
    assertCanRead(user, kind) {
        const required = READ_PERMISSION_BY_KIND[kind];
        if (!required)
            return;
        const role = user.role;
        if (role === client_1.RoleName.OWNER || role === client_1.RoleName.ADMIN)
            return;
        if (!user.permissions?.includes(required)) {
            throw new common_1.ForbiddenException('Missing permission');
        }
    }
    async assertDocumentAccess(user, kind, id) {
        if (!(0, document_pdf_types_1.isDocumentPdfKind)(kind)) {
            throw new common_1.BadRequestException(`Unsupported document kind: ${kind}`);
        }
        this.assertCanRead(user, kind);
        switch (kind) {
            case 'purchase-order': {
                const po = await (0, purchase_order_builder_1.loadPurchaseOrderForPdf)(this.prisma, id);
                (0, shop_scope_1.assertShopScope)(user, po.shopId);
                return;
            }
            case 'invoice': {
                const invoice = await (0, invoice_builder_1.loadInvoiceForPdf)(this.prisma, id);
                (0, shop_scope_1.assertShopScope)(user, invoice.shopId);
                return;
            }
            case 'sales-order': {
                const order = await (0, sales_order_builder_1.loadSalesOrderForPdf)(this.prisma, id);
                (0, shop_scope_1.assertShopScope)(user, order.shopId);
                return;
            }
            case 'supplier-bill': {
                const bill = await (0, supplier_bill_builder_1.loadSupplierBillForPdf)(this.prisma, id);
                (0, shop_scope_1.assertShopScope)(user, bill.shopId);
                return;
            }
            case 'supplier-payment': {
                const payment = await (0, supplier_payment_builder_1.loadSupplierPaymentForPdf)(this.prisma, id);
                (0, shop_scope_1.assertShopScope)(user, payment.shopId);
                return;
            }
            case 'payment': {
                const payment = await (0, payment_receipt_builder_1.loadPaymentReceiptForPdf)(this.prisma, id);
                (0, shop_scope_1.assertShopScope)(user, payment.shopId);
                return;
            }
            case 'goods-receipt': {
                const gr = await (0, goods_receipt_builder_1.loadGoodsReceiptForPdf)(this.prisma, id);
                (0, shop_scope_1.assertShopScope)(user, gr.shopId);
                return;
            }
            case 'goods-issue': {
                const gi = await (0, goods_issue_builder_1.loadGoodsIssueForPdf)(this.prisma, id);
                (0, shop_scope_1.assertShopScope)(user, gi.shopId);
                return;
            }
            case 'goods-return': {
                const ret = await (0, goods_return_builder_1.loadGoodsReturnForPdf)(this.prisma, id);
                (0, shop_scope_1.assertShopScope)(user, ret.shopId);
                return;
            }
            case 'sales-quotation': {
                const quote = await (0, sales_quotation_builder_1.loadSalesQuotationForPdf)(this.prisma, id);
                (0, shop_scope_1.assertShopScope)(user, quote.shopId);
                return;
            }
            default:
                throw new common_1.BadRequestException(`Document access check not implemented for: ${kind}`);
        }
    }
    async renderPdf(user, kind, id) {
        if (!(0, document_pdf_types_1.isDocumentPdfKind)(kind)) {
            throw new common_1.BadRequestException(`Unsupported document kind: ${kind}`);
        }
        this.assertCanRead(user, kind);
        switch (kind) {
            case 'purchase-order':
                return this.renderPurchaseOrderPdf(user, id);
            case 'invoice':
                return this.renderInvoicePdf(user, id);
            case 'sales-order':
                return this.renderSalesOrderPdf(user, id);
            case 'supplier-bill':
                return this.renderSupplierBillPdf(user, id);
            case 'supplier-payment':
                return this.renderSupplierPaymentPdf(user, id);
            case 'payment':
                return this.renderPaymentReceiptPdf(user, id);
            case 'goods-receipt':
                return this.renderGoodsReceiptPdf(user, id);
            case 'goods-issue':
                return this.renderGoodsIssuePdf(user, id);
            case 'goods-return':
                return this.renderGoodsReturnPdf(user, id);
            case 'sales-quotation':
                return this.renderSalesQuotationPdf(user, id);
            default:
                throw new common_1.BadRequestException(`PDF not yet implemented for: ${kind}`);
        }
    }
    async renderPurchaseOrderPdf(user, id) {
        const po = await (0, purchase_order_builder_1.loadPurchaseOrderForPdf)(this.prisma, id);
        (0, shop_scope_1.assertShopScope)(user, po.shopId);
        const companyId = await (0, purchase_order_builder_1.resolvePurchaseOrderCompanyId)(this.prisma, po.shopId);
        const viewModel = await (0, purchase_order_builder_1.buildPurchaseOrderPdfViewModel)(this.prisma, po, companyId);
        await this.applyBranding({
            kind: 'purchase-order',
            id: po.id,
            shopId: po.shopId,
            brandingMode: po.brandingMode ?? client_1.BrandingMode.SNAPSHOT,
            brandingSnapshot: po.brandingSnapshot,
            templateVersion: po.templateVersion,
            viewModel,
        });
        const html = (0, purchase_order_builder_1.renderPurchaseOrderHtml)(viewModel);
        const buffer = await (0, html_to_pdf_service_1.renderHtmlToPdfBuffer)(html);
        return {
            buffer,
            filename: (0, purchase_order_builder_1.purchaseOrderPdfFilename)(po.poNumber),
            contentType: 'application/pdf',
        };
    }
    async renderInvoicePdf(user, id) {
        const invoice = await (0, invoice_builder_1.loadInvoiceForPdf)(this.prisma, id);
        (0, shop_scope_1.assertShopScope)(user, invoice.shopId);
        const viewModel = await (0, invoice_builder_1.buildInvoicePdfViewModel)(this.prisma, invoice);
        await this.applyBranding({
            kind: 'invoice',
            id: invoice.id,
            shopId: invoice.shopId,
            brandingMode: invoice.brandingMode ?? client_1.BrandingMode.SNAPSHOT,
            brandingSnapshot: invoice.brandingSnapshot,
            templateVersion: invoice.templateVersion,
            viewModel,
        });
        const buffer = await (0, html_to_pdf_service_1.renderHtmlToPdfBuffer)((0, invoice_builder_1.renderInvoiceHtml)(viewModel));
        return {
            buffer,
            filename: (0, invoice_builder_1.invoicePdfFilename)(invoice.invoiceNumber),
            contentType: 'application/pdf',
        };
    }
    async renderSalesOrderPdf(user, id) {
        const order = await (0, sales_order_builder_1.loadSalesOrderForPdf)(this.prisma, id);
        (0, shop_scope_1.assertShopScope)(user, order.shopId);
        const viewModel = await (0, sales_order_builder_1.buildSalesOrderPdfViewModel)(this.prisma, order);
        await this.applyBranding({
            kind: 'sales-order',
            id: order.id,
            shopId: order.shopId,
            brandingMode: order.brandingMode ?? client_1.BrandingMode.SNAPSHOT,
            brandingSnapshot: order.brandingSnapshot,
            templateVersion: order.templateVersion,
            viewModel,
        });
        const buffer = await (0, html_to_pdf_service_1.renderHtmlToPdfBuffer)((0, sales_order_builder_1.renderSalesOrderHtml)(viewModel));
        return {
            buffer,
            filename: (0, sales_order_builder_1.salesOrderPdfFilename)(order.soNumber),
            contentType: 'application/pdf',
        };
    }
    async renderSupplierBillPdf(user, id) {
        const bill = await (0, supplier_bill_builder_1.loadSupplierBillForPdf)(this.prisma, id);
        (0, shop_scope_1.assertShopScope)(user, bill.shopId);
        const viewModel = await (0, supplier_bill_builder_1.buildSupplierBillPdfViewModel)(this.prisma, bill);
        await this.applyBranding({
            kind: 'supplier-bill',
            id: bill.id,
            shopId: bill.shopId,
            brandingMode: bill.brandingMode ?? client_1.BrandingMode.SNAPSHOT,
            brandingSnapshot: bill.brandingSnapshot,
            templateVersion: bill.templateVersion,
            viewModel,
        });
        const buffer = await (0, html_to_pdf_service_1.renderHtmlToPdfBuffer)((0, supplier_bill_builder_1.renderSupplierBillHtml)(viewModel));
        return {
            buffer,
            filename: (0, supplier_bill_builder_1.supplierBillPdfFilename)(bill.billNumber),
            contentType: 'application/pdf',
        };
    }
    async renderSupplierPaymentPdf(user, id) {
        const payment = await (0, supplier_payment_builder_1.loadSupplierPaymentForPdf)(this.prisma, id);
        (0, shop_scope_1.assertShopScope)(user, payment.shopId);
        const viewModel = await (0, supplier_payment_builder_1.buildSupplierPaymentPdfViewModel)(this.prisma, payment);
        await this.applyBranding({
            kind: 'supplier-payment',
            id: payment.id,
            shopId: payment.shopId,
            brandingMode: payment.brandingMode ?? client_1.BrandingMode.SNAPSHOT,
            brandingSnapshot: payment.brandingSnapshot,
            templateVersion: payment.templateVersion,
            viewModel,
        });
        const buffer = await (0, html_to_pdf_service_1.renderHtmlToPdfBuffer)((0, supplier_payment_builder_1.renderSupplierPaymentHtml)(viewModel));
        return {
            buffer,
            filename: (0, supplier_payment_builder_1.supplierPaymentPdfFilename)(payment.paymentNumber),
            contentType: 'application/pdf',
        };
    }
    async renderPaymentReceiptPdf(user, id) {
        const payment = await (0, payment_receipt_builder_1.loadPaymentReceiptForPdf)(this.prisma, id);
        (0, shop_scope_1.assertShopScope)(user, payment.shopId);
        const viewModel = await (0, payment_receipt_builder_1.buildPaymentReceiptPdfViewModel)(this.prisma, payment);
        await this.applyBranding({
            kind: 'payment',
            id: payment.id,
            shopId: payment.shopId,
            brandingMode: payment.brandingMode ?? client_1.BrandingMode.SNAPSHOT,
            brandingSnapshot: payment.brandingSnapshot,
            templateVersion: payment.templateVersion,
            viewModel,
        });
        const buffer = await (0, html_to_pdf_service_1.renderHtmlToPdfBuffer)((0, payment_receipt_builder_1.renderPaymentReceiptHtml)(viewModel));
        return {
            buffer,
            filename: (0, payment_receipt_builder_1.paymentReceiptPdfFilename)(payment.receiptNumber),
            contentType: 'application/pdf',
        };
    }
    async renderPurchaseOrderPdfById(id) {
        const po = await (0, purchase_order_builder_1.loadPurchaseOrderForPdf)(this.prisma, id);
        const companyId = await (0, purchase_order_builder_1.resolvePurchaseOrderCompanyId)(this.prisma, po.shopId);
        const viewModel = await (0, purchase_order_builder_1.buildPurchaseOrderPdfViewModel)(this.prisma, po, companyId);
        await this.applyBranding({
            kind: 'purchase-order',
            id: po.id,
            shopId: po.shopId,
            brandingMode: po.brandingMode ?? client_1.BrandingMode.SNAPSHOT,
            brandingSnapshot: po.brandingSnapshot,
            templateVersion: po.templateVersion,
            viewModel,
        });
        const html = (0, purchase_order_builder_1.renderPurchaseOrderHtml)(viewModel);
        const buffer = await (0, html_to_pdf_service_1.renderHtmlToPdfBuffer)(html);
        return {
            buffer,
            filename: (0, purchase_order_builder_1.purchaseOrderPdfFilename)(po.poNumber),
            contentType: 'application/pdf',
        };
    }
    async renderInvoicePdfById(id) {
        const invoice = await (0, invoice_builder_1.loadInvoiceForPdf)(this.prisma, id);
        const viewModel = await (0, invoice_builder_1.buildInvoicePdfViewModel)(this.prisma, invoice);
        await this.applyBranding({
            kind: 'invoice',
            id: invoice.id,
            shopId: invoice.shopId,
            brandingMode: invoice.brandingMode ?? client_1.BrandingMode.SNAPSHOT,
            brandingSnapshot: invoice.brandingSnapshot,
            templateVersion: invoice.templateVersion,
            viewModel,
        });
        const buffer = await (0, html_to_pdf_service_1.renderHtmlToPdfBuffer)((0, invoice_builder_1.renderInvoiceHtml)(viewModel));
        return {
            buffer,
            filename: (0, invoice_builder_1.invoicePdfFilename)(invoice.invoiceNumber),
            contentType: 'application/pdf',
        };
    }
    async renderSalesOrderPdfById(id) {
        const order = await (0, sales_order_builder_1.loadSalesOrderForPdf)(this.prisma, id);
        const viewModel = await (0, sales_order_builder_1.buildSalesOrderPdfViewModel)(this.prisma, order);
        await this.applyBranding({
            kind: 'sales-order',
            id: order.id,
            shopId: order.shopId,
            brandingMode: order.brandingMode ?? client_1.BrandingMode.SNAPSHOT,
            brandingSnapshot: order.brandingSnapshot,
            templateVersion: order.templateVersion,
            viewModel,
        });
        const buffer = await (0, html_to_pdf_service_1.renderHtmlToPdfBuffer)((0, sales_order_builder_1.renderSalesOrderHtml)(viewModel));
        return {
            buffer,
            filename: (0, sales_order_builder_1.salesOrderPdfFilename)(order.soNumber),
            contentType: 'application/pdf',
        };
    }
    async renderSupplierBillPdfById(id) {
        const bill = await (0, supplier_bill_builder_1.loadSupplierBillForPdf)(this.prisma, id);
        const viewModel = await (0, supplier_bill_builder_1.buildSupplierBillPdfViewModel)(this.prisma, bill);
        await this.applyBranding({
            kind: 'supplier-bill',
            id: bill.id,
            shopId: bill.shopId,
            brandingMode: bill.brandingMode ?? client_1.BrandingMode.SNAPSHOT,
            brandingSnapshot: bill.brandingSnapshot,
            templateVersion: bill.templateVersion,
            viewModel,
        });
        const buffer = await (0, html_to_pdf_service_1.renderHtmlToPdfBuffer)((0, supplier_bill_builder_1.renderSupplierBillHtml)(viewModel));
        return {
            buffer,
            filename: (0, supplier_bill_builder_1.supplierBillPdfFilename)(bill.billNumber),
            contentType: 'application/pdf',
        };
    }
    async renderSupplierPaymentPdfById(id) {
        const payment = await (0, supplier_payment_builder_1.loadSupplierPaymentForPdf)(this.prisma, id);
        const viewModel = await (0, supplier_payment_builder_1.buildSupplierPaymentPdfViewModel)(this.prisma, payment);
        await this.applyBranding({
            kind: 'supplier-payment',
            id: payment.id,
            shopId: payment.shopId,
            brandingMode: payment.brandingMode ?? client_1.BrandingMode.SNAPSHOT,
            brandingSnapshot: payment.brandingSnapshot,
            templateVersion: payment.templateVersion,
            viewModel,
        });
        const buffer = await (0, html_to_pdf_service_1.renderHtmlToPdfBuffer)((0, supplier_payment_builder_1.renderSupplierPaymentHtml)(viewModel));
        return {
            buffer,
            filename: (0, supplier_payment_builder_1.supplierPaymentPdfFilename)(payment.paymentNumber),
            contentType: 'application/pdf',
        };
    }
    async renderPaymentReceiptPdfById(id) {
        const payment = await (0, payment_receipt_builder_1.loadPaymentReceiptForPdf)(this.prisma, id);
        const viewModel = await (0, payment_receipt_builder_1.buildPaymentReceiptPdfViewModel)(this.prisma, payment);
        await this.applyBranding({
            kind: 'payment',
            id: payment.id,
            shopId: payment.shopId,
            brandingMode: payment.brandingMode ?? client_1.BrandingMode.SNAPSHOT,
            brandingSnapshot: payment.brandingSnapshot,
            templateVersion: payment.templateVersion,
            viewModel,
        });
        const buffer = await (0, html_to_pdf_service_1.renderHtmlToPdfBuffer)((0, payment_receipt_builder_1.renderPaymentReceiptHtml)(viewModel));
        return {
            buffer,
            filename: (0, payment_receipt_builder_1.paymentReceiptPdfFilename)(payment.receiptNumber),
            contentType: 'application/pdf',
        };
    }
    async renderGoodsReceiptPdf(user, id) {
        const gr = await (0, goods_receipt_builder_1.loadGoodsReceiptForPdf)(this.prisma, id);
        (0, shop_scope_1.assertShopScope)(user, gr.shopId);
        const viewModel = await (0, goods_receipt_builder_1.buildGoodsReceiptPdfViewModel)(this.prisma, gr);
        await this.applyBranding({
            kind: 'goods-receipt',
            id: gr.id,
            shopId: gr.shopId,
            brandingMode: gr.brandingMode ?? client_1.BrandingMode.SNAPSHOT,
            brandingSnapshot: gr.brandingSnapshot,
            templateVersion: gr.templateVersion,
            viewModel,
        });
        const buffer = await (0, html_to_pdf_service_1.renderHtmlToPdfBuffer)((0, goods_receipt_builder_1.renderGoodsReceiptHtml)(viewModel));
        return { buffer, filename: (0, goods_receipt_builder_1.goodsReceiptPdfFilename)(gr.grNumber), contentType: 'application/pdf' };
    }
    async renderGoodsIssuePdf(user, id) {
        const gi = await (0, goods_issue_builder_1.loadGoodsIssueForPdf)(this.prisma, id);
        (0, shop_scope_1.assertShopScope)(user, gi.shopId);
        const viewModel = await (0, goods_issue_builder_1.buildGoodsIssuePdfViewModel)(this.prisma, gi);
        await this.applyBranding({
            kind: 'goods-issue',
            id: gi.id,
            shopId: gi.shopId,
            brandingMode: gi.brandingMode ?? client_1.BrandingMode.SNAPSHOT,
            brandingSnapshot: gi.brandingSnapshot,
            templateVersion: gi.templateVersion,
            viewModel,
        });
        const buffer = await (0, html_to_pdf_service_1.renderHtmlToPdfBuffer)((0, goods_issue_builder_1.renderGoodsIssueHtml)(viewModel));
        return { buffer, filename: (0, goods_issue_builder_1.goodsIssuePdfFilename)(gi.giNumber), contentType: 'application/pdf' };
    }
    async renderGoodsReturnPdf(user, id) {
        const ret = await (0, goods_return_builder_1.loadGoodsReturnForPdf)(this.prisma, id);
        (0, shop_scope_1.assertShopScope)(user, ret.shopId);
        const viewModel = await (0, goods_return_builder_1.buildGoodsReturnPdfViewModel)(this.prisma, ret);
        await this.applyBranding({
            kind: 'goods-return',
            id: ret.id,
            shopId: ret.shopId,
            brandingMode: ret.brandingMode ?? client_1.BrandingMode.SNAPSHOT,
            brandingSnapshot: ret.brandingSnapshot,
            templateVersion: ret.templateVersion,
            viewModel,
        });
        const buffer = await (0, html_to_pdf_service_1.renderHtmlToPdfBuffer)((0, goods_return_builder_1.renderGoodsReturnHtml)(viewModel));
        return { buffer, filename: (0, goods_return_builder_1.goodsReturnPdfFilename)(ret.returnNumber), contentType: 'application/pdf' };
    }
    async renderSalesQuotationPdf(user, id) {
        const quote = await (0, sales_quotation_builder_1.loadSalesQuotationForPdf)(this.prisma, id);
        (0, shop_scope_1.assertShopScope)(user, quote.shopId);
        const viewModel = await (0, sales_quotation_builder_1.buildSalesQuotationPdfViewModel)(this.prisma, quote);
        await this.applyBranding({
            kind: 'sales-quotation',
            id: quote.id,
            shopId: quote.shopId,
            brandingMode: quote.brandingMode ?? client_1.BrandingMode.LIVE,
            brandingSnapshot: quote.brandingSnapshot,
            templateVersion: quote.templateVersion,
            viewModel,
        });
        const buffer = await (0, html_to_pdf_service_1.renderHtmlToPdfBuffer)((0, sales_quotation_builder_1.renderSalesQuotationHtml)(viewModel));
        return { buffer, filename: (0, sales_quotation_builder_1.salesQuotationPdfFilename)(quote.quoteNumber), contentType: 'application/pdf' };
    }
    async renderGoodsReceiptPdfById(id) {
        const gr = await (0, goods_receipt_builder_1.loadGoodsReceiptForPdf)(this.prisma, id);
        const viewModel = await (0, goods_receipt_builder_1.buildGoodsReceiptPdfViewModel)(this.prisma, gr);
        await this.applyBranding({
            kind: 'goods-receipt',
            id: gr.id,
            shopId: gr.shopId,
            brandingMode: gr.brandingMode ?? client_1.BrandingMode.SNAPSHOT,
            brandingSnapshot: gr.brandingSnapshot,
            templateVersion: gr.templateVersion,
            viewModel,
        });
        const buffer = await (0, html_to_pdf_service_1.renderHtmlToPdfBuffer)((0, goods_receipt_builder_1.renderGoodsReceiptHtml)(viewModel));
        return { buffer, filename: (0, goods_receipt_builder_1.goodsReceiptPdfFilename)(gr.grNumber), contentType: 'application/pdf' };
    }
    async renderGoodsIssuePdfById(id) {
        const gi = await (0, goods_issue_builder_1.loadGoodsIssueForPdf)(this.prisma, id);
        const viewModel = await (0, goods_issue_builder_1.buildGoodsIssuePdfViewModel)(this.prisma, gi);
        await this.applyBranding({
            kind: 'goods-issue',
            id: gi.id,
            shopId: gi.shopId,
            brandingMode: gi.brandingMode ?? client_1.BrandingMode.SNAPSHOT,
            brandingSnapshot: gi.brandingSnapshot,
            templateVersion: gi.templateVersion,
            viewModel,
        });
        const buffer = await (0, html_to_pdf_service_1.renderHtmlToPdfBuffer)((0, goods_issue_builder_1.renderGoodsIssueHtml)(viewModel));
        return { buffer, filename: (0, goods_issue_builder_1.goodsIssuePdfFilename)(gi.giNumber), contentType: 'application/pdf' };
    }
    async renderGoodsReturnPdfById(id) {
        const ret = await (0, goods_return_builder_1.loadGoodsReturnForPdf)(this.prisma, id);
        const viewModel = await (0, goods_return_builder_1.buildGoodsReturnPdfViewModel)(this.prisma, ret);
        await this.applyBranding({
            kind: 'goods-return',
            id: ret.id,
            shopId: ret.shopId,
            brandingMode: ret.brandingMode ?? client_1.BrandingMode.SNAPSHOT,
            brandingSnapshot: ret.brandingSnapshot,
            templateVersion: ret.templateVersion,
            viewModel,
        });
        const buffer = await (0, html_to_pdf_service_1.renderHtmlToPdfBuffer)((0, goods_return_builder_1.renderGoodsReturnHtml)(viewModel));
        return { buffer, filename: (0, goods_return_builder_1.goodsReturnPdfFilename)(ret.returnNumber), contentType: 'application/pdf' };
    }
    async renderSalesQuotationPdfById(id) {
        const quote = await (0, sales_quotation_builder_1.loadSalesQuotationForPdf)(this.prisma, id);
        const viewModel = await (0, sales_quotation_builder_1.buildSalesQuotationPdfViewModel)(this.prisma, quote);
        await this.applyBranding({
            kind: 'sales-quotation',
            id: quote.id,
            shopId: quote.shopId,
            brandingMode: quote.brandingMode ?? client_1.BrandingMode.LIVE,
            brandingSnapshot: quote.brandingSnapshot,
            templateVersion: quote.templateVersion,
            viewModel,
        });
        const buffer = await (0, html_to_pdf_service_1.renderHtmlToPdfBuffer)((0, sales_quotation_builder_1.renderSalesQuotationHtml)(viewModel));
        return { buffer, filename: (0, sales_quotation_builder_1.salesQuotationPdfFilename)(quote.quoteNumber), contentType: 'application/pdf' };
    }
    async buildPurchaseOrderPrintHtml(user, id) {
        const po = await (0, purchase_order_builder_1.loadPurchaseOrderForPdf)(this.prisma, id);
        (0, shop_scope_1.assertShopScope)(user, po.shopId);
        const companyId = await (0, purchase_order_builder_1.resolvePurchaseOrderCompanyId)(this.prisma, po.shopId);
        const viewModel = await (0, purchase_order_builder_1.buildPurchaseOrderPdfViewModel)(this.prisma, po, companyId);
        await this.applyBranding({
            kind: 'purchase-order',
            id: po.id,
            shopId: po.shopId,
            brandingMode: po.brandingMode ?? client_1.BrandingMode.SNAPSHOT,
            brandingSnapshot: po.brandingSnapshot,
            templateVersion: po.templateVersion,
            viewModel,
        });
        return (0, purchase_order_builder_1.renderPurchaseOrderHtml)(viewModel);
    }
    async sleep(ms) {
        await new Promise((resolve) => setTimeout(resolve, ms));
    }
    async renderWithRetry(renderFn, maxAttempts = 3, delayMs = 500) {
        let lastError;
        for (let attempt = 0; attempt < maxAttempts; attempt++) {
            try {
                return await renderFn();
            }
            catch (err) {
                lastError = err instanceof Error ? err : new Error(String(err));
                if (attempt < maxAttempts - 1) {
                    await this.sleep(delayMs);
                }
            }
        }
        throw lastError ?? new Error('PDF generation failed');
    }
    async renderPurchaseOrderPdfByIdWithRetry(id, maxAttempts = 3, delayMs = 500) {
        return this.renderWithRetry(() => this.renderPurchaseOrderPdfById(id), maxAttempts, delayMs);
    }
    async renderInvoicePdfByIdWithRetry(id, maxAttempts = 3, delayMs = 500) {
        return this.renderWithRetry(() => this.renderInvoicePdfById(id), maxAttempts, delayMs);
    }
    async renderSalesOrderPdfByIdWithRetry(id, maxAttempts = 3, delayMs = 500) {
        return this.renderWithRetry(() => this.renderSalesOrderPdfById(id), maxAttempts, delayMs);
    }
    async renderSupplierBillPdfByIdWithRetry(id, maxAttempts = 3, delayMs = 500) {
        return this.renderWithRetry(() => this.renderSupplierBillPdfById(id), maxAttempts, delayMs);
    }
    async renderSupplierPaymentPdfByIdWithRetry(id, maxAttempts = 3, delayMs = 500) {
        return this.renderWithRetry(() => this.renderSupplierPaymentPdfById(id), maxAttempts, delayMs);
    }
    async renderPaymentReceiptPdfByIdWithRetry(id, maxAttempts = 3, delayMs = 500) {
        return this.renderWithRetry(() => this.renderPaymentReceiptPdfById(id), maxAttempts, delayMs);
    }
    async renderGoodsReceiptPdfByIdWithRetry(id, maxAttempts = 3, delayMs = 500) {
        return this.renderWithRetry(() => this.renderGoodsReceiptPdfById(id), maxAttempts, delayMs);
    }
    async renderGoodsReturnPdfByIdWithRetry(id, maxAttempts = 3, delayMs = 500) {
        return this.renderWithRetry(() => this.renderGoodsReturnPdfById(id), maxAttempts, delayMs);
    }
    async renderSalesQuotationPdfByIdWithRetry(id, maxAttempts = 3, delayMs = 500) {
        return this.renderWithRetry(() => this.renderSalesQuotationPdfById(id), maxAttempts, delayMs);
    }
};
exports.DocumentPdfService = DocumentPdfService;
exports.DocumentPdfService = DocumentPdfService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        branding_resolver_service_1.BrandingResolverService])
], DocumentPdfService);
//# sourceMappingURL=document-pdf.service.js.map