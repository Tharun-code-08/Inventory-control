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
exports.QuotationPortalController = void 0;
const common_1 = require("@nestjs/common");
const swagger_1 = require("@nestjs/swagger");
const public_decorator_1 = require("../../common/decorators/public.decorator");
const request_quotation_revision_dto_1 = require("./dto/request-quotation-revision.dto");
const quotation_portal_service_1 = require("./quotation-portal.service");
let QuotationPortalController = class QuotationPortalController {
    portal;
    constructor(portal) {
        this.portal = portal;
    }
    getQuote(token) {
        return this.portal.getByToken(token);
    }
    accept(token) {
        return this.portal.accept(token);
    }
    requestRevision(token, dto) {
        return this.portal.requestRevision(token, dto);
    }
};
exports.QuotationPortalController = QuotationPortalController;
__decorate([
    (0, common_1.Get)('quotes/:token'),
    __param(0, (0, common_1.Param)('token')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], QuotationPortalController.prototype, "getQuote", null);
__decorate([
    (0, common_1.Post)('quotes/:token/accept'),
    __param(0, (0, common_1.Param)('token')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], QuotationPortalController.prototype, "accept", null);
__decorate([
    (0, common_1.Post)('quotes/:token/request-revision'),
    __param(0, (0, common_1.Param)('token')),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, request_quotation_revision_dto_1.RequestQuotationRevisionDto]),
    __metadata("design:returntype", void 0)
], QuotationPortalController.prototype, "requestRevision", null);
exports.QuotationPortalController = QuotationPortalController = __decorate([
    (0, swagger_1.ApiTags)('quotation-portal'),
    (0, public_decorator_1.Public)(),
    (0, common_1.Controller)('quotation-portal'),
    __metadata("design:paramtypes", [quotation_portal_service_1.QuotationPortalService])
], QuotationPortalController);
//# sourceMappingURL=quotation-portal.controller.js.map