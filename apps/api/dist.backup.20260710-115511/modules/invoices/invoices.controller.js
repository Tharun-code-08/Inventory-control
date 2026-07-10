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
exports.InvoicesController = void 0;
const common_1 = require("@nestjs/common");
const swagger_1 = require("@nestjs/swagger");
const current_user_decorator_1 = require("../../common/decorators/current-user.decorator");
const require_permission_decorator_1 = require("../../common/decorators/require-permission.decorator");
const create_invoice_dto_1 = require("./dto/create-invoice.dto");
const list_invoices_dto_1 = require("./dto/list-invoices.dto");
const invoices_service_1 = require("./invoices.service");
let InvoicesController = class InvoicesController {
    invoices;
    constructor(invoices) {
        this.invoices = invoices;
    }
    list(user, query) {
        return this.invoices.list(user, query);
    }
    create(user, dto, idempotencyKey) {
        return this.invoices.create(user, {
            ...dto,
            idempotencyKey: dto.idempotencyKey ?? idempotencyKey,
        });
    }
    send(user, id, resend) {
        return this.invoices.sendToCustomer(user, id, { resend: resend === 'true' });
    }
    get(user, id) {
        return this.invoices.get(user, id);
    }
};
exports.InvoicesController = InvoicesController;
__decorate([
    (0, require_permission_decorator_1.RequirePermission)('shop:read'),
    (0, common_1.Get)(),
    (0, swagger_1.ApiOperation)({ summary: 'List invoices (paginated, shop-scoped, filterable)' }),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Query)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, list_invoices_dto_1.ListInvoicesDto]),
    __metadata("design:returntype", void 0)
], InvoicesController.prototype, "list", null);
__decorate([
    (0, require_permission_decorator_1.RequirePermission)('shop:write'),
    (0, common_1.Post)(),
    (0, swagger_1.ApiOperation)({ summary: 'Create an invoice (optionally linked to a sales order)' }),
    (0, swagger_1.ApiResponse)({ status: 409, description: 'Sales order has already been invoiced.' }),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, common_1.Headers)('x-idempotency-key')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, create_invoice_dto_1.CreateInvoiceDto, String]),
    __metadata("design:returntype", void 0)
], InvoicesController.prototype, "create", null);
__decorate([
    (0, require_permission_decorator_1.RequirePermission)('shop:write'),
    (0, common_1.Post)(':id/send'),
    (0, swagger_1.ApiOperation)({ summary: 'Email invoice to customer (with PDF attachment)' }),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('id', new common_1.ParseUUIDPipe())),
    __param(2, (0, common_1.Query)('resend')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, String]),
    __metadata("design:returntype", void 0)
], InvoicesController.prototype, "send", null);
__decorate([
    (0, require_permission_decorator_1.RequirePermission)('shop:read'),
    (0, common_1.Get)(':id'),
    (0, swagger_1.ApiOperation)({ summary: 'Get an invoice by id' }),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('id', new common_1.ParseUUIDPipe())),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", void 0)
], InvoicesController.prototype, "get", null);
exports.InvoicesController = InvoicesController = __decorate([
    (0, swagger_1.ApiTags)('invoices'),
    (0, swagger_1.ApiBearerAuth)(),
    (0, common_1.Controller)('invoices'),
    __metadata("design:paramtypes", [invoices_service_1.InvoicesService])
], InvoicesController);
//# sourceMappingURL=invoices.controller.js.map