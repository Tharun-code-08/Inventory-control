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
var NotificationProcessor_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.NotificationProcessor = void 0;
const bullmq_1 = require("@nestjs/bullmq");
const common_1 = require("@nestjs/common");
const client_1 = require("@prisma/client");
const bullmq_2 = require("bullmq");
const prisma_service_1 = require("../../../prisma/prisma.service");
const reports_service_1 = require("../../reports/reports.service");
const whatsapp_adapter_1 = require("../channels/whatsapp/whatsapp.adapter");
const link_service_1 = require("../link/link.service");
const notification_jobs_1 = require("./notification-jobs");
function p(text) {
    return { type: 'text', text: String(text) };
}
function num(value, fallback = '0') {
    const n = Number(value ?? 0);
    return Number.isFinite(n) ? String(n) : fallback;
}
function amount(value) {
    const n = Number(value ?? 0);
    return Number.isFinite(n) ? n.toLocaleString('en-IN') : String(value ?? '0');
}
let NotificationProcessor = NotificationProcessor_1 = class NotificationProcessor extends bullmq_1.WorkerHost {
    prisma;
    reports;
    links;
    adapter;
    logger = new common_1.Logger(NotificationProcessor_1.name);
    constructor(prisma, reports, links, adapter) {
        super();
        this.prisma = prisma;
        this.reports = reports;
        this.links = links;
        this.adapter = adapter;
    }
    async process(job) {
        if (!this.adapter.isConfigured()) {
            throw new bullmq_2.UnrecoverableError('WhatsApp adapter not configured; notification skipped');
        }
        const { type, companyId } = job.data;
        const activeLinks = await this.activeLinks(companyId);
        if (activeLinks.length === 0)
            return { sent: 0 };
        let sent = 0;
        for (const link of activeLinks) {
            try {
                const user = await this.links.buildRequestUser(link);
                if (!user)
                    continue;
                const userName = await this.resolveUserName(user.id);
                const companyName = await this.resolveCompanyName(link.companyId);
                let payload = null;
                if (type === 'daily_summary') {
                    payload = await this.buildDailySummary(job.data, user, companyName);
                }
                else if (type === 'low_stock_alert') {
                    payload = await this.buildLowStockAlert(job.data, user, userName, companyName);
                }
                else if (type === 'overdue_payment') {
                    payload = await this.buildOverduePayment(job.data, user, userName, companyName);
                }
                if (payload) {
                    await this.sendToLink(link, payload);
                    sent++;
                }
            }
            catch (err) {
                this.logger.warn(`Notification ${type} for link ${link.id} failed: ${err.message}`);
            }
        }
        return { sent };
    }
    async buildDailySummary(_job, user, companyName) {
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);
        const yStr = yesterday.toISOString().slice(0, 10);
        let overview;
        try {
            overview = (await this.reports.analyticsOverview(user, {
                date_from: yStr,
                date_to: yStr,
            }));
        }
        catch {
            return null;
        }
        return {
            kind: 'template',
            name: 'daily_business_summary',
            components: [
                {
                    type: 'header',
                    parameters: [p(companyName)],
                },
                {
                    type: 'body',
                    parameters: [
                        p(yStr),
                        p(num(overview.salesOrderCount)),
                        p(amount(overview.totalRevenue)),
                        p(num(overview.lowStockCount)),
                        p(num(overview.overdueInvoiceCount)),
                    ],
                },
            ],
        };
    }
    async buildLowStockAlert(_job, user, userName, companyName) {
        let items;
        try {
            items = (await this.reports.lowStock(user));
        }
        catch {
            return null;
        }
        if (items.length === 0)
            return null;
        const MAX_LINES = 5;
        const shown = items.slice(0, MAX_LINES);
        const more = items.length - MAX_LINES;
        const lines = shown.map((r) => `• ${r.description ?? r.product_code ?? 'Unknown'}: ${r.current_stock ?? 0} (min ${r.min_stock_level ?? 0})`);
        if (more > 0)
            lines.push(`…and ${more} more`);
        const itemsList = lines.join('\n');
        return {
            kind: 'template',
            name: 'low_stock_alert',
            components: [
                {
                    type: 'body',
                    parameters: [p(userName), p(companyName), p(itemsList)],
                },
            ],
        };
    }
    async buildOverduePayment(_job, user, userName, companyName) {
        let result;
        try {
            result = (await this.reports.customerAging(user, {
                show_overdue_only: true,
                sort_by: 'overdueAmount',
                limit: 5,
            }));
        }
        catch {
            return null;
        }
        const customers = result.data ?? [];
        if (customers.length === 0)
            return null;
        const overdueCount = num(result.summary?.overdue_customers ?? customers.length);
        const totalAmount = amount(result.summary?.total_overdue);
        const oldestDays = num(result.summary?.oldest_overdue_days ?? customers[0]?.oldest_overdue_days ?? 0);
        return {
            kind: 'template',
            name: 'overdue_payment_reminder',
            components: [
                {
                    type: 'header',
                    parameters: [p(userName)],
                },
                {
                    type: 'body',
                    parameters: [
                        p(userName),
                        p(overdueCount),
                        p(companyName),
                        p(totalAmount),
                        p(oldestDays),
                    ],
                },
            ],
        };
    }
    async resolveUserName(userId) {
        const user = await this.prisma.user.findUnique({ where: { id: userId }, select: { name: true } });
        return user?.name ?? 'there';
    }
    async resolveCompanyName(companyId) {
        if (!companyId)
            return 'your company';
        const company = await this.prisma.company.findUnique({ where: { id: companyId }, select: { companyName: true } });
        return company?.companyName ?? 'your company';
    }
    async activeLinks(companyId) {
        return this.prisma.userChannelLink.findMany({
            where: {
                companyId,
                channel: client_1.ChatChannel.WHATSAPP,
                status: client_1.ChannelLinkStatus.ACTIVE,
            },
        });
    }
    async sendToLink(link, payload) {
        const body = payload.kind === 'text' ? payload.body : `[${payload.name}]`;
        const conversation = await this.getOrCreateConversation(link);
        const message = await this.prisma.message.create({
            data: {
                conversationId: conversation.id,
                direction: client_1.MessageDirection.OUT,
                body,
                status: client_1.ChatMessageStatus.QUEUED,
            },
        });
        let result;
        if (payload.kind === 'template') {
            result = await this.adapter.sendTemplate({
                to: link.phoneNumber,
                name: payload.name,
                languageCode: 'en',
                components: payload.components,
            });
        }
        else {
            result = await this.adapter.sendText({ to: link.phoneNumber, body: payload.body });
        }
        await this.prisma.message.update({
            where: { id: message.id },
            data: {
                status: client_1.ChatMessageStatus.SENT,
                waMessageId: result.providerMessageId,
                error: null,
            },
        });
    }
    async getOrCreateConversation(link) {
        const existing = await this.prisma.conversation.findFirst({
            where: { userChannelLinkId: link.id, status: client_1.ConversationStatus.ACTIVE },
            orderBy: { createdAt: 'desc' },
        });
        if (existing)
            return existing;
        return this.prisma.conversation.create({
            data: { companyId: link.companyId, userChannelLinkId: link.id },
        });
    }
};
exports.NotificationProcessor = NotificationProcessor;
exports.NotificationProcessor = NotificationProcessor = NotificationProcessor_1 = __decorate([
    (0, bullmq_1.Processor)(notification_jobs_1.NOTIFICATION_QUEUE),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        reports_service_1.ReportsService,
        link_service_1.LinkService,
        whatsapp_adapter_1.WhatsAppAdapter])
], NotificationProcessor);
//# sourceMappingURL=notification.processor.js.map