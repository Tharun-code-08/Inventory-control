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
var PlatformNotificationService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.PlatformNotificationService = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const client_1 = require("@prisma/client");
const prisma_service_1 = require("../../prisma/prisma.service");
const platform_admin_util_1 = require("../platform/platform-admin.util");
let PlatformNotificationService = PlatformNotificationService_1 = class PlatformNotificationService {
    prisma;
    config;
    mail;
    logger = new common_1.Logger(PlatformNotificationService_1.name);
    constructor(prisma, config, mail = null) {
        this.prisma = prisma;
        this.config = config;
        this.mail = mail;
    }
    parseAdminEmails() {
        return [...(0, platform_admin_util_1.parsePlatformAdminEmailsFromConfig)(this.config)];
    }
    async hasRecentDuplicate(args) {
        const since = new Date(Date.now() - args.dedupeHours * 60 * 60 * 1000);
        const existing = await this.prisma.platformNotification.findFirst({
            where: {
                notificationKey: args.notificationKey,
                referenceId: args.referenceId ?? null,
                createdAt: { gte: since },
            },
            select: { id: true },
        });
        return Boolean(existing);
    }
    async dispatch(args) {
        const dedupeHours = args.dedupeHours ?? 24;
        const duplicate = await this.hasRecentDuplicate({
            notificationKey: args.notificationKey,
            referenceId: args.referenceId,
            dedupeHours,
        });
        if (duplicate)
            return { skipped: 'duplicate' };
        const notification = await this.prisma.platformNotification.create({
            data: {
                category: args.category,
                severity: args.severity,
                notificationKey: args.notificationKey,
                title: args.title,
                message: args.message,
                actionUrl: args.actionUrl ?? null,
                referenceType: args.referenceType ?? null,
                referenceId: args.referenceId ?? null,
                companyId: args.companyId ?? null,
            },
        });
        if (args.emailImmediate && this.mail?.isConfigured()) {
            await this.emailAdmins({
                title: args.severity === client_1.PlatformNotificationSeverity.CRITICAL
                    ? `[CRITICAL] ${args.title}`
                    : args.title,
                message: args.message,
                dedupe: args.emailDedupe,
            }).catch((error) => {
                this.logger.warn(`Platform admin email failed: ${String(error)}`);
            });
        }
        return { notificationId: notification.id };
    }
    async emailAdmins(args) {
        const recipients = this.parseAdminEmails();
        if (recipients.length === 0)
            return { sent: 0 };
        let sent = 0;
        for (const to of recipients) {
            if (args.dedupe) {
                const existing = await this.prisma.emailDeliveryLog.findUnique({
                    where: {
                        templateId_entityType_entityId_recipient: {
                            templateId: args.dedupe.templateId,
                            entityType: args.dedupe.entityType,
                            entityId: args.dedupe.entityId,
                            recipient: to,
                        },
                    },
                });
                if (existing)
                    continue;
            }
            await this.mail.sendMail({
                to,
                subject: args.title,
                text: args.message,
                html: `<p>${args.message}</p>`,
                fromName: 'SoftdigitIMS Platform',
            });
            if (args.dedupe) {
                await this.prisma.emailDeliveryLog.create({
                    data: {
                        templateId: args.dedupe.templateId,
                        entityType: args.dedupe.entityType,
                        entityId: args.dedupe.entityId,
                        recipient: to,
                    },
                });
            }
            sent += 1;
        }
        return { sent };
    }
    async listForAdmin(adminEmail, opts) {
        const email = adminEmail.toLowerCase();
        const rows = await this.prisma.platformNotification.findMany({
            where: opts?.unreadOnly
                ? { reads: { none: { adminEmail: email } } }
                : undefined,
            orderBy: { createdAt: 'desc' },
            take: opts?.limit ?? 100,
            include: {
                reads: {
                    where: { adminEmail: email },
                    select: { readAt: true },
                },
            },
        });
        return rows.map((row) => ({
            id: row.id,
            category: row.category,
            severity: row.severity,
            notificationKey: row.notificationKey,
            title: row.title,
            message: row.message,
            actionUrl: row.actionUrl,
            companyId: row.companyId,
            referenceType: row.referenceType,
            referenceId: row.referenceId,
            createdAt: row.createdAt.toISOString(),
            isRead: row.reads.length > 0,
            readAt: row.reads[0]?.readAt?.toISOString() ?? null,
        }));
    }
    async unreadCount(adminEmail) {
        const items = await this.listForAdmin(adminEmail, { unreadOnly: true, limit: 200 });
        return { count: items.length };
    }
    async markRead(adminEmail, notificationId) {
        await this.prisma.platformNotificationRead.upsert({
            where: {
                notificationId_adminEmail: {
                    notificationId,
                    adminEmail: adminEmail.toLowerCase(),
                },
            },
            create: { notificationId, adminEmail: adminEmail.toLowerCase() },
            update: { readAt: new Date() },
        });
        return { ok: true };
    }
    async markAllRead(adminEmail) {
        const unread = await this.listForAdmin(adminEmail, { unreadOnly: true, limit: 500 });
        if (unread.length === 0)
            return { updated: 0 };
        await this.prisma.platformNotificationRead.createMany({
            data: unread.map((row) => ({
                notificationId: row.id,
                adminEmail: adminEmail.toLowerCase(),
            })),
            skipDuplicates: true,
        });
        return { updated: unread.length };
    }
};
exports.PlatformNotificationService = PlatformNotificationService;
exports.PlatformNotificationService = PlatformNotificationService = PlatformNotificationService_1 = __decorate([
    (0, common_1.Injectable)(),
    __param(2, (0, common_1.Optional)()),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        config_1.ConfigService, Object])
], PlatformNotificationService);
//# sourceMappingURL=platform-notification.service.js.map