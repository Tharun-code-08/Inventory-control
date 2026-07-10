"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.PurchaseOrdersModule = void 0;
const common_1 = require("@nestjs/common");
const billing_module_1 = require("../billing/billing.module");
const rfqs_module_1 = require("../rfqs/rfqs.module");
const stock_module_1 = require("../stock/stock.module");
const pdf_module_1 = require("../../common/pdf/pdf.module");
const common_pdf_module_1 = require("../../common/pdf/common-pdf.module");
const document_email_module_1 = require("../document-email/document-email.module");
const email_notifications_module_1 = require("../email-notifications/email-notifications.module");
const branding_module_1 = require("../../common/branding/branding.module");
const prisma_module_1 = require("../../prisma/prisma.module");
const purchase_orders_controller_1 = require("./purchase-orders.controller");
const purchase_orders_service_1 = require("./purchase-orders.service");
const po_cancel_service_1 = require("./po-cancel.service");
const purchase_order_pdf_service_1 = require("./purchase-order-pdf.service");
let PurchaseOrdersModule = class PurchaseOrdersModule {
};
exports.PurchaseOrdersModule = PurchaseOrdersModule;
exports.PurchaseOrdersModule = PurchaseOrdersModule = __decorate([
    (0, common_1.Module)({
        imports: [
            stock_module_1.StockModule,
            billing_module_1.BillingModule,
            rfqs_module_1.RfqsModule,
            pdf_module_1.PdfModule,
            common_pdf_module_1.CommonPdfModule,
            document_email_module_1.DocumentEmailModule,
            email_notifications_module_1.EmailNotificationsModule,
            branding_module_1.BrandingModule,
            prisma_module_1.PrismaModule,
        ],
        controllers: [purchase_orders_controller_1.PurchaseOrdersController],
        providers: [purchase_orders_service_1.PurchaseOrdersService, po_cancel_service_1.PoCancelService, purchase_order_pdf_service_1.PurchaseOrderPdfService],
        exports: [purchase_orders_service_1.PurchaseOrdersService, purchase_order_pdf_service_1.PurchaseOrderPdfService],
    })
], PurchaseOrdersModule);
//# sourceMappingURL=purchase-orders.module.js.map