"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.GoodsReceiptsModule = void 0;
const common_1 = require("@nestjs/common");
const pdf_module_1 = require("../../common/pdf/pdf.module");
const common_pdf_module_1 = require("../../common/pdf/common-pdf.module");
const stock_module_1 = require("../stock/stock.module");
const email_notifications_module_1 = require("../email-notifications/email-notifications.module");
const document_email_module_1 = require("../document-email/document-email.module");
const notifications_module_1 = require("../notifications/notifications.module");
const goods_receipts_controller_1 = require("./goods-receipts.controller");
const goods_receipts_service_1 = require("./goods-receipts.service");
let GoodsReceiptsModule = class GoodsReceiptsModule {
};
exports.GoodsReceiptsModule = GoodsReceiptsModule;
exports.GoodsReceiptsModule = GoodsReceiptsModule = __decorate([
    (0, common_1.Module)({
        imports: [stock_module_1.StockModule, email_notifications_module_1.EmailNotificationsModule, pdf_module_1.PdfModule, common_pdf_module_1.CommonPdfModule, document_email_module_1.DocumentEmailModule, notifications_module_1.NotificationsModule],
        controllers: [goods_receipts_controller_1.GoodsReceiptsController],
        providers: [goods_receipts_service_1.GoodsReceiptsService],
        exports: [goods_receipts_service_1.GoodsReceiptsService],
    })
], GoodsReceiptsModule);
//# sourceMappingURL=goods-receipts.module.js.map