"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.InvoicesModule = void 0;
const common_1 = require("@nestjs/common");
const stock_module_1 = require("../stock/stock.module");
const invoices_controller_1 = require("./invoices.controller");
const invoices_service_1 = require("./invoices.service");
const invoice_pdf_service_1 = require("./invoice-pdf.service");
const billing_module_1 = require("../billing/billing.module");
const email_notifications_module_1 = require("../email-notifications/email-notifications.module");
const document_email_module_1 = require("../document-email/document-email.module");
const branding_module_1 = require("../../common/branding/branding.module");
const prisma_module_1 = require("../../prisma/prisma.module");
let InvoicesModule = class InvoicesModule {
};
exports.InvoicesModule = InvoicesModule;
exports.InvoicesModule = InvoicesModule = __decorate([
    (0, common_1.Module)({
        imports: [
            stock_module_1.StockModule,
            billing_module_1.BillingModule,
            email_notifications_module_1.EmailNotificationsModule,
            document_email_module_1.DocumentEmailModule,
            branding_module_1.BrandingModule,
            prisma_module_1.PrismaModule,
        ],
        controllers: [invoices_controller_1.InvoicesController],
        providers: [invoices_service_1.InvoicesService, invoice_pdf_service_1.InvoicePdfService],
        exports: [invoices_service_1.InvoicesService, invoice_pdf_service_1.InvoicePdfService],
    })
], InvoicesModule);
//# sourceMappingURL=invoices.module.js.map