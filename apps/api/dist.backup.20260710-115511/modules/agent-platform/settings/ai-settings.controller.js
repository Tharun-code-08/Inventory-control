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
exports.AiSettingsController = void 0;
const common_1 = require("@nestjs/common");
const swagger_1 = require("@nestjs/swagger");
const class_validator_1 = require("class-validator");
const swagger_2 = require("@nestjs/swagger");
const class_transformer_1 = require("class-transformer");
const current_user_decorator_1 = require("../../../common/decorators/current-user.decorator");
const require_permission_decorator_1 = require("../../../common/decorators/require-permission.decorator");
const ai_settings_service_1 = require("./ai-settings.service");
const platform_health_service_1 = require("../ai/platform-health.service");
class UpdateAiSettingsDto {
    provider;
    intentModel;
    reasoningModel;
    escalationModel;
    featureFlags;
    dailyRequestLimit;
    monthlyTokenLimit;
    monthlyCostCentsLimit;
}
__decorate([
    (0, swagger_2.ApiPropertyOptional)({ example: 'deepseek' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsIn)(['deepseek']),
    __metadata("design:type", String)
], UpdateAiSettingsDto.prototype, "provider", void 0);
__decorate([
    (0, swagger_2.ApiPropertyOptional)(),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], UpdateAiSettingsDto.prototype, "intentModel", void 0);
__decorate([
    (0, swagger_2.ApiPropertyOptional)(),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], UpdateAiSettingsDto.prototype, "reasoningModel", void 0);
__decorate([
    (0, swagger_2.ApiPropertyOptional)(),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], UpdateAiSettingsDto.prototype, "escalationModel", void 0);
__decorate([
    (0, swagger_2.ApiPropertyOptional)({ description: 'Feature-flag overrides: { stock, sales, purchase, … }' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsObject)(),
    __metadata("design:type", Object)
], UpdateAiSettingsDto.prototype, "featureFlags", void 0);
__decorate([
    (0, swagger_2.ApiPropertyOptional)({ description: 'Max AI requests per day (null = unlimited)' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsInt)(),
    (0, class_validator_1.Min)(1),
    (0, class_transformer_1.Type)(() => Number),
    __metadata("design:type", Object)
], UpdateAiSettingsDto.prototype, "dailyRequestLimit", void 0);
__decorate([
    (0, swagger_2.ApiPropertyOptional)({ description: 'Max AI tokens per month (null = unlimited)' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsInt)(),
    (0, class_validator_1.Min)(1),
    (0, class_transformer_1.Type)(() => Number),
    __metadata("design:type", Object)
], UpdateAiSettingsDto.prototype, "monthlyTokenLimit", void 0);
__decorate([
    (0, swagger_2.ApiPropertyOptional)({ description: 'Max AI cost per month in cents (null = unlimited)' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsInt)(),
    (0, class_validator_1.Min)(1),
    (0, class_transformer_1.Type)(() => Number),
    __metadata("design:type", Object)
], UpdateAiSettingsDto.prototype, "monthlyCostCentsLimit", void 0);
class UpdateSystemPromptDto {
    body;
}
__decorate([
    (0, swagger_2.ApiPropertyOptional)({ description: 'New system-prompt body; leave blank to reset to the platform default' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], UpdateSystemPromptDto.prototype, "body", void 0);
let AiSettingsController = class AiSettingsController {
    settings;
    health;
    constructor(settings, health) {
        this.settings = settings;
        this.health = health;
    }
    async get(user) {
        if (!user.companyId)
            return null;
        return this.settings.forCompany(user.companyId);
    }
    async update(user, dto) {
        if (!user.companyId)
            return null;
        await this.settings.updateSettings(user.companyId, dto);
        return this.settings.forCompany(user.companyId);
    }
    async updatePrompt(user, dto) {
        if (!user.companyId)
            return null;
        return this.settings.updateSystemPrompt(user.companyId, dto.body ?? '', user.id);
    }
    async promptHistory(user) {
        if (!user.companyId)
            return [];
        return this.settings.promptHistory(user.companyId);
    }
    circuitHealth() {
        return this.health.status();
    }
};
exports.AiSettingsController = AiSettingsController;
__decorate([
    (0, require_permission_decorator_1.RequirePermission)('api:manage'),
    (0, common_1.Get)(),
    (0, swagger_1.ApiOperation)({ summary: "Get effective AI settings for the caller's company" }),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], AiSettingsController.prototype, "get", null);
__decorate([
    (0, require_permission_decorator_1.RequirePermission)('api:manage'),
    (0, common_1.Patch)(),
    (0, swagger_1.ApiOperation)({ summary: 'Update provider / model / feature-flag / budget settings' }),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, UpdateAiSettingsDto]),
    __metadata("design:returntype", Promise)
], AiSettingsController.prototype, "update", null);
__decorate([
    (0, require_permission_decorator_1.RequirePermission)('api:manage'),
    (0, common_1.Post)('prompt'),
    (0, swagger_1.ApiOperation)({ summary: 'Update the system prompt (creates a versioned history entry)' }),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, UpdateSystemPromptDto]),
    __metadata("design:returntype", Promise)
], AiSettingsController.prototype, "updatePrompt", null);
__decorate([
    (0, require_permission_decorator_1.RequirePermission)('api:manage'),
    (0, common_1.Get)('prompt/history'),
    (0, swagger_1.ApiOperation)({ summary: 'List all historical system-prompt versions' }),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], AiSettingsController.prototype, "promptHistory", null);
__decorate([
    (0, require_permission_decorator_1.RequirePermission)('api:manage'),
    (0, common_1.Get)('health'),
    (0, swagger_1.ApiOperation)({ summary: 'Circuit-breaker status for AI/WhatsApp/DB dependencies' }),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], AiSettingsController.prototype, "circuitHealth", null);
exports.AiSettingsController = AiSettingsController = __decorate([
    (0, swagger_1.ApiTags)('agent-platform/settings'),
    (0, swagger_1.ApiBearerAuth)(),
    (0, common_1.Controller)('agent-platform/settings'),
    __metadata("design:paramtypes", [ai_settings_service_1.AiSettingsService,
        platform_health_service_1.PlatformHealthService])
], AiSettingsController);
//# sourceMappingURL=ai-settings.controller.js.map