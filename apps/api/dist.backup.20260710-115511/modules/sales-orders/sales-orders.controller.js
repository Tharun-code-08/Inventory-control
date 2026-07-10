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
exports.SalesOrdersController = void 0;
const common_1 = require("@nestjs/common");
const swagger_1 = require("@nestjs/swagger");
const current_user_decorator_1 = require("../../common/decorators/current-user.decorator");
const require_permission_decorator_1 = require("../../common/decorators/require-permission.decorator");
const create_sales_order_dto_1 = require("./dto/create-sales-order.dto");
const list_sales_orders_dto_1 = require("./dto/list-sales-orders.dto");
const update_sales_order_dto_1 = require("./dto/update-sales-order.dto");
const sales_orders_service_1 = require("./sales-orders.service");
let SalesOrdersController = class SalesOrdersController {
    salesOrders;
    constructor(salesOrders) {
        this.salesOrders = salesOrders;
    }
    list(user, query) {
        return this.salesOrders.list(user, query);
    }
    create(user, dto, idempotencyKey) {
        return this.salesOrders.create(user, {
            ...dto,
            idempotencyKey: dto.idempotencyKey ?? idempotencyKey,
        });
    }
    get(user, id) {
        return this.salesOrders.get(user, id);
    }
    update(user, id, dto) {
        return this.salesOrders.update(user, id, dto);
    }
    remove(user, id) {
        return this.salesOrders.remove(user, id);
    }
    confirm(user, id) {
        return this.salesOrders.confirm(user, id);
    }
    send(user, id, resend) {
        return this.salesOrders.sendToCustomer(user, id, { resend: resend === 'true' });
    }
    fulfill(user, id) {
        return this.salesOrders.fulfill(user, id);
    }
};
exports.SalesOrdersController = SalesOrdersController;
__decorate([
    (0, require_permission_decorator_1.RequirePermission)('shop:read'),
    (0, common_1.Get)(),
    (0, swagger_1.ApiOperation)({ summary: 'List sales orders (paginated, shop-scoped, filterable)' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'Page of sales orders with cursor-pagination meta.' }),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Query)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, list_sales_orders_dto_1.ListSalesOrdersDto]),
    __metadata("design:returntype", void 0)
], SalesOrdersController.prototype, "list", null);
__decorate([
    (0, require_permission_decorator_1.RequirePermission)('shop:write'),
    (0, common_1.Post)(),
    (0, swagger_1.ApiOperation)({ summary: 'Create a sales order (DRAFT)' }),
    (0, swagger_1.ApiResponse)({ status: 201, description: 'The created sales order with line items.' }),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, common_1.Headers)('x-idempotency-key')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, create_sales_order_dto_1.CreateSalesOrderDto, String]),
    __metadata("design:returntype", void 0)
], SalesOrdersController.prototype, "create", null);
__decorate([
    (0, require_permission_decorator_1.RequirePermission)('shop:read'),
    (0, common_1.Get)(':id'),
    (0, swagger_1.ApiOperation)({ summary: 'Get a sales order by id' }),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('id', new common_1.ParseUUIDPipe())),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", void 0)
], SalesOrdersController.prototype, "get", null);
__decorate([
    (0, require_permission_decorator_1.RequirePermission)('shop:write'),
    (0, common_1.Patch)(':id'),
    (0, swagger_1.ApiOperation)({ summary: 'Update a DRAFT sales order' }),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('id', new common_1.ParseUUIDPipe())),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, update_sales_order_dto_1.UpdateSalesOrderDto]),
    __metadata("design:returntype", void 0)
], SalesOrdersController.prototype, "update", null);
__decorate([
    (0, require_permission_decorator_1.RequirePermission)('shop:write'),
    (0, common_1.Delete)(':id'),
    (0, swagger_1.ApiOperation)({ summary: 'Delete a DRAFT sales order' }),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('id', new common_1.ParseUUIDPipe())),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", void 0)
], SalesOrdersController.prototype, "remove", null);
__decorate([
    (0, require_permission_decorator_1.RequirePermission)('shop:write'),
    (0, common_1.Post)(':id/confirm'),
    (0, swagger_1.ApiOperation)({ summary: 'Confirm a DRAFT sales order' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'Sales order with status=CONFIRMED.' }),
    (0, swagger_1.ApiResponse)({ status: 409, description: 'State transitioned concurrently.' }),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('id', new common_1.ParseUUIDPipe())),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", void 0)
], SalesOrdersController.prototype, "confirm", null);
__decorate([
    (0, require_permission_decorator_1.RequirePermission)('shop:write'),
    (0, common_1.Post)(':id/send'),
    (0, swagger_1.ApiOperation)({ summary: 'Email sales order to customer (with PDF attachment)' }),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('id', new common_1.ParseUUIDPipe())),
    __param(2, (0, common_1.Query)('resend')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, String]),
    __metadata("design:returntype", void 0)
], SalesOrdersController.prototype, "send", null);
__decorate([
    (0, require_permission_decorator_1.RequirePermission)('shop:write'),
    (0, common_1.Post)(':id/fulfill'),
    (0, swagger_1.ApiOperation)({ summary: 'Fulfill a CONFIRMED sales order (issues stock)' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'Sales order with status=FULFILLED.' }),
    (0, swagger_1.ApiResponse)({ status: 409, description: 'Already fulfilled or modified concurrently.' }),
    (0, swagger_1.ApiResponse)({ status: 422, description: 'Insufficient stock for one or more lines.' }),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('id', new common_1.ParseUUIDPipe())),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", void 0)
], SalesOrdersController.prototype, "fulfill", null);
exports.SalesOrdersController = SalesOrdersController = __decorate([
    (0, swagger_1.ApiTags)('sales-orders'),
    (0, swagger_1.ApiBearerAuth)(),
    (0, common_1.Controller)('sales-orders'),
    __metadata("design:paramtypes", [sales_orders_service_1.SalesOrdersService])
], SalesOrdersController);
//# sourceMappingURL=sales-orders.controller.js.map