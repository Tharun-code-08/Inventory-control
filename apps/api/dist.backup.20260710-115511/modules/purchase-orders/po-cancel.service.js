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
var PoCancelService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.PoCancelService = void 0;
const common_1 = require("@nestjs/common");
const crypto_1 = require("crypto");
const mail_service_1 = require("../../common/mail/mail.service");
const prisma_service_1 = require("../../prisma/prisma.service");
const purchase_orders_service_1 = require("./purchase-orders.service");
const OTP_TTL_MINUTES = 10;
const OTP_MAX_ATTEMPTS = 5;
let PoCancelService = PoCancelService_1 = class PoCancelService {
    prisma;
    mail;
    purchaseOrders;
    logger = new common_1.Logger(PoCancelService_1.name);
    constructor(prisma, mail, purchaseOrders) {
        this.prisma = prisma;
        this.mail = mail;
        this.purchaseOrders = purchaseOrders;
    }
    hashOtp(otp) {
        return (0, crypto_1.createHash)('sha256').update(otp).digest('hex');
    }
    generateOtp() {
        return String((0, crypto_1.randomInt)(100_000, 1_000_000));
    }
    async requestCancel(user, poId, reason) {
        const trimmedReason = reason?.trim();
        if (!trimmedReason)
            throw new common_1.BadRequestException('Cancellation reason is required');
        const po = await this.purchaseOrders.assertCancelAllowed(user, poId);
        const account = await this.prisma.user.findUnique({
            where: { id: user.id },
            select: { email: true, name: true },
        });
        if (!account?.email) {
            throw new common_1.BadRequestException('Your account has no email address for OTP delivery');
        }
        const otp = this.generateOtp();
        const expiresAt = new Date(Date.now() + OTP_TTL_MINUTES * 60_000);
        await this.prisma.poCancelVerification.create({
            data: {
                poId,
                userId: user.id,
                reason: trimmedReason,
                otpHash: this.hashOtp(otp),
                expiresAt,
            },
        });
        try {
            const bodyText = [
                `Hello${account.name ? ` ${account.name}` : ''},`,
                '',
                `Use this code to cancel purchase order ${po.poNumber}:`,
                '',
                otp,
                '',
                `Reason: ${trimmedReason}`,
                '',
                `This code expires in ${OTP_TTL_MINUTES} minutes.`,
            ].join('\n');
            await this.mail.sendMail({
                to: account.email,
                subject: `PO cancellation code — ${po.poNumber}`,
                text: bodyText,
                html: `<pre style="font-family: sans-serif; white-space: pre-wrap;">${bodyText}</pre>`,
            });
        }
        catch (err) {
            this.logger.warn(`Failed to send PO cancel OTP: ${String(err)}`);
            throw new common_1.BadRequestException('Could not send cancellation code email. Try again.');
        }
        return { ok: true, message: 'A cancellation code was sent to your email.' };
    }
    async confirmCancel(user, poId, reason, otp) {
        const trimmedReason = reason?.trim();
        const trimmedOtp = otp?.trim();
        if (!trimmedReason || !trimmedOtp) {
            throw new common_1.BadRequestException('Reason and OTP are required');
        }
        const verification = await this.prisma.poCancelVerification.findFirst({
            where: {
                poId,
                userId: user.id,
                consumedAt: null,
                expiresAt: { gt: new Date() },
            },
            orderBy: { createdAt: 'desc' },
        });
        if (!verification) {
            throw new common_1.UnauthorizedException('No active cancellation code. Request a new one.');
        }
        if (verification.reason !== trimmedReason) {
            throw new common_1.BadRequestException('Reason does not match the cancellation request');
        }
        if (verification.attemptCount >= OTP_MAX_ATTEMPTS) {
            throw new common_1.UnauthorizedException('Too many invalid attempts. Request a new code.');
        }
        if (verification.otpHash !== this.hashOtp(trimmedOtp)) {
            await this.prisma.poCancelVerification.update({
                where: { id: verification.id },
                data: { attemptCount: { increment: 1 } },
            });
            throw new common_1.UnauthorizedException('Invalid cancellation code');
        }
        await this.prisma.poCancelVerification.update({
            where: { id: verification.id },
            data: { consumedAt: new Date() },
        });
        return this.purchaseOrders.cancel(user, poId);
    }
};
exports.PoCancelService = PoCancelService;
exports.PoCancelService = PoCancelService = PoCancelService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        mail_service_1.MailService,
        purchase_orders_service_1.PurchaseOrdersService])
], PoCancelService);
//# sourceMappingURL=po-cancel.service.js.map