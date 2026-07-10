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
exports.CompanySettingsController = void 0;
const common_1 = require("@nestjs/common");
const swagger_1 = require("@nestjs/swagger");
const current_user_decorator_1 = require("../../common/decorators/current-user.decorator");
const require_permission_decorator_1 = require("../../common/decorators/require-permission.decorator");
const company_settings_service_1 = require("./company-settings.service");
const upsert_setting_dto_1 = require("./dto/upsert-setting.dto");
let CompanySettingsController = class CompanySettingsController {
    service;
    constructor(service) {
        this.service = service;
    }
    list(user) {
        return this.service.list(user);
    }
    get(user, key) {
        return this.service.get(user, key);
    }
    upsert(user, key, dto) {
        return this.service.upsert(user, key, dto.value);
    }
};
exports.CompanySettingsController = CompanySettingsController;
__decorate([
    (0, require_permission_decorator_1.RequirePermission)('company:read'),
    (0, common_1.Get)(),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], CompanySettingsController.prototype, "list", null);
__decorate([
    (0, require_permission_decorator_1.RequirePermission)('company:read'),
    (0, common_1.Get)(':key'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('key')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", void 0)
], CompanySettingsController.prototype, "get", null);
__decorate([
    (0, require_permission_decorator_1.RequirePermission)('company:write'),
    (0, common_1.Put)(':key'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('key')),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, upsert_setting_dto_1.UpsertSettingDto]),
    __metadata("design:returntype", void 0)
], CompanySettingsController.prototype, "upsert", null);
exports.CompanySettingsController = CompanySettingsController = __decorate([
    (0, swagger_1.ApiTags)('company-settings'),
    (0, swagger_1.ApiBearerAuth)(),
    (0, common_1.Controller)('company-settings'),
    __metadata("design:paramtypes", [company_settings_service_1.CompanySettingsService])
], CompanySettingsController);
//# sourceMappingURL=company-settings.controller.js.map