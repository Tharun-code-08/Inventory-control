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
exports.AiSettingsService = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const prisma_service_1 = require("../../../prisma/prisma.service");
const DEFAULT_FEATURE_FLAGS = {
    stock: true,
    sales: true,
    purchase: true,
};
let AiSettingsService = class AiSettingsService {
    prisma;
    config;
    constructor(prisma, config) {
        this.prisma = prisma;
        this.config = config;
    }
    async forCompany(companyId) {
        const row = await this.prisma.aiSettings.findUnique({ where: { companyId } });
        const flagsRow = row?.featureFlags && typeof row.featureFlags === 'object' && !Array.isArray(row.featureFlags)
            ? row.featureFlags
            : {};
        const defaultModel = this.config.getOrThrow('AI_MODEL');
        return {
            provider: row?.provider ?? 'deepseek',
            models: {
                intent: row?.intentModel ?? defaultModel,
                reasoning: row?.reasoningModel ?? defaultModel,
                escalation: row?.escalationModel ?? defaultModel,
            },
            featureFlags: { ...DEFAULT_FEATURE_FLAGS, ...flagsRow },
            dailyRequestLimit: row?.dailyRequestLimit ?? this.numberOrNull('AI_DAILY_REQUEST_LIMIT'),
            monthlyTokenLimit: row?.monthlyTokenLimit ?? this.numberOrNull('AI_MONTHLY_TOKEN_LIMIT'),
            monthlyCostCentsLimit: row?.monthlyCostCentsLimit ?? null,
            systemPrompt: row?.systemPrompt ?? null,
            promptVersion: row?.promptVersion ?? 0,
        };
    }
    async updateSystemPrompt(companyId, body, updatedBy) {
        return this.prisma.$transaction(async (tx) => {
            const current = await tx.aiSettings.findUnique({ where: { companyId } });
            const nextVersion = (current?.promptVersion ?? 0) + 1;
            await tx.aiPromptHistory.create({
                data: { companyId, version: nextVersion, body, createdById: updatedBy ?? null },
            });
            return tx.aiSettings.upsert({
                where: { companyId },
                create: { companyId, systemPrompt: body, promptVersion: nextVersion },
                update: { systemPrompt: body, promptVersion: nextVersion },
            });
        });
    }
    async updateSettings(companyId, patch) {
        return this.prisma.aiSettings.upsert({
            where: { companyId },
            create: { companyId, ...patch },
            update: patch,
        });
    }
    async promptHistory(companyId) {
        return this.prisma.aiPromptHistory.findMany({
            where: { companyId },
            orderBy: { version: 'desc' },
            select: { version: true, body: true, createdAt: true, createdById: true },
        });
    }
    numberOrNull(key) {
        const value = Number(this.config.get(key));
        return Number.isFinite(value) && value > 0 ? value : null;
    }
};
exports.AiSettingsService = AiSettingsService;
exports.AiSettingsService = AiSettingsService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        config_1.ConfigService])
], AiSettingsService);
//# sourceMappingURL=ai-settings.service.js.map