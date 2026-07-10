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
exports.SupplierPortalController = void 0;
const common_1 = require("@nestjs/common");
const swagger_1 = require("@nestjs/swagger");
const public_decorator_1 = require("../../common/decorators/public.decorator");
const submit_portal_quote_dto_1 = require("./dto/submit-portal-quote.dto");
const verify_supplier_dto_1 = require("./dto/verify-supplier.dto");
const supplier_portal_service_1 = require("./supplier-portal.service");
let SupplierPortalController = class SupplierPortalController {
    portal;
    constructor(portal) {
        this.portal = portal;
    }
    verify(dto) {
        return this.portal.verify(dto);
    }
    getRfq(id, supplierId) {
        return this.portal.getRfqForSupplier(id, supplierId);
    }
    submitQuote(dto) {
        return this.portal.submitQuote(dto);
    }
};
exports.SupplierPortalController = SupplierPortalController;
__decorate([
    (0, common_1.Post)('verify'),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [verify_supplier_dto_1.VerifySupplierDto]),
    __metadata("design:returntype", void 0)
], SupplierPortalController.prototype, "verify", null);
__decorate([
    (0, common_1.Get)('rfqs/:id'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Query)('supplier_id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", void 0)
], SupplierPortalController.prototype, "getRfq", null);
__decorate([
    (0, common_1.Post)('quotes'),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [submit_portal_quote_dto_1.SubmitPortalQuoteDto]),
    __metadata("design:returntype", void 0)
], SupplierPortalController.prototype, "submitQuote", null);
exports.SupplierPortalController = SupplierPortalController = __decorate([
    (0, swagger_1.ApiTags)('supplier-portal'),
    (0, public_decorator_1.Public)(),
    (0, common_1.Controller)('supplier-portal'),
    __metadata("design:paramtypes", [supplier_portal_service_1.SupplierPortalService])
], SupplierPortalController);
//# sourceMappingURL=supplier-portal.controller.js.map