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
exports.GoodsReceiptsController = void 0;
const common_1 = require("@nestjs/common");
const swagger_1 = require("@nestjs/swagger");
const client_1 = require("@prisma/client");
const current_user_decorator_1 = require("../../common/decorators/current-user.decorator");
const skip_envelope_decorator_1 = require("../../common/decorators/skip-envelope.decorator");
const require_permission_decorator_1 = require("../../common/decorators/require-permission.decorator");
const create_goods_receipt_dto_1 = require("./dto/create-goods-receipt.dto");
const update_goods_receipt_dto_1 = require("./dto/update-goods-receipt.dto");
const goods_receipts_service_1 = require("./goods-receipts.service");
let GoodsReceiptsController = class GoodsReceiptsController {
    service;
    constructor(service) {
        this.service = service;
    }
    list(user, shopId, dateFrom, dateTo, status, cursor, take) {
        return this.service.list(user, {
            shop_id: shopId,
            date_from: dateFrom,
            date_to: dateTo,
            status,
            cursor,
            take: take ? Number(take) : undefined,
        });
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
    remove(user, id) {
        return this.service.remove(user, id);
    }
};
exports.GoodsReceiptsController = GoodsReceiptsController;
__decorate([
    (0, require_permission_decorator_1.RequirePermission)('goods_receipt:read'),
    (0, common_1.Get)(),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Query)('shop_id')),
    __param(2, (0, common_1.Query)('date_from')),
    __param(3, (0, common_1.Query)('date_to')),
    __param(4, (0, common_1.Query)('status')),
    __param(5, (0, common_1.Query)('cursor')),
    __param(6, (0, common_1.Query)('take')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, String, String, String, String, String]),
    __metadata("design:returntype", void 0)
], GoodsReceiptsController.prototype, "list", null);
__decorate([
    (0, require_permission_decorator_1.RequirePermission)('goods_receipt:create'),
    (0, common_1.Post)(),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, create_goods_receipt_dto_1.CreateGoodsReceiptDto]),
    __metadata("design:returntype", void 0)
], GoodsReceiptsController.prototype, "create", null);
__decorate([
    (0, skip_envelope_decorator_1.SkipEnvelope)(),
    (0, require_permission_decorator_1.RequirePermission)('goods_receipt:read'),
    (0, common_1.Get)(':id/print'),
    (0, common_1.Header)('Content-Type', 'text/html; charset=utf-8'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", void 0)
], GoodsReceiptsController.prototype, "print", null);
__decorate([
    (0, require_permission_decorator_1.RequirePermission)('goods_receipt:read'),
    (0, common_1.Get)(':id'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", void 0)
], GoodsReceiptsController.prototype, "get", null);
__decorate([
    (0, require_permission_decorator_1.RequirePermission)('goods_receipt:create'),
    (0, common_1.Patch)(':id'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('id')),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, update_goods_receipt_dto_1.UpdateGoodsReceiptDto]),
    __metadata("design:returntype", void 0)
], GoodsReceiptsController.prototype, "update", null);
__decorate([
    (0, require_permission_decorator_1.RequirePermission)('goods_receipt:create'),
    (0, common_1.Post)(':id/post'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", void 0)
], GoodsReceiptsController.prototype, "post", null);
__decorate([
    (0, require_permission_decorator_1.RequirePermission)('goods_receipt:create'),
    (0, common_1.Delete)(':id'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", void 0)
], GoodsReceiptsController.prototype, "remove", null);
exports.GoodsReceiptsController = GoodsReceiptsController = __decorate([
    (0, swagger_1.ApiTags)('goods-receipts'),
    (0, swagger_1.ApiBearerAuth)(),
    (0, common_1.Controller)('goods-receipts'),
    __metadata("design:paramtypes", [goods_receipts_service_1.GoodsReceiptsService])
], GoodsReceiptsController);
//# sourceMappingURL=goods-receipts.controller.js.map