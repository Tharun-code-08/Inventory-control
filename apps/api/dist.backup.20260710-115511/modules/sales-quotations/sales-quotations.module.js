"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.SalesQuotationsModule = void 0;
const common_1 = require("@nestjs/common");
const mail_module_1 = require("../../common/mail/mail.module");
const email_notifications_module_1 = require("../email-notifications/email-notifications.module");
const document_email_module_1 = require("../document-email/document-email.module");
const sales_quotations_controller_1 = require("./sales-quotations.controller");
const sales_quotations_service_1 = require("./sales-quotations.service");
const stock_module_1 = require("../stock/stock.module");
const billing_module_1 = require("../billing/billing.module");
let SalesQuotationsModule = class SalesQuotationsModule {
};
exports.SalesQuotationsModule = SalesQuotationsModule;
exports.SalesQuotationsModule = SalesQuotationsModule = __decorate([
    (0, common_1.Module)({
        imports: [stock_module_1.StockModule, billing_module_1.BillingModule, mail_module_1.MailModule, email_notifications_module_1.EmailNotificationsModule, document_email_module_1.DocumentEmailModule],
        controllers: [sales_quotations_controller_1.SalesQuotationsController],
        providers: [sales_quotations_service_1.SalesQuotationsService],
        exports: [sales_quotations_service_1.SalesQuotationsService],
    })
], SalesQuotationsModule);
//# sourceMappingURL=sales-quotations.module.js.map