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
exports.PlatformSubscriptionsController = void 0;
const common_1 = require("@nestjs/common");
const client_1 = require("@prisma/client");
const swagger_1 = require("@nestjs/swagger");
const current_user_decorator_1 = require("../../common/decorators/current-user.decorator");
const subscription_invoice_service_1 = require("../subscription-lifecycle/subscription-invoice.service");
const platform_admin_guard_1 = require("./platform-admin.guard");
const platform_audit_service_1 = require("./platform-audit.service");
const platform_subscriptions_service_1 = require("./platform-subscriptions.service");
let PlatformSubscriptionsController = class PlatformSubscriptionsController {
    platform;
    invoices;
    platformAudit;
    constructor(platform, invoices, platformAudit) {
        this.platform = platform;
        this.invoices = invoices;
        this.platformAudit = platformAudit;
    }
    async dashboard(user) {
        await this.platformAudit.logPlatformAction({
            userId: user.id,
            adminEmail: user.email,
            action: 'platform_dashboard_view',
        });
        return this.platform.getDashboard();
    }
    async backfillInvoices(user) {
        const result = await this.invoices.backfillAllPaidCompanies();
        await this.platformAudit.logPlatformAction({
            userId: user.id,
            adminEmail: user.email,
            action: 'platform_subscription_backfill',
            entityType: 'PlatformSubscription',
            entityId: user.id,
            auditAction: client_1.AuditAction.POST,
            extra: { result },
        });
        return result;
    }
};
exports.PlatformSubscriptionsController = PlatformSubscriptionsController;
__decorate([
    (0, common_1.Get)('dashboard'),
    (0, swagger_1.ApiOperation)({ summary: 'Platform super-admin subscription conversion dashboard' }),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], PlatformSubscriptionsController.prototype, "dashboard", null);
__decorate([
    (0, common_1.Post)('backfill-invoices'),
    (0, swagger_1.ApiOperation)({ summary: 'Backfill SaaS subscription invoices for all paid companies' }),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], PlatformSubscriptionsController.prototype, "backfillInvoices", null);
exports.PlatformSubscriptionsController = PlatformSubscriptionsController = __decorate([
    (0, swagger_1.ApiTags)('platform'),
    (0, common_1.Controller)('platform/subscriptions'),
    (0, common_1.UseGuards)(platform_admin_guard_1.PlatformAdminGuard),
    __metadata("design:paramtypes", [platform_subscriptions_service_1.PlatformSubscriptionsService,
        subscription_invoice_service_1.SubscriptionInvoiceService,
        platform_audit_service_1.PlatformAuditService])
], PlatformSubscriptionsController);
//# sourceMappingURL=platform-subscriptions.controller.js.map