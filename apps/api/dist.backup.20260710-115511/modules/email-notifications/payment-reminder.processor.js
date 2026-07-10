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
var PaymentReminderProcessor_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.PaymentReminderProcessor = void 0;
const bullmq_1 = require("@nestjs/bullmq");
const common_1 = require("@nestjs/common");
const client_1 = require("@prisma/client");
const mail_service_1 = require("../../common/mail/mail.service");
const transactional_email_templates_1 = require("../../common/mail/transactional-email.templates");
const document_pdf_service_1 = require("../../common/pdf/document-pdf.service");
const prisma_service_1 = require("../../prisma/prisma.service");
const email_notifications_service_1 = require("./email-notifications.service");
const payment_reminder_constants_1 = require("./payment-reminder.constants");
let PaymentReminderProcessor = PaymentReminderProcessor_1 = class PaymentReminderProcessor extends bullmq_1.WorkerHost {
    prisma;
    mail;
    emailNotifications;
    documentPdf;
    logger = new common_1.Logger(PaymentReminderProcessor_1.name);
    constructor(prisma, mail, emailNotifications, documentPdf) {
        super();
        this.prisma = prisma;
        this.mail = mail;
        this.emailNotifications = emailNotifications;
        this.documentPdf = documentPdf;
    }
    async process(_job) {
        void _job;
        if (!this.mail.isConfigured()) {
            this.logger.warn('Payment reminder job skipped: SMTP not configured');
            return { sent: 0, skipped: 'SMTP not configured' };
        }
        const config = await this.emailNotifications.resolveConfigForShop(null);
        if (!config.reminders.paymentReminderEnabled) {
            return { sent: 0, skipped: 'Reminders disabled' };
        }
        const daysBefore = [...new Set(config.reminders.paymentReminderDaysBefore)].filter((day) => Number.isFinite(day) && day >= 0);
        if (daysBefore.length === 0)
            return { sent: 0 };
        const today = new Date();
        today.setUTCHours(0, 0, 0, 0);
        let sent = 0;
        for (const daysUntilDue of daysBefore) {
            const targetDue = new Date(today);
            targetDue.setUTCDate(targetDue.getUTCDate() + daysUntilDue);
            const invoices = await this.prisma.invoiceHeader.findMany({
                where: {
                    status: { in: [client_1.InvoiceStatus.ISSUED, client_1.InvoiceStatus.PARTIALLY_PAID] },
                    dueDate: targetDue,
                    customer: { email: { not: '' } },
                },
                include: {
                    customer: { select: { customerName: true, email: true } },
                    shop: { select: { shopName: true, companyId: true, company: { select: { companyName: true } } } },
                },
                take: 200,
            });
            for (const invoice of invoices) {
                const recipient = invoice.customer.email?.trim();
                if (!recipient)
                    continue;
                const templateKey = `payment_reminder_${daysUntilDue}`;
                const alreadySent = await this.emailNotifications.hasDeliveryLog({
                    templateId: templateKey,
                    entityType: 'invoice',
                    entityId: invoice.id,
                    recipient,
                });
                if (alreadySent)
                    continue;
                const balance = Number(invoice.totalValue) - Number(invoice.paidValue);
                if (balance <= 0)
                    continue;
                const formatMoney = (value) => new Intl.NumberFormat('en-IN', {
                    style: 'currency',
                    currency: 'INR',
                    maximumFractionDigits: 2,
                }).format(value);
                const content = {
                    customerName: invoice.customer.customerName,
                    invoiceNumber: invoice.invoiceNumber,
                    dueDate: invoice.dueDate
                        ? invoice.dueDate.toLocaleDateString('en-GB', {
                            day: '2-digit',
                            month: 'short',
                            year: 'numeric',
                        })
                        : '',
                    daysUntilDue: String(daysUntilDue),
                    balanceDue: formatMoney(balance),
                    companyName: invoice.shop?.company?.companyName ?? 'Softdigit Consulting',
                };
                const prepared = this.emailNotifications.prepareTemplate(config, 'payment_reminder', {
                    subject: (0, transactional_email_templates_1.paymentReminderSubject)(content),
                    text: (0, transactional_email_templates_1.paymentReminderText)(content),
                    html: (0, transactional_email_templates_1.paymentReminderHtml)(content),
                }, {
                    customer_name: content.customerName,
                    invoice_number: content.invoiceNumber,
                    due_date: content.dueDate,
                    days_until_due: content.daysUntilDue,
                    balance_due: content.balanceDue,
                    company_name: content.companyName,
                });
                if (!prepared.enabled)
                    continue;
                if (!invoice.shop?.companyId)
                    continue;
                let attachments;
                try {
                    const pdf = await this.documentPdf.renderInvoicePdfById(invoice.id);
                    attachments = [{ filename: pdf.filename, content: pdf.buffer }];
                }
                catch (err) {
                    this.logger.warn(`Payment reminder skipped PDF for invoice ${invoice.invoiceNumber}: ${err.message}`);
                    continue;
                }
                await this.mail.sendTenantMail(invoice.shop.companyId, {
                    to: recipient,
                    subject: prepared.subject,
                    text: prepared.text,
                    html: prepared.html,
                    cc: prepared.cc,
                    bcc: prepared.bcc,
                    fromName: content.companyName,
                    attachments,
                });
                await this.emailNotifications.logDelivery({
                    templateId: templateKey,
                    entityType: 'invoice',
                    entityId: invoice.id,
                    recipient,
                });
                sent += 1;
            }
        }
        return { sent };
    }
};
exports.PaymentReminderProcessor = PaymentReminderProcessor;
exports.PaymentReminderProcessor = PaymentReminderProcessor = PaymentReminderProcessor_1 = __decorate([
    (0, bullmq_1.Processor)(payment_reminder_constants_1.PAYMENT_REMINDER_QUEUE),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        mail_service_1.MailService,
        email_notifications_service_1.EmailNotificationsService,
        document_pdf_service_1.DocumentPdfService])
], PaymentReminderProcessor);
//# sourceMappingURL=payment-reminder.processor.js.map