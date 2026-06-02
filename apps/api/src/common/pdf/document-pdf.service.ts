import { BadRequestException, ForbiddenException, Injectable } from '@nestjs/common';

import { BrandingMode, RoleName } from '@prisma/client';

import type { RequestUser } from '../types/request-user';

import { assertShopScope } from '../utils/shop-scope';

import { PrismaService } from '../../prisma/prisma.service';
import { BrandingResolverService } from '../branding/branding-resolver.service';
import type { BrandingSnapshot } from '../branding/branding.types';

import { renderHtmlToPdfBuffer } from './html-to-pdf.service';

import {

  isDocumentPdfKind,

  type DocumentPdfKind,

  type DocumentPdfRenderResult,

} from './document-pdf.types';

import {

  buildPurchaseOrderPdfViewModel,

  loadPurchaseOrderForPdf,

  purchaseOrderPdfFilename,

  renderPurchaseOrderHtml,

  resolvePurchaseOrderCompanyId,

} from './builders/purchase-order.builder';

import {

  buildInvoicePdfViewModel,

  invoicePdfFilename,

  loadInvoiceForPdf,

  renderInvoiceHtml,

} from './builders/invoice.builder';

import {

  buildSalesOrderPdfViewModel,

  loadSalesOrderForPdf,

  renderSalesOrderHtml,

  salesOrderPdfFilename,

} from './builders/sales-order.builder';

import {

  buildSupplierBillPdfViewModel,

  loadSupplierBillForPdf,

  renderSupplierBillHtml,

  supplierBillPdfFilename,

} from './builders/supplier-bill.builder';

import {

  buildSupplierPaymentPdfViewModel,

  loadSupplierPaymentForPdf,

  renderSupplierPaymentHtml,

  supplierPaymentPdfFilename,

} from './builders/supplier-payment.builder';

import {

  buildPaymentReceiptPdfViewModel,

  loadPaymentReceiptForPdf,

  paymentReceiptPdfFilename,

  renderPaymentReceiptHtml,

} from './builders/payment-receipt.builder';

import {
  buildGoodsReceiptPdfViewModel,
  goodsReceiptPdfFilename,
  loadGoodsReceiptForPdf,
  renderGoodsReceiptHtml,
} from './builders/goods-receipt.builder';
import {
  buildGoodsIssuePdfViewModel,
  goodsIssuePdfFilename,
  loadGoodsIssueForPdf,
  renderGoodsIssueHtml,
} from './builders/goods-issue.builder';
import {
  buildGoodsReturnPdfViewModel,
  goodsReturnPdfFilename,
  loadGoodsReturnForPdf,
  renderGoodsReturnHtml,
} from './builders/goods-return.builder';
import {
  buildSalesQuotationPdfViewModel,
  loadSalesQuotationForPdf,
  renderSalesQuotationHtml,
  salesQuotationPdfFilename,
} from './builders/sales-quotation.builder';



const READ_PERMISSION_BY_KIND: Partial<Record<DocumentPdfKind, string>> = {

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



@Injectable()

export class DocumentPdfService {

  constructor(
    private readonly prisma: PrismaService,
    private readonly branding: BrandingResolverService,
  ) {}

  private async shopNameForId(shopId: string): Promise<string> {
    const shop = await this.prisma.shop.findUnique({ where: { id: shopId }, select: { shopName: true } });
    return shop?.shopName ?? 'Shop';
  }

  private buildSnapshot(
    branding: Awaited<ReturnType<BrandingResolverService['resolveForShop']>>,
    shopName: string,
    templateVersion?: number | null,
  ): BrandingSnapshot {
    return {
      companyName: branding.companyName,
      shopName,
      logoVersion: branding.logoVersion ?? null,
      brandingVersion: branding.brandingVersion ?? null,
      templateVersion: templateVersion ?? null,
      generatedAt: new Date().toISOString(),
    };
  }

  private async persistSnapshot(kind: DocumentPdfKind, id: string, snapshot: BrandingSnapshot, brandingVersion?: number | null) {
    const data = {
      brandingSnapshot: snapshot,
      brandingVersion: brandingVersion ?? undefined,
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

  private async applyBranding<T extends { companyName?: string }>(args: {
    kind: DocumentPdfKind;
    id: string;
    shopId: string;
    brandingMode?: BrandingMode | null;
    brandingSnapshot?: BrandingSnapshot | null;
    templateVersion?: number | null;
    viewModel: T & { brandingLogoUrl?: string | null; brandingInitials?: string | null };
  }) {
    const snapshot = args.brandingMode === BrandingMode.SNAPSHOT ? args.brandingSnapshot ?? null : null;
    const branding = await this.branding.resolveForShop(args.shopId, { snapshot });
    args.viewModel.brandingLogoUrl = branding.logoUrl ?? null;
    args.viewModel.brandingInitials = branding.initials;
    if (snapshot?.companyName) {
      args.viewModel.companyName = snapshot.companyName;
      const buyer = args.viewModel as { buyerName?: string };
      if (buyer.buyerName) {
        buyer.buyerName = snapshot.companyName;
      }
    }
    if (args.brandingMode === BrandingMode.SNAPSHOT) {
      const shopName = snapshot?.shopName ?? (await this.shopNameForId(args.shopId));
      const nextSnapshot = snapshot ?? this.buildSnapshot(branding, shopName, args.templateVersion);
      if (!args.brandingSnapshot) {
        await this.persistSnapshot(args.kind, args.id, nextSnapshot, branding.brandingVersion ?? null);
      }
    }
  }



  private assertCanRead(user: RequestUser, kind: DocumentPdfKind) {

    const required = READ_PERMISSION_BY_KIND[kind];

    if (!required) return;

    const role = user.role;

    if (role === RoleName.OWNER || role === RoleName.ADMIN) return;

    if (!user.permissions?.includes(required)) {

      throw new ForbiddenException('Missing permission');

    }

  }



  async assertDocumentAccess(user: RequestUser, kind: DocumentPdfKind, id: string): Promise<void> {

    if (!isDocumentPdfKind(kind)) {

      throw new BadRequestException(`Unsupported document kind: ${kind}`);

    }

    this.assertCanRead(user, kind);

    switch (kind) {

      case 'purchase-order': {

        const po = await loadPurchaseOrderForPdf(this.prisma, id);

        assertShopScope(user, po.shopId);

        return;

      }

      case 'invoice': {

        const invoice = await loadInvoiceForPdf(this.prisma, id);

        assertShopScope(user, invoice.shopId);

        return;

      }

      case 'sales-order': {

        const order = await loadSalesOrderForPdf(this.prisma, id);

        assertShopScope(user, order.shopId);

        return;

      }

      case 'supplier-bill': {

        const bill = await loadSupplierBillForPdf(this.prisma, id);

        assertShopScope(user, bill.shopId);

        return;

      }

      case 'supplier-payment': {

        const payment = await loadSupplierPaymentForPdf(this.prisma, id);

        assertShopScope(user, payment.shopId);

        return;

      }

      case 'payment': {

        const payment = await loadPaymentReceiptForPdf(this.prisma, id);

        assertShopScope(user, payment.shopId);

        return;

      }

      case 'goods-receipt': {

        const gr = await loadGoodsReceiptForPdf(this.prisma, id);

        assertShopScope(user, gr.shopId);

        return;

      }

      case 'goods-issue': {

        const gi = await loadGoodsIssueForPdf(this.prisma, id);

        assertShopScope(user, gi.shopId);

        return;

      }

      case 'goods-return': {

        const ret = await loadGoodsReturnForPdf(this.prisma, id);

        assertShopScope(user, ret.shopId);

        return;

      }

      case 'sales-quotation': {

        const quote = await loadSalesQuotationForPdf(this.prisma, id);

        assertShopScope(user, quote.shopId);

        return;

      }

      default:

        throw new BadRequestException(`Document access check not implemented for: ${kind}`);

    }

  }



  async renderPdf(

    user: RequestUser,

    kind: DocumentPdfKind,

    id: string,

  ): Promise<DocumentPdfRenderResult> {

    if (!isDocumentPdfKind(kind)) {

      throw new BadRequestException(`Unsupported document kind: ${kind}`);

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

        throw new BadRequestException(`PDF not yet implemented for: ${kind}`);

    }

  }



  async renderPurchaseOrderPdf(user: RequestUser, id: string): Promise<DocumentPdfRenderResult> {

    const po = await loadPurchaseOrderForPdf(this.prisma, id);

    assertShopScope(user, po.shopId);



    const companyId = await resolvePurchaseOrderCompanyId(this.prisma, po.shopId);

    const viewModel = await buildPurchaseOrderPdfViewModel(this.prisma, po, companyId);
    await this.applyBranding({
      kind: 'purchase-order',
      id: po.id,
      shopId: po.shopId,
      brandingMode: po.brandingMode ?? BrandingMode.SNAPSHOT,
      brandingSnapshot: po.brandingSnapshot as BrandingSnapshot | null,
      templateVersion: po.templateVersion,
      viewModel,
    });

    const html = renderPurchaseOrderHtml(viewModel);

    const buffer = await renderHtmlToPdfBuffer(html);



    return {

      buffer,

      filename: purchaseOrderPdfFilename(po.poNumber),

      contentType: 'application/pdf',

    };

  }



  async renderInvoicePdf(user: RequestUser, id: string): Promise<DocumentPdfRenderResult> {

    const invoice = await loadInvoiceForPdf(this.prisma, id);

    assertShopScope(user, invoice.shopId);

    const viewModel = await buildInvoicePdfViewModel(this.prisma, invoice);
    await this.applyBranding({
      kind: 'invoice',
      id: invoice.id,
      shopId: invoice.shopId,
      brandingMode: invoice.brandingMode ?? BrandingMode.SNAPSHOT,
      brandingSnapshot: invoice.brandingSnapshot as BrandingSnapshot | null,
      templateVersion: invoice.templateVersion,
      viewModel,
    });

    const buffer = await renderHtmlToPdfBuffer(renderInvoiceHtml(viewModel));

    return {

      buffer,

      filename: invoicePdfFilename(invoice.invoiceNumber),

      contentType: 'application/pdf',

    };

  }



  async renderSalesOrderPdf(user: RequestUser, id: string): Promise<DocumentPdfRenderResult> {

    const order = await loadSalesOrderForPdf(this.prisma, id);

    assertShopScope(user, order.shopId);

    const viewModel = await buildSalesOrderPdfViewModel(this.prisma, order);
    await this.applyBranding({
      kind: 'sales-order',
      id: order.id,
      shopId: order.shopId,
      brandingMode: order.brandingMode ?? BrandingMode.SNAPSHOT,
      brandingSnapshot: order.brandingSnapshot as BrandingSnapshot | null,
      templateVersion: order.templateVersion,
      viewModel,
    });

    const buffer = await renderHtmlToPdfBuffer(renderSalesOrderHtml(viewModel));

    return {

      buffer,

      filename: salesOrderPdfFilename(order.soNumber),

      contentType: 'application/pdf',

    };

  }



  async renderSupplierBillPdf(user: RequestUser, id: string): Promise<DocumentPdfRenderResult> {

    const bill = await loadSupplierBillForPdf(this.prisma, id);

    assertShopScope(user, bill.shopId);

    const viewModel = await buildSupplierBillPdfViewModel(this.prisma, bill);
    await this.applyBranding({
      kind: 'supplier-bill',
      id: bill.id,
      shopId: bill.shopId,
      brandingMode: bill.brandingMode ?? BrandingMode.SNAPSHOT,
      brandingSnapshot: bill.brandingSnapshot as BrandingSnapshot | null,
      templateVersion: bill.templateVersion,
      viewModel,
    });

    const buffer = await renderHtmlToPdfBuffer(renderSupplierBillHtml(viewModel));

    return {

      buffer,

      filename: supplierBillPdfFilename(bill.billNumber),

      contentType: 'application/pdf',

    };

  }



  async renderSupplierPaymentPdf(user: RequestUser, id: string): Promise<DocumentPdfRenderResult> {

    const payment = await loadSupplierPaymentForPdf(this.prisma, id);

    assertShopScope(user, payment.shopId);

    const viewModel = await buildSupplierPaymentPdfViewModel(this.prisma, payment);
    await this.applyBranding({
      kind: 'supplier-payment',
      id: payment.id,
      shopId: payment.shopId,
      brandingMode: payment.brandingMode ?? BrandingMode.SNAPSHOT,
      brandingSnapshot: payment.brandingSnapshot as BrandingSnapshot | null,
      templateVersion: payment.templateVersion,
      viewModel,
    });

    const buffer = await renderHtmlToPdfBuffer(renderSupplierPaymentHtml(viewModel));

    return {

      buffer,

      filename: supplierPaymentPdfFilename(payment.paymentNumber),

      contentType: 'application/pdf',

    };

  }



  async renderPaymentReceiptPdf(user: RequestUser, id: string): Promise<DocumentPdfRenderResult> {

    const payment = await loadPaymentReceiptForPdf(this.prisma, id);

    assertShopScope(user, payment.shopId);

    const viewModel = await buildPaymentReceiptPdfViewModel(this.prisma, payment);
    await this.applyBranding({
      kind: 'payment',
      id: payment.id,
      shopId: payment.shopId,
      brandingMode: payment.brandingMode ?? BrandingMode.SNAPSHOT,
      brandingSnapshot: payment.brandingSnapshot as BrandingSnapshot | null,
      templateVersion: payment.templateVersion,
      viewModel,
    });

    const buffer = await renderHtmlToPdfBuffer(renderPaymentReceiptHtml(viewModel));

    return {

      buffer,

      filename: paymentReceiptPdfFilename(payment.receiptNumber),

      contentType: 'application/pdf',

    };

  }



  async renderPurchaseOrderPdfById(id: string): Promise<DocumentPdfRenderResult> {

    const po = await loadPurchaseOrderForPdf(this.prisma, id);

    const companyId = await resolvePurchaseOrderCompanyId(this.prisma, po.shopId);

    const viewModel = await buildPurchaseOrderPdfViewModel(this.prisma, po, companyId);
    await this.applyBranding({
      kind: 'purchase-order',
      id: po.id,
      shopId: po.shopId,
      brandingMode: po.brandingMode ?? BrandingMode.SNAPSHOT,
      brandingSnapshot: po.brandingSnapshot as BrandingSnapshot | null,
      templateVersion: po.templateVersion,
      viewModel,
    });

    const html = renderPurchaseOrderHtml(viewModel);

    const buffer = await renderHtmlToPdfBuffer(html);



    return {

      buffer,

      filename: purchaseOrderPdfFilename(po.poNumber),

      contentType: 'application/pdf',

    };

  }



  async renderInvoicePdfById(id: string): Promise<DocumentPdfRenderResult> {

    const invoice = await loadInvoiceForPdf(this.prisma, id);

    const viewModel = await buildInvoicePdfViewModel(this.prisma, invoice);
    await this.applyBranding({
      kind: 'invoice',
      id: invoice.id,
      shopId: invoice.shopId,
      brandingMode: invoice.brandingMode ?? BrandingMode.SNAPSHOT,
      brandingSnapshot: invoice.brandingSnapshot as BrandingSnapshot | null,
      templateVersion: invoice.templateVersion,
      viewModel,
    });

    const buffer = await renderHtmlToPdfBuffer(renderInvoiceHtml(viewModel));

    return {

      buffer,

      filename: invoicePdfFilename(invoice.invoiceNumber),

      contentType: 'application/pdf',

    };

  }



  async renderSalesOrderPdfById(id: string): Promise<DocumentPdfRenderResult> {

    const order = await loadSalesOrderForPdf(this.prisma, id);

    const viewModel = await buildSalesOrderPdfViewModel(this.prisma, order);
    await this.applyBranding({
      kind: 'sales-order',
      id: order.id,
      shopId: order.shopId,
      brandingMode: order.brandingMode ?? BrandingMode.SNAPSHOT,
      brandingSnapshot: order.brandingSnapshot as BrandingSnapshot | null,
      templateVersion: order.templateVersion,
      viewModel,
    });

    const buffer = await renderHtmlToPdfBuffer(renderSalesOrderHtml(viewModel));

    return {

      buffer,

      filename: salesOrderPdfFilename(order.soNumber),

      contentType: 'application/pdf',

    };

  }



  async renderSupplierBillPdfById(id: string): Promise<DocumentPdfRenderResult> {

    const bill = await loadSupplierBillForPdf(this.prisma, id);

    const viewModel = await buildSupplierBillPdfViewModel(this.prisma, bill);
    await this.applyBranding({
      kind: 'supplier-bill',
      id: bill.id,
      shopId: bill.shopId,
      brandingMode: bill.brandingMode ?? BrandingMode.SNAPSHOT,
      brandingSnapshot: bill.brandingSnapshot as BrandingSnapshot | null,
      templateVersion: bill.templateVersion,
      viewModel,
    });

    const buffer = await renderHtmlToPdfBuffer(renderSupplierBillHtml(viewModel));

    return {

      buffer,

      filename: supplierBillPdfFilename(bill.billNumber),

      contentType: 'application/pdf',

    };

  }



  async renderSupplierPaymentPdfById(id: string): Promise<DocumentPdfRenderResult> {

    const payment = await loadSupplierPaymentForPdf(this.prisma, id);

    const viewModel = await buildSupplierPaymentPdfViewModel(this.prisma, payment);
    await this.applyBranding({
      kind: 'supplier-payment',
      id: payment.id,
      shopId: payment.shopId,
      brandingMode: payment.brandingMode ?? BrandingMode.SNAPSHOT,
      brandingSnapshot: payment.brandingSnapshot as BrandingSnapshot | null,
      templateVersion: payment.templateVersion,
      viewModel,
    });

    const buffer = await renderHtmlToPdfBuffer(renderSupplierPaymentHtml(viewModel));

    return {

      buffer,

      filename: supplierPaymentPdfFilename(payment.paymentNumber),

      contentType: 'application/pdf',

    };

  }



  async renderPaymentReceiptPdfById(id: string): Promise<DocumentPdfRenderResult> {

    const payment = await loadPaymentReceiptForPdf(this.prisma, id);

    const viewModel = await buildPaymentReceiptPdfViewModel(this.prisma, payment);
    await this.applyBranding({
      kind: 'payment',
      id: payment.id,
      shopId: payment.shopId,
      brandingMode: payment.brandingMode ?? BrandingMode.SNAPSHOT,
      brandingSnapshot: payment.brandingSnapshot as BrandingSnapshot | null,
      templateVersion: payment.templateVersion,
      viewModel,
    });

    const buffer = await renderHtmlToPdfBuffer(renderPaymentReceiptHtml(viewModel));

    return {

      buffer,

      filename: paymentReceiptPdfFilename(payment.receiptNumber),

      contentType: 'application/pdf',

    };

  }




  async renderGoodsReceiptPdf(user: RequestUser, id: string): Promise<DocumentPdfRenderResult> {
    const gr = await loadGoodsReceiptForPdf(this.prisma, id);
    assertShopScope(user, gr.shopId);
    const viewModel = await buildGoodsReceiptPdfViewModel(this.prisma, gr);
    await this.applyBranding({
      kind: 'goods-receipt',
      id: gr.id,
      shopId: gr.shopId,
      brandingMode: gr.brandingMode ?? BrandingMode.SNAPSHOT,
      brandingSnapshot: gr.brandingSnapshot as BrandingSnapshot | null,
      templateVersion: gr.templateVersion,
      viewModel,
    });
    const buffer = await renderHtmlToPdfBuffer(renderGoodsReceiptHtml(viewModel));
    return { buffer, filename: goodsReceiptPdfFilename(gr.grNumber), contentType: 'application/pdf' };
  }

  async renderGoodsIssuePdf(user: RequestUser, id: string): Promise<DocumentPdfRenderResult> {
    const gi = await loadGoodsIssueForPdf(this.prisma, id);
    assertShopScope(user, gi.shopId);
    const viewModel = await buildGoodsIssuePdfViewModel(this.prisma, gi);
    await this.applyBranding({
      kind: 'goods-issue',
      id: gi.id,
      shopId: gi.shopId,
      brandingMode: gi.brandingMode ?? BrandingMode.SNAPSHOT,
      brandingSnapshot: gi.brandingSnapshot as BrandingSnapshot | null,
      templateVersion: gi.templateVersion,
      viewModel,
    });
    const buffer = await renderHtmlToPdfBuffer(renderGoodsIssueHtml(viewModel));
    return { buffer, filename: goodsIssuePdfFilename(gi.giNumber), contentType: 'application/pdf' };
  }

  async renderGoodsReturnPdf(user: RequestUser, id: string): Promise<DocumentPdfRenderResult> {
    const ret = await loadGoodsReturnForPdf(this.prisma, id);
    assertShopScope(user, ret.shopId);
    const viewModel = await buildGoodsReturnPdfViewModel(this.prisma, ret);
    await this.applyBranding({
      kind: 'goods-return',
      id: ret.id,
      shopId: ret.shopId,
      brandingMode: ret.brandingMode ?? BrandingMode.SNAPSHOT,
      brandingSnapshot: ret.brandingSnapshot as BrandingSnapshot | null,
      templateVersion: ret.templateVersion,
      viewModel,
    });
    const buffer = await renderHtmlToPdfBuffer(renderGoodsReturnHtml(viewModel));
    return { buffer, filename: goodsReturnPdfFilename(ret.returnNumber), contentType: 'application/pdf' };
  }

  async renderSalesQuotationPdf(user: RequestUser, id: string): Promise<DocumentPdfRenderResult> {
    const quote = await loadSalesQuotationForPdf(this.prisma, id);
    assertShopScope(user, quote.shopId);
    const viewModel = await buildSalesQuotationPdfViewModel(this.prisma, quote);
    await this.applyBranding({
      kind: 'sales-quotation',
      id: quote.id,
      shopId: quote.shopId,
      brandingMode: quote.brandingMode ?? BrandingMode.LIVE,
      brandingSnapshot: quote.brandingSnapshot as BrandingSnapshot | null,
      templateVersion: quote.templateVersion,
      viewModel,
    });
    const buffer = await renderHtmlToPdfBuffer(renderSalesQuotationHtml(viewModel));
    return { buffer, filename: salesQuotationPdfFilename(quote.quoteNumber), contentType: 'application/pdf' };
  }

  async renderGoodsReceiptPdfById(id: string): Promise<DocumentPdfRenderResult> {
    const gr = await loadGoodsReceiptForPdf(this.prisma, id);
    const viewModel = await buildGoodsReceiptPdfViewModel(this.prisma, gr);
    await this.applyBranding({
      kind: 'goods-receipt',
      id: gr.id,
      shopId: gr.shopId,
      brandingMode: gr.brandingMode ?? BrandingMode.SNAPSHOT,
      brandingSnapshot: gr.brandingSnapshot as BrandingSnapshot | null,
      templateVersion: gr.templateVersion,
      viewModel,
    });
    const buffer = await renderHtmlToPdfBuffer(renderGoodsReceiptHtml(viewModel));
    return { buffer, filename: goodsReceiptPdfFilename(gr.grNumber), contentType: 'application/pdf' };
  }

  async renderGoodsIssuePdfById(id: string): Promise<DocumentPdfRenderResult> {
    const gi = await loadGoodsIssueForPdf(this.prisma, id);
    const viewModel = await buildGoodsIssuePdfViewModel(this.prisma, gi);
    await this.applyBranding({
      kind: 'goods-issue',
      id: gi.id,
      shopId: gi.shopId,
      brandingMode: gi.brandingMode ?? BrandingMode.SNAPSHOT,
      brandingSnapshot: gi.brandingSnapshot as BrandingSnapshot | null,
      templateVersion: gi.templateVersion,
      viewModel,
    });
    const buffer = await renderHtmlToPdfBuffer(renderGoodsIssueHtml(viewModel));
    return { buffer, filename: goodsIssuePdfFilename(gi.giNumber), contentType: 'application/pdf' };
  }

  async renderGoodsReturnPdfById(id: string): Promise<DocumentPdfRenderResult> {
    const ret = await loadGoodsReturnForPdf(this.prisma, id);
    const viewModel = await buildGoodsReturnPdfViewModel(this.prisma, ret);
    await this.applyBranding({
      kind: 'goods-return',
      id: ret.id,
      shopId: ret.shopId,
      brandingMode: ret.brandingMode ?? BrandingMode.SNAPSHOT,
      brandingSnapshot: ret.brandingSnapshot as BrandingSnapshot | null,
      templateVersion: ret.templateVersion,
      viewModel,
    });
    const buffer = await renderHtmlToPdfBuffer(renderGoodsReturnHtml(viewModel));
    return { buffer, filename: goodsReturnPdfFilename(ret.returnNumber), contentType: 'application/pdf' };
  }

  async renderSalesQuotationPdfById(id: string): Promise<DocumentPdfRenderResult> {
    const quote = await loadSalesQuotationForPdf(this.prisma, id);
    const viewModel = await buildSalesQuotationPdfViewModel(this.prisma, quote);
    await this.applyBranding({
      kind: 'sales-quotation',
      id: quote.id,
      shopId: quote.shopId,
      brandingMode: quote.brandingMode ?? BrandingMode.LIVE,
      brandingSnapshot: quote.brandingSnapshot as BrandingSnapshot | null,
      templateVersion: quote.templateVersion,
      viewModel,
    });
    const buffer = await renderHtmlToPdfBuffer(renderSalesQuotationHtml(viewModel));
    return { buffer, filename: salesQuotationPdfFilename(quote.quoteNumber), contentType: 'application/pdf' };
  }

  async buildPurchaseOrderPrintHtml(user: RequestUser, id: string): Promise<string> {

    const po = await loadPurchaseOrderForPdf(this.prisma, id);

    assertShopScope(user, po.shopId);

    const companyId = await resolvePurchaseOrderCompanyId(this.prisma, po.shopId);

    const viewModel = await buildPurchaseOrderPdfViewModel(this.prisma, po, companyId);
    await this.applyBranding({
      kind: 'purchase-order',
      id: po.id,
      shopId: po.shopId,
      brandingMode: po.brandingMode ?? BrandingMode.SNAPSHOT,
      brandingSnapshot: po.brandingSnapshot as BrandingSnapshot | null,
      templateVersion: po.templateVersion,
      viewModel,
    });

    return renderPurchaseOrderHtml(viewModel);

  }



  private async sleep(ms: number) {

    await new Promise((resolve) => setTimeout(resolve, ms));

  }



  async renderWithRetry(

    renderFn: () => Promise<DocumentPdfRenderResult>,

    maxAttempts = 3,

    delayMs = 500,

  ): Promise<DocumentPdfRenderResult> {

    let lastError: Error | undefined;

    for (let attempt = 0; attempt < maxAttempts; attempt++) {

      try {

        return await renderFn();

      } catch (err) {

        lastError = err instanceof Error ? err : new Error(String(err));

        if (attempt < maxAttempts - 1) {

          await this.sleep(delayMs);

        }

      }

    }

    throw lastError ?? new Error('PDF generation failed');

  }



  async renderPurchaseOrderPdfByIdWithRetry(

    id: string,

    maxAttempts = 3,

    delayMs = 500,

  ): Promise<DocumentPdfRenderResult> {

    return this.renderWithRetry(() => this.renderPurchaseOrderPdfById(id), maxAttempts, delayMs);

  }



  async renderInvoicePdfByIdWithRetry(

    id: string,

    maxAttempts = 3,

    delayMs = 500,

  ): Promise<DocumentPdfRenderResult> {

    return this.renderWithRetry(() => this.renderInvoicePdfById(id), maxAttempts, delayMs);

  }



  async renderSalesOrderPdfByIdWithRetry(

    id: string,

    maxAttempts = 3,

    delayMs = 500,

  ): Promise<DocumentPdfRenderResult> {

    return this.renderWithRetry(() => this.renderSalesOrderPdfById(id), maxAttempts, delayMs);

  }



  async renderSupplierBillPdfByIdWithRetry(

    id: string,

    maxAttempts = 3,

    delayMs = 500,

  ): Promise<DocumentPdfRenderResult> {

    return this.renderWithRetry(() => this.renderSupplierBillPdfById(id), maxAttempts, delayMs);

  }



  async renderSupplierPaymentPdfByIdWithRetry(

    id: string,

    maxAttempts = 3,

    delayMs = 500,

  ): Promise<DocumentPdfRenderResult> {

    return this.renderWithRetry(() => this.renderSupplierPaymentPdfById(id), maxAttempts, delayMs);

  }



  async renderPaymentReceiptPdfByIdWithRetry(

    id: string,

    maxAttempts = 3,

    delayMs = 500,

  ): Promise<DocumentPdfRenderResult> {

    return this.renderWithRetry(() => this.renderPaymentReceiptPdfById(id), maxAttempts, delayMs);

  }

  async renderGoodsReceiptPdfByIdWithRetry(
    id: string,
    maxAttempts = 3,
    delayMs = 500,
  ): Promise<DocumentPdfRenderResult> {
    return this.renderWithRetry(() => this.renderGoodsReceiptPdfById(id), maxAttempts, delayMs);
  }

  async renderGoodsReturnPdfByIdWithRetry(
    id: string,
    maxAttempts = 3,
    delayMs = 500,
  ): Promise<DocumentPdfRenderResult> {
    return this.renderWithRetry(() => this.renderGoodsReturnPdfById(id), maxAttempts, delayMs);
  }

  async renderSalesQuotationPdfByIdWithRetry(
    id: string,
    maxAttempts = 3,
    delayMs = 500,
  ): Promise<DocumentPdfRenderResult> {
    return this.renderWithRetry(() => this.renderSalesQuotationPdfById(id), maxAttempts, delayMs);
  }

}


