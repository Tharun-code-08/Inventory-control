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
exports.DocumentSeriesController = void 0;
const common_1 = require("@nestjs/common");
const swagger_1 = require("@nestjs/swagger");
const current_user_decorator_1 = require("../../common/decorators/current-user.decorator");
const document_series_service_1 = require("./document-series.service");
const update_document_series_dto_1 = require("./dto/update-document-series.dto");
let DocumentSeriesController = class DocumentSeriesController {
    series;
    constructor(series) {
        this.series = series;
    }
    list(user, shopId) {
        return this.series.listEffective(user, shopId?.trim() || null);
    }
    updateCompanyDefaults(user, dto) {
        return this.series.updateCompanyDefaults(user, dto.rows);
    }
    updateShopOverrides(user, shopId, dto) {
        return this.series.updateShopOverrides(user, shopId, dto.rows);
    }
    deleteShopOverride(user, shopId, docType) {
        return this.series.deleteShopOverride(user, shopId, docType.toUpperCase());
    }
};
exports.DocumentSeriesController = DocumentSeriesController;
__decorate([
    (0, common_1.Get)(),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Query)('shopId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", void 0)
], DocumentSeriesController.prototype, "list", null);
__decorate([
    (0, common_1.Put)(),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, update_document_series_dto_1.UpdateDocumentSeriesDto]),
    __metadata("design:returntype", void 0)
], DocumentSeriesController.prototype, "updateCompanyDefaults", null);
__decorate([
    (0, common_1.Put)('shops/:shopId'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('shopId')),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, update_document_series_dto_1.UpdateDocumentSeriesDto]),
    __metadata("design:returntype", void 0)
], DocumentSeriesController.prototype, "updateShopOverrides", null);
__decorate([
    (0, common_1.Delete)('shops/:shopId/:docType'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('shopId')),
    __param(2, (0, common_1.Param)('docType')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, String]),
    __metadata("design:returntype", void 0)
], DocumentSeriesController.prototype, "deleteShopOverride", null);
exports.DocumentSeriesController = DocumentSeriesController = __decorate([
    (0, swagger_1.ApiTags)('settings'),
    (0, swagger_1.ApiBearerAuth)(),
    (0, common_1.Controller)('settings/document-series'),
    __metadata("design:paramtypes", [document_series_service_1.DocumentSeriesService])
], DocumentSeriesController);
//# sourceMappingURL=document-series.controller.js.map