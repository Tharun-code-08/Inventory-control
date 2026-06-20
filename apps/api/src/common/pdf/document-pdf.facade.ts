import { Injectable } from '@nestjs/common';
import type { RequestUser } from '../types/request-user';
import type { DocumentPdfKind, DocumentPdfRenderResult } from './document-pdf.types';
import { DocumentPdfService } from './document-pdf.service';

@Injectable()
export class DocumentPdfFacade {
  constructor(private readonly service: DocumentPdfService) {}

  async assertDocumentAccess(user: RequestUser, kind: DocumentPdfKind, id: string): Promise<void> {
    return this.service.assertDocumentAccess(user, kind, id);
  }

  async renderPdf(user: RequestUser, kind: DocumentPdfKind, id: string): Promise<DocumentPdfRenderResult> {
    return this.service.renderPdf(user, kind, id);
  }

  async renderPurchaseOrderPdf(user: RequestUser, id: string): Promise<DocumentPdfRenderResult> {
    return this.service.renderPurchaseOrderPdf(user, id);
  }

  async renderInvoicePdf(user: RequestUser, id: string): Promise<DocumentPdfRenderResult> {
    return this.service.renderInvoicePdf(user, id);
  }

  async renderSalesOrderPdf(user: RequestUser, id: string): Promise<DocumentPdfRenderResult> {
    return this.service.renderSalesOrderPdf(user, id);
  }

  async renderSupplierBillPdf(user: RequestUser, id: string): Promise<DocumentPdfRenderResult> {
    return this.service.renderSupplierBillPdf(user, id);
  }

  async renderSupplierPaymentPdf(user: RequestUser, id: string): Promise<DocumentPdfRenderResult> {
    return this.service.renderSupplierPaymentPdf(user, id);
  }

  async renderPaymentReceiptPdf(user: RequestUser, id: string): Promise<DocumentPdfRenderResult> {
    return this.service.renderPaymentReceiptPdf(user, id);
  }

  async renderPurchaseOrderPdfById(id: string): Promise<DocumentPdfRenderResult> {
    return this.service.renderPurchaseOrderPdfById(id);
  }

  async renderInvoicePdfById(id: string): Promise<DocumentPdfRenderResult> {
    return this.service.renderInvoicePdfById(id);
  }

  async renderSalesOrderPdfById(id: string): Promise<DocumentPdfRenderResult> {
    return this.service.renderSalesOrderPdfById(id);
  }

  async renderSupplierBillPdfById(id: string): Promise<DocumentPdfRenderResult> {
    return this.service.renderSupplierBillPdfById(id);
  }

  async renderSupplierPaymentPdfById(id: string): Promise<DocumentPdfRenderResult> {
    return this.service.renderSupplierPaymentPdfById(id);
  }

  async renderPaymentReceiptPdfById(id: string): Promise<DocumentPdfRenderResult> {
    return this.service.renderPaymentReceiptPdfById(id);
  }

  async renderGoodsReceiptPdf(user: RequestUser, id: string): Promise<DocumentPdfRenderResult> {
    return this.service.renderGoodsReceiptPdf(user, id);
  }

  async renderGoodsIssuePdf(user: RequestUser, id: string): Promise<DocumentPdfRenderResult> {
    return this.service.renderGoodsIssuePdf(user, id);
  }

  async renderGoodsReturnPdf(user: RequestUser, id: string): Promise<DocumentPdfRenderResult> {
    return this.service.renderGoodsReturnPdf(user, id);
  }

  async renderSalesQuotationPdf(user: RequestUser, id: string): Promise<DocumentPdfRenderResult> {
    return this.service.renderSalesQuotationPdf(user, id);
  }

  async renderGoodsReceiptPdfById(id: string): Promise<DocumentPdfRenderResult> {
    return this.service.renderGoodsReceiptPdfById(id);
  }

  async renderGoodsIssuePdfById(id: string): Promise<DocumentPdfRenderResult> {
    return this.service.renderGoodsIssuePdfById(id);
  }

  async renderGoodsReturnPdfById(id: string): Promise<DocumentPdfRenderResult> {
    return this.service.renderGoodsReturnPdfById(id);
  }

  async renderSalesQuotationPdfById(id: string): Promise<DocumentPdfRenderResult> {
    return this.service.renderSalesQuotationPdfById(id);
  }

  async buildPurchaseOrderPrintHtml(user: RequestUser, id: string): Promise<string> {
    return this.service.buildPurchaseOrderPrintHtml(user, id);
  }

  async renderWithRetry(
    renderFn: () => Promise<DocumentPdfRenderResult>,
    maxAttempts = 3,
    delayMs = 500,
  ): Promise<DocumentPdfRenderResult> {
    return this.service.renderWithRetry(renderFn, maxAttempts, delayMs);
  }

  async renderPurchaseOrderPdfByIdWithRetry(
    id: string,
    maxAttempts = 3,
    delayMs = 500,
  ): Promise<DocumentPdfRenderResult> {
    return this.service.renderPurchaseOrderPdfByIdWithRetry(id, maxAttempts, delayMs);
  }

  async renderInvoicePdfByIdWithRetry(
    id: string,
    maxAttempts = 3,
    delayMs = 500,
  ): Promise<DocumentPdfRenderResult> {
    return this.service.renderInvoicePdfByIdWithRetry(id, maxAttempts, delayMs);
  }

  async renderSalesOrderPdfByIdWithRetry(
    id: string,
    maxAttempts = 3,
    delayMs = 500,
  ): Promise<DocumentPdfRenderResult> {
    return this.service.renderSalesOrderPdfByIdWithRetry(id, maxAttempts, delayMs);
  }

  async renderSupplierBillPdfByIdWithRetry(
    id: string,
    maxAttempts = 3,
    delayMs = 500,
  ): Promise<DocumentPdfRenderResult> {
    return this.service.renderSupplierBillPdfByIdWithRetry(id, maxAttempts, delayMs);
  }

  async renderSupplierPaymentPdfByIdWithRetry(
    id: string,
    maxAttempts = 3,
    delayMs = 500,
  ): Promise<DocumentPdfRenderResult> {
    return this.service.renderSupplierPaymentPdfByIdWithRetry(id, maxAttempts, delayMs);
  }

  async renderPaymentReceiptPdfByIdWithRetry(
    id: string,
    maxAttempts = 3,
    delayMs = 500,
  ): Promise<DocumentPdfRenderResult> {
    return this.service.renderPaymentReceiptPdfByIdWithRetry(id, maxAttempts, delayMs);
  }

  async renderGoodsReceiptPdfByIdWithRetry(
    id: string,
    maxAttempts = 3,
    delayMs = 500,
  ): Promise<DocumentPdfRenderResult> {
    return this.service.renderGoodsReceiptPdfByIdWithRetry(id, maxAttempts, delayMs);
  }

  async renderGoodsReturnPdfByIdWithRetry(
    id: string,
    maxAttempts = 3,
    delayMs = 500,
  ): Promise<DocumentPdfRenderResult> {
    return this.service.renderGoodsReturnPdfByIdWithRetry(id, maxAttempts, delayMs);
  }

  async renderSalesQuotationPdfByIdWithRetry(
    id: string,
    maxAttempts = 3,
    delayMs = 500,
  ): Promise<DocumentPdfRenderResult> {
    return this.service.renderSalesQuotationPdfByIdWithRetry(id, maxAttempts, delayMs);
  }
}
