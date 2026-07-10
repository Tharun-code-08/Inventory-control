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
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
var MailService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.MailService = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const nodemailer = require("nodemailer");
const email_sender_service_1 = require("../../modules/email-senders/email-sender.service");
const email_sender_constants_1 = require("../../modules/email-senders/email-sender.constants");
const portal_url_1 = require("./portal-url");
const supplier_deletion_template_1 = require("./supplier-deletion.template");
const rfq_invite_template_1 = require("./rfq-invite.template");
const sales_quotation_template_1 = require("./sales-quotation.template");
const purchase_order_supplier_template_1 = require("./purchase-order-supplier.template");
const signup_otp_template_1 = require("./signup-otp.template");
const return_notice_template_1 = require("./return-notice.template");
const password_reset_link_template_1 = require("./password-reset-link.template");
const password_reset_otp_template_1 = require("./password-reset-otp.template");
let MailService = MailService_1 = class MailService {
    config;
    emailSenders;
    logger = new common_1.Logger(MailService_1.name);
    transporter = null;
    transporterKey = '';
    senderTransports = new Map();
    senderTransportKeys = new Map();
    constructor(config, emailSenders = null) {
        this.config = config;
        this.emailSenders = emailSenders;
    }
    onModuleInit() {
        const host = this.smtpHost();
        if (!host) {
            this.logger.warn('SMTP_HOST is not set — RFQ supplier emails will not send');
            return;
        }
        void this.getTransporter().catch((err) => {
            this.logger.error(`SMTP startup check failed: ${err.message}`);
        });
    }
    env(key) {
        const fromConfig = this.config.get(key);
        if (fromConfig != null && String(fromConfig).trim() !== '') {
            return String(fromConfig).trim();
        }
        const fromProcess = process.env[key];
        return fromProcess?.trim() || undefined;
    }
    smtpHost() {
        return this.env('SMTP_HOST');
    }
    isConfigured() {
        return Boolean(this.smtpHost());
    }
    smtpUser() {
        return this.env('SMTP_USER');
    }
    getFromAddress() {
        const explicit = this.env('MAIL_FROM');
        const authUser = this.smtpUser();
        const from = explicit || authUser || 'office@softdigitconsulting.com';
        if (explicit && authUser && explicit.toLowerCase() !== authUser.toLowerCase()) {
            this.logger.warn(`MAIL_FROM (${explicit}) differs from SMTP_USER (${authUser}). For Zoho, both must be the same mailbox.`);
        }
        return from;
    }
    isZohoHost(host) {
        return /zoho\.(com|in|eu)/i.test(host);
    }
    getReplyToAddress() {
        return this.env('MAIL_REPLY_TO') || this.getFromAddress();
    }
    getBccAddress() {
        return this.env('MAIL_BCC');
    }
    smtpSettingsKey(settings) {
        return [settings.host, settings.port, settings.secure, settings.user, settings.pass].join('|');
    }
    async getSenderTransport(senderId, smtp) {
        const key = this.smtpSettingsKey({
            host: smtp.host,
            port: smtp.port,
            secure: smtp.secure,
            user: smtp.user,
            pass: smtp.password,
        });
        const cachedKey = this.senderTransportKeys.get(senderId);
        const cached = this.senderTransports.get(senderId);
        if (cached && cachedKey === key) {
            return cached;
        }
        const transport = nodemailer.createTransport({
            host: smtp.host,
            port: smtp.port,
            secure: smtp.secure,
            requireTLS: !smtp.secure && smtp.port === 587,
            auth: { user: smtp.user, pass: smtp.password },
            tls: { minVersion: 'TLSv1.2', servername: smtp.host },
        });
        await transport.verify();
        this.senderTransports.set(senderId, transport);
        this.senderTransportKeys.set(senderId, key);
        this.logger.log(`Sender SMTP ready (${smtp.host}:${smtp.port}, sender=${senderId})`);
        return transport;
    }
    async getTransporter() {
        const host = this.smtpHost();
        if (!host) {
            throw new Error('SMTP is not configured. Set SMTP_HOST, SMTP_USER, and SMTP_PASS in apps/api/.env and restart the API.');
        }
        const zoho = this.isZohoHost(host);
        const port = Number(this.env('SMTP_PORT') ?? (zoho ? 465 : 587));
        const secureExplicit = this.env('SMTP_SECURE');
        const secure = secureExplicit === 'true' || (secureExplicit !== 'false' && port === 465);
        const user = this.env('SMTP_USER');
        const pass = this.env('SMTP_PASS');
        const key = this.smtpSettingsKey({
            host,
            port,
            secure,
            user,
            pass,
        });
        if (this.transporter && this.transporterKey === key) {
            return this.transporter;
        }
        if (zoho && user && !user.includes('@')) {
            this.logger.warn('Zoho SMTP_USER should be the full email address (e.g. office@softdigitconsulting.com)');
        }
        const transport = nodemailer.createTransport({
            host,
            port,
            secure,
            requireTLS: !secure && port === 587,
            auth: user && pass ? { user, pass } : undefined,
            tls: { minVersion: 'TLSv1.2', servername: host },
        });
        await transport.verify();
        this.transporter = transport;
        this.transporterKey = key;
        this.logger.log(`SMTP ready (${host}:${port}, secure=${secure}${zoho ? ', Zoho' : ''})`);
        return transport;
    }
    async sendMail(args) {
        const transport = args.transport ?? (await this.getTransporter());
        const from = args.fromEmail ?? this.getFromAddress();
        const replyTo = args.replyTo ?? this.getReplyToAddress();
        const bcc = this.getBccAddress();
        const authUser = args.envelopeFrom ?? this.smtpUser();
        const displayName = args.fromName ?? 'Softdigit Consulting';
        const useEnvelopeFrom = authUser && authUser.toLowerCase() === from.toLowerCase();
        const info = await transport.sendMail({
            from: `"${displayName}" <${from}>`,
            replyTo,
            to: args.to,
            cc: args.cc,
            bcc: (args.bcc ?? bcc) || undefined,
            subject: args.subject,
            text: args.text,
            html: args.html,
            attachments: args.attachments,
            ...(useEnvelopeFrom
                ? { envelope: { from: authUser, to: args.to } }
                : {}),
        });
        const rejected = info.rejected;
        if (rejected?.length) {
            throw new Error(`Mail server rejected recipient(s): ${rejected.join(', ')}`);
        }
        const messageId = info.messageId ?? '';
        this.logger.log(`Email sent to=${args.to} from=${from} replyTo=${replyTo}${bcc ? ` bcc=${bcc}` : ''} messageId=${messageId}`);
        return { messageId, to: args.to, from, replyTo, bcc };
    }
    async sendPlatformMail(args) {
        return this.sendMail({
            ...args,
            fromName: args.fromName ?? 'Softdigit Consulting',
            fromEmail: this.getFromAddress(),
            replyTo: this.getReplyToAddress(),
        });
    }
    async sendViaSmtp(smtp, args) {
        const cacheKey = args.senderId ?? smtp.user;
        const transport = await this.getSenderTransport(cacheKey, smtp);
        return this.sendMail({
            ...args,
            transport,
            envelopeFrom: smtp.user,
            replyTo: args.replyTo ?? args.fromEmail,
        });
    }
    async sendTenantMail(companyId, args) {
        if (!this.emailSenders) {
            throw new Error(email_sender_constants_1.NO_VERIFIED_SENDER_MESSAGE);
        }
        const sender = await this.emailSenders.resolveTenantSender(companyId);
        return this.sendViaSmtp(sender.smtp, {
            ...args,
            senderId: sender.senderId,
            fromName: args.fromName ?? sender.fromName,
            fromEmail: sender.fromEmail,
            replyTo: sender.replyTo,
        });
    }
    rfqPortalAccessCode(rfqId) {
        return rfqId.replace(/-/g, '').slice(0, 8).toUpperCase();
    }
    buildRfqInviteContent(args) {
        const portalUrl = (0, portal_url_1.buildSupplierPortalSubmitUrl)(this.config, args.rfqId);
        const deadline = args.deadline
            ? args.deadline.toLocaleDateString('en-GB', {
                day: '2-digit',
                month: 'short',
                year: 'numeric',
            })
            : null;
        return {
            supplierName: args.supplierName,
            rfqNumber: args.rfqNumber,
            rfqTitle: args.rfqTitle,
            deadline,
            portalUrl,
            accessCode: this.rfqPortalAccessCode(args.rfqId),
        };
    }
    async sendRfqInvites(args) {
        if (!this.emailSenders) {
            return {
                configured: false,
                sent: 0,
                failed: 0,
                skipped: args.recipients.length,
                results: args.recipients.map((r) => ({
                    supplierId: r.supplierId,
                    supplierName: r.supplierName,
                    email: r.email,
                    status: 'skipped',
                    error: email_sender_constants_1.NO_VERIFIED_SENDER_MESSAGE,
                })),
            };
        }
        try {
            await this.emailSenders.resolveTenantSender(args.companyId);
        }
        catch (err) {
            const message = err.message;
            return {
                configured: false,
                sent: 0,
                failed: args.recipients.length,
                skipped: 0,
                results: args.recipients.map((r) => ({
                    supplierId: r.supplierId,
                    supplierName: r.supplierName,
                    email: r.email,
                    status: 'failed',
                    error: message,
                })),
            };
        }
        try {
            await this.getTransporter().catch(() => undefined);
        }
        catch {
        }
        const results = [];
        for (const recipient of args.recipients) {
            const email = recipient.email?.trim();
            if (!email) {
                results.push({
                    supplierId: recipient.supplierId,
                    supplierName: recipient.supplierName,
                    email: '',
                    status: 'skipped',
                    error: 'Supplier has no email address',
                });
                continue;
            }
            const content = this.buildRfqInviteContent({
                rfqId: args.rfqId,
                rfqNumber: args.rfqNumber,
                rfqTitle: args.rfqTitle,
                deadline: args.deadline,
                supplierName: recipient.supplierName,
            });
            const prepared = args.prepareInvite?.(content);
            if (prepared && !prepared.enabled) {
                results.push({
                    supplierId: recipient.supplierId,
                    supplierName: recipient.supplierName,
                    email,
                    status: 'skipped',
                    error: 'Email template disabled',
                });
                continue;
            }
            try {
                const delivery = await this.sendTenantMail(args.companyId, {
                    to: email,
                    subject: prepared?.enabled ? prepared.subject : (0, rfq_invite_template_1.rfqInviteSubject)(content),
                    text: prepared?.enabled ? prepared.text : (0, rfq_invite_template_1.rfqInviteText)(content),
                    html: prepared?.enabled ? prepared.html : (0, rfq_invite_template_1.rfqInviteHtml)(content),
                    cc: prepared?.enabled ? prepared.cc : undefined,
                    bcc: prepared?.enabled ? prepared.bcc : undefined,
                    attachments: args.attachments,
                });
                results.push({
                    supplierId: recipient.supplierId,
                    supplierName: recipient.supplierName,
                    email,
                    status: 'sent',
                    messageId: delivery.messageId || undefined,
                });
            }
            catch (err) {
                const message = err.message ?? 'Send failed';
                this.logger.error(`RFQ invite email failed for ${email}: ${message}`);
                results.push({
                    supplierId: recipient.supplierId,
                    supplierName: recipient.supplierName,
                    email,
                    status: 'failed',
                    error: message,
                });
            }
        }
        return {
            configured: true,
            sent: results.filter((r) => r.status === 'sent').length,
            failed: results.filter((r) => r.status === 'failed').length,
            skipped: results.filter((r) => r.status === 'skipped').length,
            results,
        };
    }
    buildSalesQuotationEmailContent(args) {
        const formatDate = (d) => d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
        const formatMoney = (v) => {
            const n = Number(v);
            return new Intl.NumberFormat('en-IN', {
                style: 'currency',
                currency: 'INR',
                maximumFractionDigits: 2,
            }).format(Number.isFinite(n) ? n : 0);
        };
        return {
            customerName: args.customerName,
            quoteNumber: args.quoteNumber,
            quoteDate: formatDate(args.quoteDate),
            validUntil: args.validUntil ? formatDate(args.validUntil) : null,
            shopName: args.shopName,
            remarks: args.remarks ?? null,
            companyName: args.companyName ?? 'Softdigit Consulting',
            portalUrl: args.portalUrl ?? null,
            isRevision: args.isRevision ?? false,
            totalValue: formatMoney(args.totalValue),
            lines: args.items.map((item) => ({
                code: item.product.productCode,
                description: item.product.description,
                quantity: String(item.quantity),
                uom: item.uom,
                unitPrice: formatMoney(item.unitPrice),
                lineValue: formatMoney(item.lineValue),
            })),
        };
    }
    async sendSalesQuotationToCustomer(args) {
        const baseText = args.overrides?.text ?? (0, sales_quotation_template_1.salesQuotationText)(args.content);
        const baseHtml = args.overrides?.html ?? (0, sales_quotation_template_1.salesQuotationHtml)(args.content);
        return this.sendTenantMail(args.companyId, {
            to: args.to,
            subject: args.overrides?.subject ?? (0, sales_quotation_template_1.salesQuotationSubject)(args.content),
            text: (0, sales_quotation_template_1.ensureSalesQuotationPortalText)(baseText, args.content.portalUrl),
            html: (0, sales_quotation_template_1.ensureSalesQuotationPortalCta)(baseHtml, args.content.portalUrl, args.content.isRevision ?? false),
            cc: args.overrides?.cc,
            bcc: args.overrides?.bcc,
            fromName: args.content.companyName,
            attachments: args.attachments,
        });
    }
    async sendPurchaseOrderToSupplier(args) {
        return this.sendTenantMail(args.companyId, {
            to: args.to,
            subject: args.overrides?.subject ?? (0, purchase_order_supplier_template_1.purchaseOrderSubject)(args.content),
            text: args.overrides?.text ?? (0, purchase_order_supplier_template_1.purchaseOrderText)(args.content),
            html: args.overrides?.html ?? (0, purchase_order_supplier_template_1.purchaseOrderHtml)(args.content),
            cc: args.overrides?.cc,
            bcc: args.overrides?.bcc,
            fromName: args.content.companyName,
            attachments: args.attachments,
        });
    }
    async sendSupplierReturnNotice(args) {
        return this.sendTenantMail(args.companyId, {
            to: args.to,
            cc: args.overrides?.cc ?? args.cc,
            subject: args.overrides?.subject ?? (0, return_notice_template_1.returnNoticeSubject)(args.content),
            text: args.overrides?.text ?? (0, return_notice_template_1.returnNoticeText)(args.content),
            html: args.overrides?.html ?? (0, return_notice_template_1.returnNoticeHtml)(args.content),
            bcc: args.overrides?.bcc,
            fromName: args.content.companyName,
            attachments: args.attachments,
        });
    }
    async sendSignupOtp(args) {
        if (!this.isConfigured()) {
            throw new Error('SMTP is not configured. Set SMTP_HOST, SMTP_USER, and SMTP_PASS in apps/api/.env and restart the API.');
        }
        const content = {
            adminName: args.adminName,
            companyName: args.companyName,
            email: args.to,
            otpCode: args.otpCode,
            expiresMinutes: args.expiresMinutes,
        };
        return this.sendPlatformMail({
            to: args.to,
            subject: (0, signup_otp_template_1.signupOtpSubject)(args.companyName),
            text: (0, signup_otp_template_1.signupOtpText)(content),
            html: (0, signup_otp_template_1.signupOtpHtml)(content),
            fromName: 'Softdigit Consulting',
        });
    }
    async sendPasswordResetOtp(args) {
        if (!this.isConfigured()) {
            throw new Error('SMTP is not configured. Set SMTP_HOST, SMTP_USER, and SMTP_PASS in apps/api/.env and restart the API.');
        }
        const content = {
            userName: args.userName,
            email: args.to,
            otpCode: args.otpCode,
            expiresMinutes: args.expiresMinutes,
        };
        return this.sendPlatformMail({
            to: args.to,
            subject: (0, password_reset_otp_template_1.passwordResetOtpSubject)(),
            text: (0, password_reset_otp_template_1.passwordResetOtpText)(content),
            html: (0, password_reset_otp_template_1.passwordResetOtpHtml)(content),
            fromName: 'Softdigit Consulting',
        });
    }
    async sendPasswordResetLink(args) {
        if (!this.isConfigured()) {
            throw new Error('SMTP is not configured. Set SMTP_HOST, SMTP_USER, and SMTP_PASS in apps/api/.env and restart the API.');
        }
        const content = {
            userName: args.userName,
            email: args.to,
            resetUrl: (0, portal_url_1.buildPasswordResetUrl)(this.config, args.token),
            expiresMinutes: args.expiresMinutes,
        };
        return this.sendPlatformMail({
            to: args.to,
            subject: (0, password_reset_link_template_1.passwordResetLinkSubject)(),
            text: (0, password_reset_link_template_1.passwordResetLinkText)(content),
            html: (0, password_reset_link_template_1.passwordResetLinkHtml)(content),
            fromName: 'Softdigit Consulting',
        });
    }
    async sendInvoiceCreated(args) {
        const { invoiceCreatedHtml, invoiceCreatedSubject, invoiceCreatedText, } = await Promise.resolve().then(() => require('./transactional-email.templates'));
        return this.sendTenantMail(args.companyId, {
            to: args.to,
            subject: args.overrides?.subject ?? invoiceCreatedSubject(args.content),
            text: args.overrides?.text ?? invoiceCreatedText(args.content),
            html: args.overrides?.html ?? invoiceCreatedHtml(args.content),
            cc: args.overrides?.cc,
            bcc: args.overrides?.bcc,
            fromName: args.content.companyName,
            attachments: args.attachments,
        });
    }
    async sendPaymentReceived(args) {
        const { paymentReceivedHtml, paymentReceivedSubject, paymentReceivedText, } = await Promise.resolve().then(() => require('./transactional-email.templates'));
        return this.sendTenantMail(args.companyId, {
            to: args.to,
            subject: args.overrides?.subject ?? paymentReceivedSubject(args.content),
            text: args.overrides?.text ?? paymentReceivedText(args.content),
            html: args.overrides?.html ?? paymentReceivedHtml(args.content),
            cc: args.overrides?.cc,
            bcc: args.overrides?.bcc,
            fromName: args.content.companyName,
            attachments: args.attachments,
        });
    }
    async sendSalesOrderToCustomer(args) {
        const { salesOrderCustomerHtml, salesOrderCustomerSubject, salesOrderCustomerText, } = await Promise.resolve().then(() => require('./transactional-email.templates'));
        return this.sendTenantMail(args.companyId, {
            to: args.to,
            subject: args.overrides?.subject ?? salesOrderCustomerSubject(args.content),
            text: args.overrides?.text ?? salesOrderCustomerText(args.content),
            html: args.overrides?.html ?? salesOrderCustomerHtml(args.content),
            cc: args.overrides?.cc,
            bcc: args.overrides?.bcc,
            fromName: args.content.companyName,
            attachments: args.attachments,
        });
    }
    async sendSupplierBillIssued(args) {
        const { supplierBillIssuedHtml, supplierBillIssuedSubject, supplierBillIssuedText, } = await Promise.resolve().then(() => require('./transactional-email.templates'));
        return this.sendTenantMail(args.companyId, {
            to: args.to,
            subject: args.overrides?.subject ?? supplierBillIssuedSubject(args.content),
            text: args.overrides?.text ?? supplierBillIssuedText(args.content),
            html: args.overrides?.html ?? supplierBillIssuedHtml(args.content),
            cc: args.overrides?.cc,
            bcc: args.overrides?.bcc,
            fromName: args.content.companyName,
            attachments: args.attachments,
        });
    }
    async sendGoodsReceiptToSupplier(args) {
        const { goodsReceiptSupplierHtml, goodsReceiptSupplierSubject, goodsReceiptSupplierText, } = await Promise.resolve().then(() => require('./transactional-email.templates'));
        return this.sendTenantMail(args.companyId, {
            to: args.to,
            subject: args.overrides?.subject ?? goodsReceiptSupplierSubject(args.content),
            text: args.overrides?.text ?? goodsReceiptSupplierText(args.content),
            html: args.overrides?.html ?? goodsReceiptSupplierHtml(args.content),
            cc: args.overrides?.cc,
            bcc: args.overrides?.bcc,
            fromName: args.content.companyName,
            attachments: args.attachments,
        });
    }
    async sendSupplierPaymentRecorded(args) {
        const { supplierPaymentRecordedHtml, supplierPaymentRecordedSubject, supplierPaymentRecordedText, } = await Promise.resolve().then(() => require('./transactional-email.templates'));
        return this.sendTenantMail(args.companyId, {
            to: args.to,
            subject: args.overrides?.subject ?? supplierPaymentRecordedSubject(args.content),
            text: args.overrides?.text ?? supplierPaymentRecordedText(args.content),
            html: args.overrides?.html ?? supplierPaymentRecordedHtml(args.content),
            cc: args.overrides?.cc,
            bcc: args.overrides?.bcc,
            fromName: args.content.companyName,
            attachments: args.attachments,
        });
    }
    async sendSupplierDeletionConfirm(args) {
        const confirmUrl = (0, portal_url_1.buildSupplierDeleteConfirmUrl)(this.config, args.confirmToken);
        const content = {
            supplierName: args.supplierName,
            supplierCode: args.supplierCode,
            requestedByName: args.requestedByName,
            confirmUrl,
            rfqCount: args.rfqCount,
            quotationCount: args.quotationCount,
            contractCount: args.contractCount,
            purchaseOrderCount: args.purchaseOrderCount,
        };
        await this.sendPlatformMail({
            to: args.adminEmail,
            subject: (0, supplier_deletion_template_1.supplierDeletionSubject)(args.supplierName),
            text: (0, supplier_deletion_template_1.supplierDeletionText)(content),
            html: (0, supplier_deletion_template_1.supplierDeletionHtml)(content),
        }).then(() => undefined);
    }
};
exports.MailService = MailService;
exports.MailService = MailService = MailService_1 = __decorate([
    (0, common_1.Injectable)(),
    __param(1, (0, common_1.Optional)()),
    __param(1, (0, common_1.Inject)((0, common_1.forwardRef)(() => email_sender_service_1.EmailSenderService))),
    __metadata("design:paramtypes", [config_1.ConfigService, Object])
], MailService);
//# sourceMappingURL=mail.service.js.map