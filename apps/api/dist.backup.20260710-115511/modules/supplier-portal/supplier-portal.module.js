"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.SupplierPortalModule = void 0;
const common_1 = require("@nestjs/common");
const stock_module_1 = require("../stock/stock.module");
const supplier_portal_controller_1 = require("./supplier-portal.controller");
const supplier_portal_service_1 = require("./supplier-portal.service");
const billing_module_1 = require("../billing/billing.module");
const notifications_module_1 = require("../notifications/notifications.module");
let SupplierPortalModule = class SupplierPortalModule {
};
exports.SupplierPortalModule = SupplierPortalModule;
exports.SupplierPortalModule = SupplierPortalModule = __decorate([
    (0, common_1.Module)({
        imports: [stock_module_1.StockModule, billing_module_1.BillingModule, notifications_module_1.NotificationsModule],
        controllers: [supplier_portal_controller_1.SupplierPortalController],
        providers: [supplier_portal_service_1.SupplierPortalService],
    })
], SupplierPortalModule);
//# sourceMappingURL=supplier-portal.module.js.map