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
exports.StockTransfersController = void 0;
const common_1 = require("@nestjs/common");
const swagger_1 = require("@nestjs/swagger");
const current_user_decorator_1 = require("../../common/decorators/current-user.decorator");
const require_permission_decorator_1 = require("../../common/decorators/require-permission.decorator");
const create_stock_transfer_dto_1 = require("./dto/create-stock-transfer.dto");
const list_stock_transfers_dto_1 = require("./dto/list-stock-transfers.dto");
const stock_transfers_service_1 = require("./stock-transfers.service");
let StockTransfersController = class StockTransfersController {
    service;
    constructor(service) {
        this.service = service;
    }
    list(user, query) {
        return this.service.list(user, query);
    }
    create(user, dto, idempotencyKey) {
        return this.service.create(user, {
            ...dto,
            idempotencyKey: dto.idempotencyKey ?? idempotencyKey,
        });
    }
    get(user, id) {
        return this.service.get(user, id);
    }
    post(user, id) {
        return this.service.post(user, id);
    }
};
exports.StockTransfersController = StockTransfersController;
__decorate([
    (0, require_permission_decorator_1.RequirePermission)('stock_transfer:read'),
    (0, common_1.Get)(),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Query)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, list_stock_transfers_dto_1.ListStockTransfersDto]),
    __metadata("design:returntype", void 0)
], StockTransfersController.prototype, "list", null);
__decorate([
    (0, require_permission_decorator_1.RequirePermission)('stock_transfer:create'),
    (0, common_1.Post)(),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, common_1.Headers)('x-idempotency-key')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, create_stock_transfer_dto_1.CreateStockTransferDto, String]),
    __metadata("design:returntype", void 0)
], StockTransfersController.prototype, "create", null);
__decorate([
    (0, require_permission_decorator_1.RequirePermission)('stock_transfer:read'),
    (0, common_1.Get)(':id'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", void 0)
], StockTransfersController.prototype, "get", null);
__decorate([
    (0, require_permission_decorator_1.RequirePermission)('stock_transfer:create'),
    (0, common_1.Post)(':id/post'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", void 0)
], StockTransfersController.prototype, "post", null);
exports.StockTransfersController = StockTransfersController = __decorate([
    (0, swagger_1.ApiTags)('stock-transfers'),
    (0, swagger_1.ApiBearerAuth)(),
    (0, common_1.Controller)('stock-transfers'),
    __metadata("design:paramtypes", [stock_transfers_service_1.StockTransfersService])
], StockTransfersController);
//# sourceMappingURL=stock-transfers.controller.js.map