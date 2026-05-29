import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const file = path.join(__dirname, '../src/modules/document-email/document-email.service.ts');
let s = fs.readFileSync(file, 'utf8');

if (!s.includes('ReturnNoticeEmailContent')) {
  s = s.replace(
    "import type { PurchaseOrderEmailContent } from '../../common/mail/purchase-order-supplier.template';",
    `import type { PurchaseOrderEmailContent } from '../../common/mail/purchase-order-supplier.template';
import type { ReturnNoticeEmailContent } from '../../common/mail/return-notice.template';
import type { SalesQuotationEmailContent } from '../../common/mail/sales-quotation.template';`,
  );
  s = s.replace(
    '  SupplierPaymentRecordedEmailContent,\n} from',
    `  SupplierPaymentRecordedEmailContent,
  GoodsReceiptSupplierEmailContent,
} from`,
  );
}

if (!s.includes('ReturnImageStorageService')) {
  s = s.replace(
    "import { AuditService } from '../audit/audit.service';",
    `import { AuditService } from '../audit/audit.service';
import { ReturnImageStorageService } from '../../common/upload/return-image-storage.service';`,
  );
  s = s.replace(
    '    private readonly audit: AuditService,',
    `    private readonly audit: AuditService,
    private readonly returnImages: ReturnImageStorageService,`,
  );
}

const sendSupplierPaymentBlock = `    return this.enqueueDocumentEmail(user, {
      entityType: 'supplier-payment',
      entityId: args.paymentId,
      documentNumber: args.documentNumber,
      templateId: 'supplier_payment_recorded',
      companyId: args.companyId,
      shopId: args.shopId,
      recipient: args.recipient,
      payload: { kind: 'supplier-payment', content: args.content, overrides: args.prepared },
      trigger: args.trigger,
    });
  }`;

const extendedSendMethods = `${sendSupplierPaymentBlock}

  async sendGoodsReceiptEmail(
    user: RequestUser,
    args: {
      grId: string;
      companyId: string;
      shopId: string;
      recipient: string;
      content: GoodsReceiptSupplierEmailContent;
      prepared: EmailOverrides;
      documentNumber: string;
      trigger: DocumentEmailTrigger;
    },
  ): Promise<DocumentEmailSendResult> {
    return this.enqueueDocumentEmail(user, {
      entityType: 'goods-receipt',
      entityId: args.grId,
      documentNumber: args.documentNumber,
      templateId: 'goods_receipt_supplier',
      companyId: args.companyId,
      shopId: args.shopId,
      recipient: args.recipient,
      payload: { kind: 'goods-receipt', content: args.content, overrides: args.prepared },
      trigger: args.trigger,
    });
  }

  async sendSalesQuotationEmail(
    user: RequestUser,
    args: {
      quoteId: string;
      companyId: string;
      shopId: string;
      recipient: string;
      content: SalesQuotationEmailContent;
      prepared: EmailOverrides;
      documentNumber: string;
      trigger: DocumentEmailTrigger;
    },
  ): Promise<DocumentEmailSendResult> {
    return this.enqueueDocumentEmail(user, {
      entityType: 'sales-quotation',
      entityId: args.quoteId,
      documentNumber: args.documentNumber,
      templateId: 'sales_quotation_customer',
      companyId: args.companyId,
      shopId: args.shopId,
      recipient: args.recipient,
      payload: { kind: 'sales-quotation', content: args.content, overrides: args.prepared },
      trigger: args.trigger,
    });
  }

  async sendGoodsReturnEmail(
    user: RequestUser,
    args: {
      returnId: string;
      companyId: string;
      shopId: string;
      recipient: string;
      content: ReturnNoticeEmailContent;
      prepared: EmailOverrides;
      documentNumber: string;
      trigger: DocumentEmailTrigger;
      cc?: string;
    },
  ): Promise<DocumentEmailSendResult> {
    return this.enqueueDocumentEmail(user, {
      entityType: 'goods-return',
      entityId: args.returnId,
      documentNumber: args.documentNumber,
      templateId: 'supplier_return_notice',
      companyId: args.companyId,
      shopId: args.shopId,
      recipient: args.recipient,
      payload: {
        kind: 'goods-return',
        content: args.content,
        overrides: args.prepared,
        cc: args.cc,
      },
      trigger: args.trigger,
    });
  }`;

if (!s.includes('sendGoodsReceiptEmail')) {
  s = s.replace(sendSupplierPaymentBlock, extendedSendMethods);
}

const oldSendMailSig = `  private async sendMailForPayload(
    payload: DocumentEmailPayload,
    companyId: string,
    to: string,
    pdfBuffer: Buffer,
    pdfFilename: string,
  ) {
    const attachments = [{ filename: pdfFilename, content: pdfBuffer }];`;

const newSendMailSig = `  private async loadReturnImageAttachments(entityId: string) {
    const images = await this.prisma.supplierReturnImage.findMany({
      where: { returnId: entityId },
      orderBy: { createdAt: 'asc' },
    });
    const attachments: Array<{ filename: string; content: Buffer; contentType?: string }> = [];
    for (const image of images) {
      attachments.push({
        filename: image.originalFilename,
        content: await this.returnImages.read(image.filePath),
        contentType: image.mimeType,
      });
    }
    return attachments;
  }

  private async sendMailForPayload(
    payload: DocumentEmailPayload,
    companyId: string,
    to: string,
    pdfBuffer: Buffer,
    pdfFilename: string,
    extraAttachments: Array<{ filename: string; content: Buffer; contentType?: string }> = [],
  ) {
    const attachments = [{ filename: pdfFilename, content: pdfBuffer }, ...extraAttachments];`;

if (!s.includes('loadReturnImageAttachments')) {
  s = s.replace(oldSendMailSig, newSendMailSig);
}

const oldProcessSend = `      const delivery = await this.sendMailForPayload(
        payload,
        row.companyId,
        row.recipient,
        pdfBuffer,
        pdfFilename,
      );`;

const newProcessSend = `      const extraAttachments =
        payload.kind === 'goods-return'
          ? await this.loadReturnImageAttachments(row.entityId)
          : [];
      const delivery = await this.sendMailForPayload(
        payload,
        row.companyId,
        row.recipient,
        pdfBuffer,
        pdfFilename,
        extraAttachments,
      );`;

if (!s.includes('loadReturnImageAttachments(row.entityId)')) {
  s = s.replace(oldProcessSend, newProcessSend);
}

const renderDefault = `      case 'supplier-payment':
        return this.documentPdf.renderSupplierPaymentPdfByIdWithRetry(
          entityId,
          PDF_IMMEDIATE_RETRIES,
          PDF_RETRY_DELAY_MS,
        );
      default:
        throw new BadRequestException(\`Unsupported email payload kind: \${(payload as { kind?: string }).kind}\`);`;

const renderExtended = `      case 'supplier-payment':
        return this.documentPdf.renderSupplierPaymentPdfByIdWithRetry(
          entityId,
          PDF_IMMEDIATE_RETRIES,
          PDF_RETRY_DELAY_MS,
        );
      case 'goods-receipt':
        return this.documentPdf.renderGoodsReceiptPdfByIdWithRetry(
          entityId,
          PDF_IMMEDIATE_RETRIES,
          PDF_RETRY_DELAY_MS,
        );
      case 'sales-quotation':
        return this.documentPdf.renderSalesQuotationPdfByIdWithRetry(
          entityId,
          PDF_IMMEDIATE_RETRIES,
          PDF_RETRY_DELAY_MS,
        );
      case 'goods-return':
        return this.documentPdf.renderGoodsReturnPdfByIdWithRetry(
          entityId,
          PDF_IMMEDIATE_RETRIES,
          PDF_RETRY_DELAY_MS,
        );
      default:
        throw new BadRequestException(\`Unsupported email payload kind: \${(payload as { kind?: string }).kind}\`);`;

if (!s.includes("case 'goods-receipt':")) {
  s = s.replace(renderDefault, renderExtended);
}

const mailDefault = `      case 'supplier-payment':
        return this.mail.sendSupplierPaymentRecorded({
          companyId,
          to,
          content: payload.content,
          attachments,
          overrides: payload.overrides,
        });
      default:
        throw new BadRequestException(\`Unsupported email payload kind: \${(payload as { kind?: string }).kind}\`);`;

const mailExtended = `      case 'supplier-payment':
        return this.mail.sendSupplierPaymentRecorded({
          companyId,
          to,
          content: payload.content,
          attachments,
          overrides: payload.overrides,
        });
      case 'goods-receipt':
        return this.mail.sendGoodsReceiptToSupplier({
          companyId,
          to,
          content: payload.content,
          attachments,
          overrides: payload.overrides,
        });
      case 'sales-quotation':
        return this.mail.sendSalesQuotationToCustomer({
          companyId,
          to,
          content: payload.content,
          attachments,
          overrides: payload.overrides,
        });
      case 'goods-return':
        return this.mail.sendSupplierReturnNotice({
          companyId,
          to,
          cc: payload.cc,
          content: payload.content,
          attachments,
          overrides: payload.overrides,
        });
      default:
        throw new BadRequestException(\`Unsupported email payload kind: \${(payload as { kind?: string }).kind}\`);`;

if (!s.includes('sendGoodsReceiptToSupplier')) {
  s = s.replace(mailDefault, mailExtended);
}

const auditPo = `        paymentNumber:
          payload?.kind === 'supplier-payment' ? payload.content.paymentNumber : undefined,`;

const auditExtended = `        paymentNumber:
          payload?.kind === 'supplier-payment' ? payload.content.paymentNumber : undefined,
        grNumber: payload?.kind === 'goods-receipt' ? payload.content.grNumber : undefined,
        quoteNumber: payload?.kind === 'sales-quotation' ? payload.content.quoteNumber : undefined,
        returnNumber: payload?.kind === 'goods-return' ? payload.content.returnNumber : undefined,`;

if (!s.includes('grNumber:')) {
  s = s.replace(auditPo, auditExtended);
}

fs.writeFileSync(file, s);
console.log('patched document-email.service.ts');

const modFile = path.join(__dirname, '../src/modules/document-email/document-email.module.ts');
let mod = fs.readFileSync(modFile, 'utf8');
if (!mod.includes('ReturnImageStorageService')) {
  mod = mod.replace(
    '  providers: [DocumentEmailService, DocumentEmailProcessor],',
    '  providers: [DocumentEmailService, DocumentEmailProcessor, ReturnImageStorageService],',
  );
  mod = mod.replace(
    "import { DocumentEmailService } from './document-email.service';",
    `import { DocumentEmailService } from './document-email.service';
import { ReturnImageStorageService } from '../../common/upload/return-image-storage.service';`,
  );
  fs.writeFileSync(modFile, mod);
  console.log('patched document-email.module.ts');
}
