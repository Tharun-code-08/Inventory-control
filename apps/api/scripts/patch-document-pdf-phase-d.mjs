import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const file = path.join(__dirname, '../src/common/pdf/document-pdf.service.ts');
let s = fs.readFileSync(file, 'utf8');

const importBlock = `import {
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
} from './builders/sales-quotation.builder';`;

if (!s.includes('goods-receipt.builder')) {
  s = s.replace(
    "} from './builders/payment-receipt.builder';",
    "} from './builders/payment-receipt.builder';\n\n" + importBlock,
  );
}

if (!s.includes("'goods-receipt'")) {
  s = s.replace(
    "  payment: 'shop:read',\n\n};",
    "  payment: 'shop:read',\n\n  'goods-receipt': 'goods_receipt:read',\n\n  'goods-issue': 'goods_issue:read',\n\n  'goods-return': 'shop:read',\n\n  'sales-quotation': 'shop:read',\n\n};",
  );
}

const accessPayment = `      case 'payment': {

        const payment = await loadPaymentReceiptForPdf(this.prisma, id);

        assertShopScope(user, payment.shopId);

        return;

      }

      default:`;

const accessNew = `      case 'payment': {

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

      default:`;

if (!s.includes("case 'goods-receipt'")) {
  s = s.replace(accessPayment, accessNew);
}

const renderSwitch = `      case 'payment':

        return this.renderPaymentReceiptPdf(user, id);

      default:

        throw new BadRequestException(\`PDF not yet implemented for: \${kind}\`);`;

const renderNew = `      case 'payment':

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

        throw new BadRequestException(\`PDF not yet implemented for: \${kind}\`);`;

if (!s.includes('renderGoodsReceiptPdf')) {
  s = s.replace(renderSwitch, renderNew);
}

const helperMethods = `
  async renderGoodsReceiptPdf(user: RequestUser, id: string): Promise<DocumentPdfRenderResult> {
    const gr = await loadGoodsReceiptForPdf(this.prisma, id);
    assertShopScope(user, gr.shopId);
    const viewModel = await buildGoodsReceiptPdfViewModel(this.prisma, gr);
    const buffer = await renderHtmlToPdfBuffer(renderGoodsReceiptHtml(viewModel));
    return { buffer, filename: goodsReceiptPdfFilename(gr.grNumber), contentType: 'application/pdf' };
  }

  async renderGoodsIssuePdf(user: RequestUser, id: string): Promise<DocumentPdfRenderResult> {
    const gi = await loadGoodsIssueForPdf(this.prisma, id);
    assertShopScope(user, gi.shopId);
    const viewModel = await buildGoodsIssuePdfViewModel(this.prisma, gi);
    const buffer = await renderHtmlToPdfBuffer(renderGoodsIssueHtml(viewModel));
    return { buffer, filename: goodsIssuePdfFilename(gi.giNumber), contentType: 'application/pdf' };
  }

  async renderGoodsReturnPdf(user: RequestUser, id: string): Promise<DocumentPdfRenderResult> {
    const ret = await loadGoodsReturnForPdf(this.prisma, id);
    assertShopScope(user, ret.shopId);
    const viewModel = await buildGoodsReturnPdfViewModel(this.prisma, ret);
    const buffer = await renderHtmlToPdfBuffer(renderGoodsReturnHtml(viewModel));
    return { buffer, filename: goodsReturnPdfFilename(ret.returnNumber), contentType: 'application/pdf' };
  }

  async renderSalesQuotationPdf(user: RequestUser, id: string): Promise<DocumentPdfRenderResult> {
    const quote = await loadSalesQuotationForPdf(this.prisma, id);
    assertShopScope(user, quote.shopId);
    const viewModel = await buildSalesQuotationPdfViewModel(this.prisma, quote);
    const buffer = await renderHtmlToPdfBuffer(renderSalesQuotationHtml(viewModel));
    return { buffer, filename: salesQuotationPdfFilename(quote.quoteNumber), contentType: 'application/pdf' };
  }

  async renderGoodsReceiptPdfById(id: string): Promise<DocumentPdfRenderResult> {
    const gr = await loadGoodsReceiptForPdf(this.prisma, id);
    const viewModel = await buildGoodsReceiptPdfViewModel(this.prisma, gr);
    const buffer = await renderHtmlToPdfBuffer(renderGoodsReceiptHtml(viewModel));
    return { buffer, filename: goodsReceiptPdfFilename(gr.grNumber), contentType: 'application/pdf' };
  }

  async renderGoodsIssuePdfById(id: string): Promise<DocumentPdfRenderResult> {
    const gi = await loadGoodsIssueForPdf(this.prisma, id);
    const viewModel = await buildGoodsIssuePdfViewModel(this.prisma, gi);
    const buffer = await renderHtmlToPdfBuffer(renderGoodsIssueHtml(viewModel));
    return { buffer, filename: goodsIssuePdfFilename(gi.giNumber), contentType: 'application/pdf' };
  }

  async renderGoodsReturnPdfById(id: string): Promise<DocumentPdfRenderResult> {
    const ret = await loadGoodsReturnForPdf(this.prisma, id);
    const viewModel = await buildGoodsReturnPdfViewModel(this.prisma, ret);
    const buffer = await renderHtmlToPdfBuffer(renderGoodsReturnHtml(viewModel));
    return { buffer, filename: goodsReturnPdfFilename(ret.returnNumber), contentType: 'application/pdf' };
  }

  async renderSalesQuotationPdfById(id: string): Promise<DocumentPdfRenderResult> {
    const quote = await loadSalesQuotationForPdf(this.prisma, id);
    const viewModel = await buildSalesQuotationPdfViewModel(this.prisma, quote);
    const buffer = await renderHtmlToPdfBuffer(renderSalesQuotationHtml(viewModel));
    return { buffer, filename: salesQuotationPdfFilename(quote.quoteNumber), contentType: 'application/pdf' };
  }
`;

if (!s.includes('renderGoodsReceiptPdfById')) {
  s = s.replace(
    '  async buildPurchaseOrderPrintHtml(user: RequestUser, id: string): Promise<string> {',
    helperMethods + '\n  async buildPurchaseOrderPrintHtml(user: RequestUser, id: string): Promise<string> {',
  );
}

const retryTail = `  async renderPaymentReceiptPdfByIdWithRetry(

    id: string,

    maxAttempts = 3,

    delayMs = 500,

  ): Promise<DocumentPdfRenderResult> {

    return this.renderWithRetry(() => this.renderPaymentReceiptPdfById(id), maxAttempts, delayMs);

  }

}`;

const retryNew = `  async renderPaymentReceiptPdfByIdWithRetry(

    id: string,

    maxAttempts = 3,

    delayMs = 500,

  ): Promise<DocumentPdfRenderResult> {

    return this.renderWithRetry(() => this.renderPaymentReceiptPdfById(id), maxAttempts, delayMs);

  }

  async renderGoodsReceiptPdfByIdWithRetry(id: string, maxAttempts = 3, delayMs = 500): Promise<DocumentPdfRenderResult> {
    return this.renderWithRetry(() => this.renderGoodsReceiptPdfById(id), maxAttempts, delayMs);
  }

  async renderGoodsIssuePdfByIdWithRetry(id: string, maxAttempts = 3, delayMs = 500): Promise<DocumentPdfRenderResult> {
    return this.renderWithRetry(() => this.renderGoodsIssuePdfById(id), maxAttempts, delayMs);
  }

  async renderGoodsReturnPdfByIdWithRetry(id: string, maxAttempts = 3, delayMs = 500): Promise<DocumentPdfRenderResult> {
    return this.renderWithRetry(() => this.renderGoodsReturnPdfById(id), maxAttempts, delayMs);
  }

  async renderSalesQuotationPdfByIdWithRetry(id: string, maxAttempts = 3, delayMs = 500): Promise<DocumentPdfRenderResult> {
    return this.renderWithRetry(() => this.renderSalesQuotationPdfById(id), maxAttempts, delayMs);
  }

}`;

if (!s.includes('renderGoodsReceiptPdfByIdWithRetry')) {
  s = s.replace(retryTail, retryNew);
}

fs.writeFileSync(file, s);
console.log('patched', file);
