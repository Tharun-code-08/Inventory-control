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
Object.defineProperty(exports, "__esModule", { value: true });
exports.UsageLimitService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../../../../prisma/prisma.service");
let UsageLimitService = class UsageLimitService {
    prisma;
    constructor(prisma) {
        this.prisma = prisma;
    }
    async check(companyId, settings) {
        const now = new Date();
        const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
        const [todayCount, monthAgg] = await Promise.all([
            settings.dailyRequestLimit
                ? this.prisma.aiUsageLog.count({
                    where: { companyId, createdAt: { gte: startOfDay } },
                })
                : Promise.resolve(0),
            settings.monthlyTokenLimit || settings.monthlyCostCentsLimit
                ? this.prisma.aiUsageLog.aggregate({
                    where: { companyId, createdAt: { gte: startOfMonth } },
                    _sum: { inputTokens: true, outputTokens: true, costCents: true },
                })
                : Promise.resolve(null),
        ]);
        if (settings.dailyRequestLimit && todayCount >= settings.dailyRequestLimit) {
            return { allowed: false, reason: 'daily_requests' };
        }
        if (monthAgg) {
            const tokens = (monthAgg._sum.inputTokens ?? 0) + (monthAgg._sum.outputTokens ?? 0);
            if (settings.monthlyTokenLimit && tokens >= settings.monthlyTokenLimit) {
                return { allowed: false, reason: 'monthly_tokens' };
            }
            const cost = monthAgg._sum.costCents ?? 0;
            if (settings.monthlyCostCentsLimit && cost >= settings.monthlyCostCentsLimit) {
                return { allowed: false, reason: 'monthly_cost' };
            }
        }
        return { allowed: true };
    }
    async record(entry) {
        await this.prisma.aiUsageLog.create({
            data: {
                companyId: entry.companyId,
                conversationId: entry.conversationId,
                model: entry.model,
                role: entry.role,
                inputTokens: entry.inputTokens,
                outputTokens: entry.outputTokens,
                costCents: entry.costCents,
                toolDurationMs: entry.toolDurationMs,
                toolErrors: entry.toolErrors,
                toolCallCount: entry.toolCallCount ?? 0,
                toolRounds: entry.toolRounds ?? 0,
                durationMs: entry.durationMs ?? null,
                timedOut: entry.timedOut ?? false,
                escalated: entry.escalated ?? false,
                humanHandoff: entry.humanHandoff ?? false,
            },
        });
    }
};
exports.UsageLimitService = UsageLimitService;
exports.UsageLimitService = UsageLimitService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], UsageLimitService);
//# sourceMappingURL=usage-limit.service.js.map