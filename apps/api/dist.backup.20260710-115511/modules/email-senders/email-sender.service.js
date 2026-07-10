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
Object.defineProperty(exports, "__esModule", { value: true });
exports.EmailSenderService = void 0;
const crypto_1 = require("crypto");
const dns_1 = require("dns");
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const client_1 = require("@prisma/client");
const mail_service_1 = require("../../common/mail/mail.service");
const sender_verification_otp_template_1 = require("../../common/mail/sender-verification-otp.template");
const secret_cipher_1 = require("../../common/crypto/secret-cipher");
const prisma_service_1 = require("../../prisma/prisma.service");
const email_sender_constants_1 = require("./email-sender.constants");
let EmailSenderService = class EmailSenderService {
    prisma;
    mail;
    config;
    constructor(prisma, mail, config) {
        this.prisma = prisma;
        this.mail = mail;
        this.config = config;
    }
    assertOrgAdmin(user) {
        if (user.role !== client_1.RoleName.OWNER && user.role !== client_1.RoleName.ADMIN) {
            throw new common_1.ForbiddenException('Only organization admins can manage sender emails');
        }
        if (!user.companyId) {
            throw new common_1.BadRequestException('Company context is required');
        }
    }
    companyId(user) {
        this.assertOrgAdmin(user);
        return user.companyId;
    }
    hashOtp(code) {
        return (0, crypto_1.createHash)('sha256').update(code).digest('hex');
    }
    platformFromEmail() {
        return (this.config.get('MAIL_FROM') ??
            process.env.MAIL_FROM ??
            this.config.get('SMTP_USER') ??
            process.env.SMTP_USER ??
            'office@softdigitconsulting.com');
    }
    buildDkimRecord(companyCode, domain) {
        const selector = `retailims-${companyCode.toLowerCase().replace(/[^a-z0-9]/g, '')}`.slice(0, 40);
        const token = (0, crypto_1.createHash)('sha256')
            .update(`${companyCode}:${domain}:retailims-sender-v1`)
            .digest('hex')
            .slice(0, 32);
        return {
            dkimSelector: selector,
            dkimHost: `${selector}._domainkey.${domain}`,
            dkimValue: `retailims-verification=${token}`,
        };
    }
    async ensureDefaultSender(companyId) {
        const count = await this.prisma.emailSenderIdentity.count({ where: { companyId } });
        if (count > 0)
            return;
        const company = await this.prisma.company.findUnique({
            where: { id: companyId },
            select: { companyCode: true, companyName: true },
        });
        if (!company)
            return;
        const admin = await this.prisma.user.findFirst({
            where: {
                isActive: true,
                role: { name: { in: [client_1.RoleName.OWNER, client_1.RoleName.ADMIN] } },
                shop: { companyId },
            },
            select: { email: true, name: true },
            orderBy: { createdAt: 'asc' },
        });
        const email = (0, email_sender_constants_1.normalizeSenderEmail)(admin?.email ?? 'office@softdigitconsulting.com');
        const domain = (0, email_sender_constants_1.parseEmailDomain)(email);
        const senderType = (0, email_sender_constants_1.isPublicEmailDomain)(domain) ? client_1.EmailSenderType.PUBLIC_DOMAIN : client_1.EmailSenderType.CUSTOM_DOMAIN;
        let domainId;
        if (senderType === client_1.EmailSenderType.CUSTOM_DOMAIN && domain) {
            const dkim = this.buildDkimRecord(company.companyCode, domain);
            const row = await this.prisma.emailSenderDomain.upsert({
                where: { companyId_domain: { companyId, domain } },
                update: {},
                create: { companyId, domain, ...dkim },
            });
            domainId = row.id;
        }
        await this.prisma.emailSenderIdentity.create({
            data: {
                companyId,
                domainId,
                displayName: admin?.name ?? company.companyName,
                email,
                senderType,
                isPrimary: true,
                status: client_1.EmailSenderStatus.PENDING,
            },
        });
    }
    async listSenders(user) {
        const companyId = this.companyId(user);
        await this.ensureDefaultSender(companyId);
        const [company, domains, senders] = await Promise.all([
            this.prisma.company.findUnique({
                where: { id: companyId },
                select: { companyName: true, companyCode: true },
            }),
            this.prisma.emailSenderDomain.findMany({
                where: { companyId },
                orderBy: { domain: 'asc' },
            }),
            this.prisma.emailSenderIdentity.findMany({
                where: { companyId },
                orderBy: [{ isPrimary: 'desc' }, { email: 'asc' }],
            }),
        ]);
        const platformFrom = this.platformFromEmail();
        const replyTo = this.config.get('MAIL_REPLY_TO') ?? process.env.MAIL_REPLY_TO ?? platformFrom;
        const bcc = this.config.get('MAIL_BCC') ?? process.env.MAIL_BCC ?? '';
        const customDomainSenders = senders.filter((s) => s.senderType === client_1.EmailSenderType.CUSTOM_DOMAIN);
        const publicDomainSenders = senders.filter((s) => s.senderType === client_1.EmailSenderType.PUBLIC_DOMAIN);
        return {
            platform: {
                configured: this.mail.isConfigured(),
                from: platformFrom,
                replyTo,
                bcc,
                guidance: 'Platform emails (signup, password reset) use this mailbox. Business emails send from your verified primary sender via its own SMTP settings.',
            },
            companyName: company?.companyName ?? 'Company',
            customDomains: domains.map((domain) => ({
                id: domain.id,
                domain: domain.domain,
                status: domain.status,
                verifiedAt: domain.verifiedAt,
                dkimHost: domain.dkimHost,
                dkimValue: domain.dkimValue,
                senders: customDomainSenders
                    .filter((sender) => sender.domainId === domain.id)
                    .map((sender) => this.toSenderDto(sender)),
            })),
            publicSenders: publicDomainSenders.map((sender) => this.toSenderDto(sender)),
            primarySenderId: senders.find((s) => s.isPrimary)?.id ?? null,
        };
    }
    toSenderDto(sender) {
        const smtpConfigured = Boolean(sender.smtpHost && sender.smtpLastVerifiedAt);
        return {
            id: sender.id,
            displayName: sender.displayName,
            email: sender.email,
            senderType: sender.senderType,
            isPrimary: sender.isPrimary,
            status: sender.status,
            verifiedAt: sender.verifiedAt,
            domainId: sender.domainId,
            smtpConfigured,
            smtpLastVerifiedAt: sender.smtpLastVerifiedAt ?? null,
            smtpRequired: sender.status === client_1.EmailSenderStatus.VERIFIED && !smtpConfigured,
            isPublicDomain: (0, email_sender_constants_1.isPublicEmailDomain)((0, email_sender_constants_1.parseEmailDomain)(sender.email)),
        };
    }
    decryptSmtpPassword(encrypted) {
        if (!encrypted)
            return null;
        try {
            return (0, secret_cipher_1.decryptSecret)(encrypted, (0, secret_cipher_1.getSmtpCredentialsKey)());
        }
        catch {
            return null;
        }
    }
    buildSmtpConfig(sender) {
        const password = this.decryptSmtpPassword(sender.smtpPasswordEnc);
        if (!sender.smtpHost || !sender.smtpPort || !sender.smtpUser || !password)
            return null;
        return {
            host: sender.smtpHost,
            port: sender.smtpPort,
            secure: sender.smtpSecure ?? false,
            user: sender.smtpUser,
            password,
        };
    }
    assertSenderSmtpReady(sender) {
        if (sender.status !== client_1.EmailSenderStatus.VERIFIED) {
            throw new common_1.BadRequestException('Verify this sender before configuring SMTP.');
        }
        if (!this.buildSmtpConfig(sender) || !sender.smtpLastVerifiedAt) {
            throw new common_1.BadRequestException('Configure and test SMTP for this sender in Settings > Email Notifications > Sender Email.');
        }
    }
    async createSender(user, dto) {
        const companyId = this.companyId(user);
        const email = (0, email_sender_constants_1.normalizeSenderEmail)(dto.email);
        const domain = (0, email_sender_constants_1.parseEmailDomain)(email);
        if (!domain)
            throw new common_1.BadRequestException('Invalid email address');
        const company = await this.prisma.company.findUniqueOrThrow({
            where: { id: companyId },
            select: { companyCode: true },
        });
        const senderType = (0, email_sender_constants_1.isPublicEmailDomain)(domain)
            ? client_1.EmailSenderType.PUBLIC_DOMAIN
            : client_1.EmailSenderType.CUSTOM_DOMAIN;
        const existing = await this.prisma.emailSenderIdentity.findUnique({
            where: { companyId_email: { companyId, email } },
        });
        if (existing)
            throw new common_1.BadRequestException('Sender email already exists');
        let domainId = null;
        if (senderType === client_1.EmailSenderType.CUSTOM_DOMAIN) {
            const dkim = this.buildDkimRecord(company.companyCode, domain);
            const domainRow = await this.prisma.emailSenderDomain.upsert({
                where: { companyId_domain: { companyId, domain } },
                update: {},
                create: { companyId, domain, ...dkim },
            });
            domainId = domainRow.id;
        }
        const hasPrimary = await this.prisma.emailSenderIdentity.count({
            where: { companyId, isPrimary: true },
        });
        const sender = await this.prisma.emailSenderIdentity.create({
            data: {
                companyId,
                domainId,
                displayName: dto.displayName.trim(),
                email,
                senderType,
                isPrimary: hasPrimary === 0,
                status: client_1.EmailSenderStatus.PENDING,
            },
        });
        return this.toSenderDto(sender);
    }
    async updateSender(user, senderId, dto) {
        const companyId = this.companyId(user);
        const sender = await this.prisma.emailSenderIdentity.findFirst({
            where: { id: senderId, companyId },
        });
        if (!sender)
            throw new common_1.NotFoundException('Sender not found');
        if (dto.isPrimary) {
            this.assertSenderSmtpReady(sender);
        }
        return this.prisma.$transaction(async (tx) => {
            if (dto.isPrimary) {
                await tx.emailSenderIdentity.updateMany({
                    where: { companyId, isPrimary: true },
                    data: { isPrimary: false },
                });
            }
            const updated = await tx.emailSenderIdentity.update({
                where: { id: senderId },
                data: {
                    displayName: dto.displayName?.trim(),
                    isPrimary: dto.isPrimary ?? undefined,
                },
            });
            return this.toSenderDto(updated);
        });
    }
    async deleteSender(user, senderId) {
        const companyId = this.companyId(user);
        const sender = await this.prisma.emailSenderIdentity.findFirst({
            where: { id: senderId, companyId },
        });
        if (!sender)
            throw new common_1.NotFoundException('Sender not found');
        const verifiedCount = await this.prisma.emailSenderIdentity.count({
            where: { companyId, status: client_1.EmailSenderStatus.VERIFIED },
        });
        if (sender.status === client_1.EmailSenderStatus.VERIFIED && verifiedCount <= 1) {
            throw new common_1.BadRequestException('Cannot delete the only verified sender');
        }
        await this.prisma.emailSenderIdentity.delete({ where: { id: senderId } });
        if (sender.isPrimary) {
            const next = await this.prisma.emailSenderIdentity.findFirst({
                where: { companyId },
                orderBy: [{ status: 'asc' }, { createdAt: 'asc' }],
            });
            if (next) {
                await this.prisma.emailSenderIdentity.update({
                    where: { id: next.id },
                    data: { isPrimary: true },
                });
            }
        }
        return { deleted: true };
    }
    async getDomainDkim(user, domainName) {
        const companyId = this.companyId(user);
        const domain = domainName.toLowerCase().trim();
        const company = await this.prisma.company.findUniqueOrThrow({
            where: { id: companyId },
            select: { companyCode: true },
        });
        const dkim = this.buildDkimRecord(company.companyCode, domain);
        const row = await this.prisma.emailSenderDomain.upsert({
            where: { companyId_domain: { companyId, domain } },
            update: dkim,
            create: { companyId, domain, ...dkim },
        });
        return {
            domain: row.domain,
            status: row.status,
            dkimHost: row.dkimHost,
            dkimValue: row.dkimValue,
            guidance: 'Add this TXT record at your DNS provider, then click Validate. DNS changes can take up to 24 hours to propagate.',
        };
    }
    async txtRecordsMatch(host, expectedValue) {
        try {
            const records = await dns_1.promises.resolveTxt(host);
            const flat = records.map((chunks) => chunks.join('')).map((v) => v.trim());
            return flat.some((value) => value === expectedValue || value.includes(expectedValue));
        }
        catch {
            return false;
        }
    }
    async validateDomain(user, domainName) {
        const companyId = this.companyId(user);
        const domain = domainName.toLowerCase().trim();
        const row = await this.prisma.emailSenderDomain.findUnique({
            where: { companyId_domain: { companyId, domain } },
        });
        if (!row)
            throw new common_1.NotFoundException('Domain not found');
        const matched = await this.txtRecordsMatch(row.dkimHost, row.dkimValue);
        const now = new Date();
        if (!matched) {
            await this.prisma.emailSenderDomain.update({
                where: { id: row.id },
                data: { status: client_1.EmailSenderStatus.FAILED, lastCheckedAt: now },
            });
            throw new common_1.BadRequestException('DNS TXT record not found yet. Add the record at your DNS provider and try again after propagation.');
        }
        await this.prisma.$transaction([
            this.prisma.emailSenderDomain.update({
                where: { id: row.id },
                data: { status: client_1.EmailSenderStatus.VERIFIED, verifiedAt: now, lastCheckedAt: now },
            }),
            this.prisma.emailSenderIdentity.updateMany({
                where: { companyId, domainId: row.id, senderType: client_1.EmailSenderType.CUSTOM_DOMAIN },
                data: { status: client_1.EmailSenderStatus.VERIFIED, verifiedAt: now },
            }),
        ]);
        return { domain, status: client_1.EmailSenderStatus.VERIFIED, verifiedAt: now };
    }
    async sendVerificationOtp(user, senderId) {
        const companyId = this.companyId(user);
        const sender = await this.prisma.emailSenderIdentity.findFirst({
            where: { id: senderId, companyId },
            include: { company: { select: { companyName: true } } },
        });
        if (!sender)
            throw new common_1.NotFoundException('Sender not found');
        if (sender.senderType !== client_1.EmailSenderType.PUBLIC_DOMAIN) {
            throw new common_1.BadRequestException('OTP verification applies only to public-domain senders');
        }
        if (!this.mail.isConfigured()) {
            throw new common_1.BadRequestException('Platform SMTP is not configured for verification emails.');
        }
        const otpCode = String((0, crypto_1.randomInt)(100000, 999999));
        const expiresAt = new Date(Date.now() + email_sender_constants_1.SENDER_OTP_EXPIRY_MINUTES * 60 * 1000);
        await this.prisma.emailSenderVerification.create({
            data: {
                senderId: sender.id,
                otpHash: this.hashOtp(otpCode),
                expiresAt,
            },
        });
        await this.mail.sendPlatformMail({
            to: sender.email,
            subject: (0, sender_verification_otp_template_1.senderVerificationOtpSubject)(sender.company.companyName),
            text: (0, sender_verification_otp_template_1.senderVerificationOtpText)({
                displayName: sender.displayName,
                email: sender.email,
                otpCode,
                expiresMinutes: email_sender_constants_1.SENDER_OTP_EXPIRY_MINUTES,
                companyName: sender.company.companyName,
            }),
            html: (0, sender_verification_otp_template_1.senderVerificationOtpHtml)({
                displayName: sender.displayName,
                email: sender.email,
                otpCode,
                expiresMinutes: email_sender_constants_1.SENDER_OTP_EXPIRY_MINUTES,
                companyName: sender.company.companyName,
            }),
        });
        return { sent: true, expiresAt };
    }
    async verifySenderOtp(user, senderId, otpCode) {
        const companyId = this.companyId(user);
        const sender = await this.prisma.emailSenderIdentity.findFirst({
            where: { id: senderId, companyId },
        });
        if (!sender)
            throw new common_1.NotFoundException('Sender not found');
        if (sender.senderType !== client_1.EmailSenderType.PUBLIC_DOMAIN) {
            throw new common_1.BadRequestException('OTP verification applies only to public-domain senders');
        }
        const verification = await this.prisma.emailSenderVerification.findFirst({
            where: {
                senderId,
                consumedAt: null,
                expiresAt: { gt: new Date() },
            },
            orderBy: { createdAt: 'desc' },
        });
        if (!verification)
            throw new common_1.BadRequestException('Verification code expired. Resend email and try again.');
        if (verification.attemptCount >= email_sender_constants_1.SENDER_OTP_MAX_ATTEMPTS) {
            throw new common_1.BadRequestException('Too many attempts. Resend verification email.');
        }
        const valid = verification.otpHash === this.hashOtp(otpCode);
        if (!valid) {
            await this.prisma.emailSenderVerification.update({
                where: { id: verification.id },
                data: { attemptCount: { increment: 1 } },
            });
            throw new common_1.BadRequestException('Invalid verification code');
        }
        const now = new Date();
        await this.prisma.$transaction([
            this.prisma.emailSenderVerification.update({
                where: { id: verification.id },
                data: { consumedAt: now },
            }),
            this.prisma.emailSenderIdentity.update({
                where: { id: senderId },
                data: { status: client_1.EmailSenderStatus.VERIFIED, verifiedAt: now },
            }),
        ]);
        return this.toSenderDto({
            ...sender,
            status: client_1.EmailSenderStatus.VERIFIED,
            verifiedAt: now,
        });
    }
    async configureSenderSmtp(user, senderId, dto) {
        const companyId = this.companyId(user);
        const sender = await this.prisma.emailSenderIdentity.findFirst({
            where: { id: senderId, companyId },
        });
        if (!sender)
            throw new common_1.NotFoundException('Sender not found');
        if (sender.status !== client_1.EmailSenderStatus.VERIFIED) {
            throw new common_1.BadRequestException('Verify this sender before configuring SMTP.');
        }
        const now = new Date();
        const encrypted = (0, secret_cipher_1.encryptSecret)(dto.password, (0, secret_cipher_1.getSmtpCredentialsKey)());
        const updated = await this.prisma.emailSenderIdentity.update({
            where: { id: senderId },
            data: {
                smtpHost: dto.host.trim(),
                smtpPort: dto.port,
                smtpSecure: dto.secure,
                smtpUser: dto.user.trim(),
                smtpPasswordEnc: encrypted,
                smtpConfiguredAt: now,
            },
        });
        return this.toSenderDto(updated);
    }
    async testSenderSmtp(user, senderId, dto) {
        const companyId = this.companyId(user);
        const sender = await this.prisma.emailSenderIdentity.findFirst({
            where: { id: senderId, companyId },
        });
        if (!sender)
            throw new common_1.NotFoundException('Sender not found');
        if (sender.status !== client_1.EmailSenderStatus.VERIFIED) {
            throw new common_1.BadRequestException('Verify this sender before testing SMTP.');
        }
        let smtp;
        if (dto) {
            smtp = {
                host: dto.host.trim(),
                port: dto.port,
                secure: dto.secure,
                user: dto.user.trim(),
                password: dto.password,
            };
        }
        else {
            const built = this.buildSmtpConfig(sender);
            if (!built) {
                throw new common_1.BadRequestException('Save SMTP settings before running a test.');
            }
            smtp = built;
        }
        await this.mail.sendViaSmtp(smtp, {
            to: sender.email,
            subject: 'SoftdigitIMS — sender SMTP test',
            text: `This confirms SMTP for ${sender.email} is working.`,
            html: `<p>This confirms SMTP for <strong>${sender.email}</strong> is working.</p>`,
            fromName: sender.displayName,
            fromEmail: sender.email,
        });
        const now = new Date();
        if (dto) {
            const encrypted = (0, secret_cipher_1.encryptSecret)(dto.password, (0, secret_cipher_1.getSmtpCredentialsKey)());
            await this.prisma.emailSenderIdentity.update({
                where: { id: senderId },
                data: {
                    smtpHost: dto.host.trim(),
                    smtpPort: dto.port,
                    smtpSecure: dto.secure,
                    smtpUser: dto.user.trim(),
                    smtpPasswordEnc: encrypted,
                    smtpConfiguredAt: now,
                    smtpLastVerifiedAt: now,
                },
            });
        }
        else {
            await this.prisma.emailSenderIdentity.update({
                where: { id: senderId },
                data: { smtpLastVerifiedAt: now },
            });
        }
        return { ok: true, testedAt: now, to: sender.email };
    }
    async resolveTenantSender(companyId) {
        const sender = await this.prisma.emailSenderIdentity.findFirst({
            where: {
                companyId,
                isPrimary: true,
                status: client_1.EmailSenderStatus.VERIFIED,
            },
        });
        if (!sender) {
            throw new common_1.BadRequestException('Configure and verify a sender email in Settings > Customization > Email Notifications.');
        }
        this.assertSenderSmtpReady(sender);
        const smtp = this.buildSmtpConfig(sender);
        if (!smtp) {
            throw new common_1.BadRequestException('Configure and test SMTP for your primary sender in Settings > Email Notifications.');
        }
        return {
            senderId: sender.id,
            fromEmail: sender.email,
            fromName: sender.displayName,
            replyTo: sender.email,
            mode: 'tenant_smtp',
            senderEmail: sender.email,
            displayName: sender.displayName,
            smtp,
        };
    }
    async hasVerifiedPrimarySender(companyId) {
        const count = await this.prisma.emailSenderIdentity.count({
            where: { companyId, isPrimary: true, status: client_1.EmailSenderStatus.VERIFIED },
        });
        return count > 0;
    }
};
exports.EmailSenderService = EmailSenderService;
exports.EmailSenderService = EmailSenderService = __decorate([
    (0, common_1.Injectable)(),
    __param(1, (0, common_1.Inject)((0, common_1.forwardRef)(() => mail_service_1.MailService))),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        mail_service_1.MailService,
        config_1.ConfigService])
], EmailSenderService);
//# sourceMappingURL=email-sender.service.js.map