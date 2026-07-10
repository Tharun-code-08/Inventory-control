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
exports.ShopsController = void 0;
const common_1 = require("@nestjs/common");
const swagger_1 = require("@nestjs/swagger");
const platform_express_1 = require("@nestjs/platform-express");
const current_user_decorator_1 = require("../../common/decorators/current-user.decorator");
const require_permission_decorator_1 = require("../../common/decorators/require-permission.decorator");
const branding_multer_options_1 = require("../../common/branding/branding-multer.options");
const update_branding_profile_dto_1 = require("../../common/branding/dto/update-branding-profile.dto");
const create_shop_dto_1 = require("./dto/create-shop.dto");
const update_shop_dto_1 = require("./dto/update-shop.dto");
const shops_service_1 = require("./shops.service");
let ShopsController = class ShopsController {
    shops;
    constructor(shops) {
        this.shops = shops;
    }
    list(user, isActive, cursor, take) {
        return this.shops.list(user, {
            is_active: isActive === undefined ? undefined : isActive === 'true',
            cursor,
            take: take ? Number(take) : undefined,
        });
    }
    create(user, dto) {
        return this.shops.create(user, dto);
    }
    get(user, id) {
        return this.shops.get(user, id);
    }
    update(user, id, dto) {
        return this.shops.update(user, id, dto);
    }
    updateBranding(user, id, dto, logo) {
        return this.shops.updateBranding(user, id, dto, logo);
    }
    getBranding(user, id) {
        return this.shops.getBranding(user, id);
    }
    remove(user, id) {
        return this.shops.remove(user, id);
    }
};
exports.ShopsController = ShopsController;
__decorate([
    (0, require_permission_decorator_1.RequirePermission)('shop:read'),
    (0, common_1.Get)(),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Query)('is_active')),
    __param(2, (0, common_1.Query)('cursor')),
    __param(3, (0, common_1.Query)('take')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, String, String]),
    __metadata("design:returntype", void 0)
], ShopsController.prototype, "list", null);
__decorate([
    (0, require_permission_decorator_1.RequirePermission)('shop:write'),
    (0, common_1.Post)(),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, create_shop_dto_1.CreateShopDto]),
    __metadata("design:returntype", void 0)
], ShopsController.prototype, "create", null);
__decorate([
    (0, require_permission_decorator_1.RequirePermission)('shop:read'),
    (0, common_1.Get)(':id'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", void 0)
], ShopsController.prototype, "get", null);
__decorate([
    (0, require_permission_decorator_1.RequirePermission)('shop:write'),
    (0, common_1.Patch)(':id'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('id')),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, update_shop_dto_1.UpdateShopDto]),
    __metadata("design:returntype", void 0)
], ShopsController.prototype, "update", null);
__decorate([
    (0, require_permission_decorator_1.RequirePermission)('shop:write'),
    (0, common_1.Patch)(':id/branding'),
    (0, common_1.UseInterceptors)((0, platform_express_1.FileInterceptor)('logo', branding_multer_options_1.brandingMulterOptions)),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('id')),
    __param(2, (0, common_1.Body)()),
    __param(3, (0, common_1.UploadedFile)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, update_branding_profile_dto_1.UpdateBrandingProfileDto, Object]),
    __metadata("design:returntype", void 0)
], ShopsController.prototype, "updateBranding", null);
__decorate([
    (0, require_permission_decorator_1.RequirePermission)('shop:read'),
    (0, common_1.Get)(':id/branding'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", void 0)
], ShopsController.prototype, "getBranding", null);
__decorate([
    (0, require_permission_decorator_1.RequirePermission)('shop:write'),
    (0, common_1.Delete)(':id'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", void 0)
], ShopsController.prototype, "remove", null);
exports.ShopsController = ShopsController = __decorate([
    (0, swagger_1.ApiTags)('shops'),
    (0, swagger_1.ApiBearerAuth)(),
    (0, common_1.Controller)('shops'),
    __metadata("design:paramtypes", [shops_service_1.ShopsService])
], ShopsController);
//# sourceMappingURL=shops.controller.js.map