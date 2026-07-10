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
exports.DamagedStockController = void 0;
const common_1 = require("@nestjs/common");
const swagger_1 = require("@nestjs/swagger");
const current_user_decorator_1 = require("../../common/decorators/current-user.decorator");
const skip_envelope_decorator_1 = require("../../common/decorators/skip-envelope.decorator");
const require_permission_decorator_1 = require("../../common/decorators/require-permission.decorator");
const create_damaged_stock_dto_1 = require("./dto/create-damaged-stock.dto");
const update_damaged_stock_dto_1 = require("./dto/update-damaged-stock.dto");
const damaged_stock_service_1 = require("./damaged-stock.service");
let DamagedStockController = class DamagedStockController {
    service;
    constructor(service) {
        this.service = service;
    }
    list(user, shopId, cursor, take) {
        return this.service.list(user, { shop_id: shopId, cursor, take: take ? Number(take) : undefined });
    }
    create(user, dto) {
        return this.service.create(user, dto);
    }
    print(user, id) {
        return this.service.print(user, id);
    }
    get(user, id) {
        return this.service.get(user, id);
    }
    update(user, id, dto) {
        return this.service.update(user, id, dto);
    }
    post(user, id) {
        return this.service.post(user, id);
    }
};
exports.DamagedStockController = DamagedStockController;
__decorate([
    (0, require_permission_decorator_1.RequirePermission)('damage:read'),
    (0, common_1.Get)(),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Query)('shop_id')),
    __param(2, (0, common_1.Query)('cursor')),
    __param(3, (0, common_1.Query)('take')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, String, String]),
    __metadata("design:returntype", void 0)
], DamagedStockController.prototype, "list", null);
__decorate([
    (0, require_permission_decorator_1.RequirePermission)('damage:create'),
    (0, common_1.Post)(),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, create_damaged_stock_dto_1.CreateDamagedStockDto]),
    __metadata("design:returntype", void 0)
], DamagedStockController.prototype, "create", null);
__decorate([
    (0, skip_envelope_decorator_1.SkipEnvelope)(),
    (0, require_permission_decorator_1.RequirePermission)('damage:read'),
    (0, common_1.Get)(':id/print'),
    (0, common_1.Header)('Content-Type', 'text/html; charset=utf-8'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", void 0)
], DamagedStockController.prototype, "print", null);
__decorate([
    (0, require_permission_decorator_1.RequirePermission)('damage:read'),
    (0, common_1.Get)(':id'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", void 0)
], DamagedStockController.prototype, "get", null);
__decorate([
    (0, require_permission_decorator_1.RequirePermission)('damage:create'),
    (0, common_1.Patch)(':id'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('id')),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, update_damaged_stock_dto_1.UpdateDamagedStockDto]),
    __metadata("design:returntype", void 0)
], DamagedStockController.prototype, "update", null);
__decorate([
    (0, require_permission_decorator_1.RequirePermission)('damage:create'),
    (0, common_1.Post)(':id/post'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", void 0)
], DamagedStockController.prototype, "post", null);
exports.DamagedStockController = DamagedStockController = __decorate([
    (0, swagger_1.ApiTags)('damaged-stock'),
    (0, swagger_1.ApiBearerAuth)(),
    (0, common_1.Controller)('damaged-stock'),
    __metadata("design:paramtypes", [damaged_stock_service_1.DamagedStockService])
], DamagedStockController);
//# sourceMappingURL=damaged-stock.controller.js.map