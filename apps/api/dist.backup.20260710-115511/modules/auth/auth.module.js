"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuthModule = void 0;
const common_1 = require("@nestjs/common");
const passport_1 = require("@nestjs/passport");
const billing_module_1 = require("../billing/billing.module");
const subscription_lifecycle_module_1 = require("../subscription-lifecycle/subscription-lifecycle.module");
const login_rate_limit_guard_1 = require("../../common/guards/login-rate-limit.guard");
const auth_controller_1 = require("./auth.controller");
const auth_service_1 = require("./auth.service");
const whatsapp_adapter_1 = require("../agent-platform/channels/whatsapp/whatsapp.adapter");
const invite_service_1 = require("./invite.service");
const mfa_service_1 = require("./mfa.service");
const password_reset_service_1 = require("./password-reset.service");
const signup_service_1 = require("./signup.service");
const jwt_strategy_1 = require("./strategies/jwt.strategy");
let AuthModule = class AuthModule {
};
exports.AuthModule = AuthModule;
exports.AuthModule = AuthModule = __decorate([
    (0, common_1.Module)({
        imports: [passport_1.PassportModule, billing_module_1.BillingModule, subscription_lifecycle_module_1.SubscriptionLifecycleModule],
        controllers: [auth_controller_1.AuthController],
        providers: [auth_service_1.AuthService, signup_service_1.SignupService, invite_service_1.InviteService, mfa_service_1.MfaService, password_reset_service_1.PasswordResetService, jwt_strategy_1.JwtStrategy, login_rate_limit_guard_1.LoginRateLimitGuard, whatsapp_adapter_1.WhatsAppAdapter],
        exports: [auth_service_1.AuthService, signup_service_1.SignupService, invite_service_1.InviteService, mfa_service_1.MfaService, password_reset_service_1.PasswordResetService],
    })
], AuthModule);
//# sourceMappingURL=auth.module.js.map