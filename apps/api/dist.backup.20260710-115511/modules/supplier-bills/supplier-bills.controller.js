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
exports.SupplierBillsController = void 0;
const common_1 = require("@nestjs/common");
const swagger_1 = require("@nestjs/swagger");
const current_user_decorator_1 = require("../../common/decorators/current-user.decorator");
const require_permission_decorator_1 = require("../../common/decorators/require-permission.decorator");
const create_supplier_bill_dto_1 = require("./dto/create-supplier-bill.dto");
const list_supplier_bills_dto_1 = require("./dto/list-supplier-bills.dto");
const void_supplier_bill_dto_1 = require("./dto/void-supplier-bill.dto");
const supplier_bills_service_1 = require("./supplier-bills.service");
let SupplierBillsController = class SupplierBillsController {
    supplierBills;
    constructor(supplierBills) {
        this.supplierBills = supplierBills;
    }
    list(user, query) {
        return this.supplierBills.list(user, query);
    }
    createFromGoodsReceipt(user, grId, dto) {
        return this.supplierBills.createFromGoodsReceipt(user, grId, dto);
    }
    get(user, id) {
        return this.supplierBills.get(user, id);
    }
    voidBill(user, id, dto) {
        return this.supplierBills.voidBill(user, id, dto);
    }
    send(user, id, resend) {
        return this.supplierBills.sendToSupplier(user, id, { resend: resend === 'true' });
    }
};
exports.SupplierBillsController = SupplierBillsController;
__decorate([
    (0, require_permission_decorator_1.RequirePermission)('shop:read'),
    (0, common_1.Get)(),
    (0, swagger_1.ApiOperation)({ summary: 'List supplier bills (paginated, shop-scoped, filterable)' }),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Query)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, list_supplier_bills_dto_1.ListSupplierBillsDto]),
    __metadata("design:returntype", void 0)
], SupplierBillsController.prototype, "list", null);
__decorate([
    (0, require_permission_decorator_1.RequirePermission)('shop:write'),
    (0, common_1.Post)('from-gr/:grId'),
    (0, swagger_1.ApiOperation)({ summary: 'Create a supplier bill from a posted goods receipt' }),
    (0, swagger_1.ApiResponse)({ status: 409, description: 'Goods receipt has already been billed.' }),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('grId', new common_1.ParseUUIDPipe())),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, create_supplier_bill_dto_1.CreateSupplierBillDto]),
    __metadata("design:returntype", void 0)
], SupplierBillsController.prototype, "createFromGoodsReceipt", null);
__decorate([
    (0, require_permission_decorator_1.RequirePermission)('shop:read'),
    (0, common_1.Get)(':id'),
    (0, swagger_1.ApiOperation)({ summary: 'Get a supplier bill by id' }),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('id', new common_1.ParseUUIDPipe())),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", void 0)
], SupplierBillsController.prototype, "get", null);
__decorate([
    (0, require_permission_decorator_1.RequirePermission)('shop:write'),
    (0, common_1.Post)(':id/void'),
    (0, swagger_1.ApiOperation)({ summary: 'Void an unpaid issued supplier bill' }),
    (0, swagger_1.ApiResponse)({ status: 400, description: 'Bill has payments or is not in ISSUED status.' }),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('id', new common_1.ParseUUIDPipe())),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, void_supplier_bill_dto_1.VoidSupplierBillDto]),
    __metadata("design:returntype", void 0)
], SupplierBillsController.prototype, "voidBill", null);
__decorate([
    (0, require_permission_decorator_1.RequirePermission)('shop:write'),
    (0, common_1.Post)(':id/send'),
    (0, swagger_1.ApiOperation)({ summary: 'Email supplier bill to supplier (with PDF attachment)' }),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('id', new common_1.ParseUUIDPipe())),
    __param(2, (0, common_1.Query)('resend')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, String]),
    __metadata("design:returntype", void 0)
], SupplierBillsController.prototype, "send", null);
exports.SupplierBillsController = SupplierBillsController = __decorate([
    (0, swagger_1.ApiTags)('supplier-bills'),
    (0, swagger_1.ApiBearerAuth)(),
    (0, common_1.Controller)('supplier-bills'),
    __metadata("design:paramtypes", [supplier_bills_service_1.SupplierBillsService])
], SupplierBillsController);
//# sourceMappingURL=supplier-bills.controller.js.map