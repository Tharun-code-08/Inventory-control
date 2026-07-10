"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.PlatformModule = void 0;
const common_1 = require("@nestjs/common");
const prisma_module_1 = require("../../prisma/prisma.module");
const subscription_lifecycle_module_1 = require("../subscription-lifecycle/subscription-lifecycle.module");
const email_tracking_controller_1 = require("./email-tracking.controller");
const platform_admin_guard_1 = require("./platform-admin.guard");
const platform_subscriptions_controller_1 = require("./platform-subscriptions.controller");
const platform_audit_service_1 = require("./platform-audit.service");
const platform_subscriptions_service_1 = require("./platform-subscriptions.service");
let PlatformModule = class PlatformModule {
};
exports.PlatformModule = PlatformModule;
exports.PlatformModule = PlatformModule = __decorate([
    (0, common_1.Module)({
        imports: [prisma_module_1.PrismaModule, subscription_lifecycle_module_1.SubscriptionLifecycleModule],
        controllers: [platform_subscriptions_controller_1.PlatformSubscriptionsController, email_tracking_controller_1.EmailTrackingController],
        providers: [platform_subscriptions_service_1.PlatformSubscriptionsService, platform_admin_guard_1.PlatformAdminGuard, platform_audit_service_1.PlatformAuditService],
        exports: [platform_admin_guard_1.PlatformAdminGuard, platform_audit_service_1.PlatformAuditService],
    })
], PlatformModule);
//# sourceMappingURL=platform.module.js.map