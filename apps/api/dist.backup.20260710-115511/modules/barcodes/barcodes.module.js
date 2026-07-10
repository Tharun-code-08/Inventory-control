"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.BarcodesModule = void 0;
const common_1 = require("@nestjs/common");
const barcodes_controller_1 = require("./barcodes.controller");
const barcodes_service_1 = require("./barcodes.service");
const company_settings_module_1 = require("../company-settings/company-settings.module");
let BarcodesModule = class BarcodesModule {
};
exports.BarcodesModule = BarcodesModule;
exports.BarcodesModule = BarcodesModule = __decorate([
    (0, common_1.Module)({
        imports: [company_settings_module_1.CompanySettingsModule],
        controllers: [barcodes_controller_1.BarcodesController],
        providers: [barcodes_service_1.BarcodesService],
        exports: [barcodes_service_1.BarcodesService],
    })
], BarcodesModule);
//# sourceMappingURL=barcodes.module.js.map