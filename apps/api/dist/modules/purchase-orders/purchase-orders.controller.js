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
exports.PurchaseOrdersController = void 0;
const common_1 = require("@nestjs/common");
const swagger_1 = require("@nestjs/swagger");
const bullmq_1 = require("@nestjs/bullmq");
const bullmq_2 = require("bullmq");
const current_user_decorator_1 = require("../../common/decorators/current-user.decorator");
const require_permission_decorator_1 = require("../../common/decorators/require-permission.decorator");
const create_purchase_order_dto_1 = require("./dto/create-purchase-order.dto");
const update_purchase_order_dto_1 = require("./dto/update-purchase-order.dto");
const purchase_orders_service_1 = require("./purchase-orders.service");
let PurchaseOrdersController = class PurchaseOrdersController {
    service;
    exportsQueue;
    constructor(service, exportsQueue) {
        this.service = service;
        this.exportsQueue = exportsQueue;
    }
    list(user, shopId, cursor, take) {
        return this.service.list(user, { shop_id: shopId, cursor, take: take ? Number(take) : undefined });
    }
    create(user, dto) {
        return this.service.create(user, dto);
    }
    get(user, id) {
        return this.service.get(user, id);
    }
    update(user, id, dto) {
        return this.service.update(user, id, dto);
    }
    confirm(user, id) {
        return this.service.confirm(user, id);
    }
    cancel(user, id) {
        return this.service.cancel(user, id);
    }
    async exportPdf(user, id) {
        await this.service.get(user, id);
        const job = await this.exportsQueue.add('po-pdf', { type: 'po-pdf', purchaseOrderId: id }, { removeOnComplete: true });
        return { jobId: job.id };
    }
};
exports.PurchaseOrdersController = PurchaseOrdersController;
__decorate([
    (0, require_permission_decorator_1.RequirePermission)('purchase_order:read'),
    (0, common_1.Get)(),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Query)('shop_id')),
    __param(2, (0, common_1.Query)('cursor')),
    __param(3, (0, common_1.Query)('take')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, String, String]),
    __metadata("design:returntype", void 0)
], PurchaseOrdersController.prototype, "list", null);
__decorate([
    (0, require_permission_decorator_1.RequirePermission)('purchase_order:create'),
    (0, common_1.Post)(),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, create_purchase_order_dto_1.CreatePurchaseOrderDto]),
    __metadata("design:returntype", void 0)
], PurchaseOrdersController.prototype, "create", null);
__decorate([
    (0, require_permission_decorator_1.RequirePermission)('purchase_order:read'),
    (0, common_1.Get)(':id'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", void 0)
], PurchaseOrdersController.prototype, "get", null);
__decorate([
    (0, require_permission_decorator_1.RequirePermission)('purchase_order:create'),
    (0, common_1.Patch)(':id'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('id')),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, update_purchase_order_dto_1.UpdatePurchaseOrderDto]),
    __metadata("design:returntype", void 0)
], PurchaseOrdersController.prototype, "update", null);
__decorate([
    (0, require_permission_decorator_1.RequirePermission)('purchase_order:create'),
    (0, common_1.Post)(':id/confirm'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", void 0)
], PurchaseOrdersController.prototype, "confirm", null);
__decorate([
    (0, require_permission_decorator_1.RequirePermission)('purchase_order:create'),
    (0, common_1.Post)(':id/cancel'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", void 0)
], PurchaseOrdersController.prototype, "cancel", null);
__decorate([
    (0, require_permission_decorator_1.RequirePermission)('report:export'),
    (0, common_1.Get)(':id/export-pdf'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", Promise)
], PurchaseOrdersController.prototype, "exportPdf", null);
exports.PurchaseOrdersController = PurchaseOrdersController = __decorate([
    (0, swagger_1.ApiTags)('purchase-orders'),
    (0, swagger_1.ApiBearerAuth)(),
    (0, common_1.Controller)('purchase-orders'),
    __param(1, (0, bullmq_1.InjectQueue)('exports')),
    __metadata("design:paramtypes", [purchase_orders_service_1.PurchaseOrdersService,
        bullmq_2.Queue])
], PurchaseOrdersController);
//# sourceMappingURL=purchase-orders.controller.js.map