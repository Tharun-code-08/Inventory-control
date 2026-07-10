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
exports.SupplierPaymentsController = void 0;
const common_1 = require("@nestjs/common");
const swagger_1 = require("@nestjs/swagger");
const current_user_decorator_1 = require("../../common/decorators/current-user.decorator");
const require_permission_decorator_1 = require("../../common/decorators/require-permission.decorator");
const create_supplier_payment_dto_1 = require("./dto/create-supplier-payment.dto");
const list_supplier_payments_dto_1 = require("./dto/list-supplier-payments.dto");
const reverse_supplier_payment_dto_1 = require("./dto/reverse-supplier-payment.dto");
const supplier_payments_service_1 = require("./supplier-payments.service");
let SupplierPaymentsController = class SupplierPaymentsController {
    supplierPayments;
    constructor(supplierPayments) {
        this.supplierPayments = supplierPayments;
    }
    list(user, query) {
        return this.supplierPayments.list(user, query);
    }
    create(user, dto, idempotencyKey) {
        return this.supplierPayments.create(user, {
            ...dto,
            idempotencyKey: dto.idempotencyKey ?? idempotencyKey,
        });
    }
    reverse(user, id, dto) {
        return this.supplierPayments.reverse(user, id, dto);
    }
    send(user, id, resend) {
        return this.supplierPayments.sendToSupplier(user, id, { resend: resend === 'true' });
    }
};
exports.SupplierPaymentsController = SupplierPaymentsController;
__decorate([
    (0, require_permission_decorator_1.RequirePermission)('shop:read'),
    (0, common_1.Get)(),
    (0, swagger_1.ApiOperation)({ summary: 'List supplier payments (paginated, shop-scoped)' }),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Query)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, list_supplier_payments_dto_1.ListSupplierPaymentsDto]),
    __metadata("design:returntype", void 0)
], SupplierPaymentsController.prototype, "list", null);
__decorate([
    (0, require_permission_decorator_1.RequirePermission)('shop:write'),
    (0, common_1.Post)(),
    (0, swagger_1.ApiOperation)({ summary: 'Record a payment against a supplier bill (idempotent)' }),
    (0, swagger_1.ApiHeader)({
        name: 'x-idempotency-key',
        required: false,
        description: 'Client-supplied idempotency key. Repeat requests with the same key return the original payment.',
    }),
    (0, swagger_1.ApiResponse)({ status: 201, description: 'The created (or replayed) supplier payment.' }),
    (0, swagger_1.ApiResponse)({
        status: 409,
        description: 'Concurrent payment modified the supplier bill; please retry.',
    }),
    (0, swagger_1.ApiResponse)({
        status: 400,
        description: 'Amount exceeds open balance or supplier bill is voided.',
    }),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, common_1.Headers)('x-idempotency-key')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, create_supplier_payment_dto_1.CreateSupplierPaymentDto, String]),
    __metadata("design:returntype", void 0)
], SupplierPaymentsController.prototype, "create", null);
__decorate([
    (0, require_permission_decorator_1.RequirePermission)('shop:write'),
    (0, common_1.Post)(':id/reverse'),
    (0, swagger_1.ApiOperation)({ summary: 'Reverse a supplier payment and restore bill balance' }),
    (0, swagger_1.ApiResponse)({ status: 409, description: 'Concurrent bill update; retry reversal.' }),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('id', new common_1.ParseUUIDPipe())),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, reverse_supplier_payment_dto_1.ReverseSupplierPaymentDto]),
    __metadata("design:returntype", void 0)
], SupplierPaymentsController.prototype, "reverse", null);
__decorate([
    (0, require_permission_decorator_1.RequirePermission)('shop:write'),
    (0, common_1.Post)(':id/send'),
    (0, swagger_1.ApiOperation)({ summary: 'Email supplier payment to supplier (with PDF attachment)' }),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('id', new common_1.ParseUUIDPipe())),
    __param(2, (0, common_1.Query)('resend')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, String]),
    __metadata("design:returntype", void 0)
], SupplierPaymentsController.prototype, "send", null);
exports.SupplierPaymentsController = SupplierPaymentsController = __decorate([
    (0, swagger_1.ApiTags)('supplier-payments'),
    (0, swagger_1.ApiBearerAuth)(),
    (0, common_1.Controller)('supplier-payments'),
    __metadata("design:paramtypes", [supplier_payments_service_1.SupplierPaymentsService])
], SupplierPaymentsController);
//# sourceMappingURL=supplier-payments.controller.js.map