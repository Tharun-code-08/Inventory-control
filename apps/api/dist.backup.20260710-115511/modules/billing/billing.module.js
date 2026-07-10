"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.BillingModule = void 0;
const common_1 = require("@nestjs/common");
const billing_controller_1 = require("./billing.controller");
const billing_webhook_controller_1 = require("./billing-webhook.controller");
const razorpay_service_1 = require("./razorpay.service");
const subscription_service_1 = require("./subscription.service");
const subscription_lifecycle_module_1 = require("../subscription-lifecycle/subscription-lifecycle.module");
const platform_notifications_module_1 = require("../platform-notifications/platform-notifications.module");
let BillingModule = class BillingModule {
};
exports.BillingModule = BillingModule;
exports.BillingModule = BillingModule = __decorate([
    (0, common_1.Module)({
        imports: [(0, common_1.forwardRef)(() => subscription_lifecycle_module_1.SubscriptionLifecycleModule), platform_notifications_module_1.PlatformNotificationsModule],
        controllers: [billing_controller_1.BillingController, billing_webhook_controller_1.BillingWebhookController],
        providers: [razorpay_service_1.RazorpayService, subscription_service_1.SubscriptionService],
        exports: [razorpay_service_1.RazorpayService, subscription_service_1.SubscriptionService],
    })
], BillingModule);
//# sourceMappingURL=billing.module.js.map