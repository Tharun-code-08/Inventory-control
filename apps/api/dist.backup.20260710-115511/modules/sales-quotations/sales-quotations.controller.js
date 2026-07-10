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
exports.SalesQuotationsController = void 0;
const common_1 = require("@nestjs/common");
const swagger_1 = require("@nestjs/swagger");
const current_user_decorator_1 = require("../../common/decorators/current-user.decorator");
const require_permission_decorator_1 = require("../../common/decorators/require-permission.decorator");
const create_sales_quotation_dto_1 = require("./dto/create-sales-quotation.dto");
const update_sales_quotation_dto_1 = require("./dto/update-sales-quotation.dto");
const sales_quotations_service_1 = require("./sales-quotations.service");
let SalesQuotationsController = class SalesQuotationsController {
    salesQuotations;
    constructor(salesQuotations) {
        this.salesQuotations = salesQuotations;
    }
    list(user, customerId) {
        return this.salesQuotations.list(user, customerId);
    }
    get(user, id) {
        return this.salesQuotations.get(user, id);
    }
    create(user, dto) {
        return this.salesQuotations.create(user, dto);
    }
    update(user, id, dto) {
        return this.salesQuotations.update(user, id, dto);
    }
    send(user, id, resend) {
        return this.salesQuotations.sendEmail(user, id, { resend: resend === 'true' });
    }
    resend(user, id) {
        return this.salesQuotations.resend(user, id);
    }
    cancel(user, id) {
        return this.salesQuotations.cancel(user, id);
    }
    accept(user, id) {
        return this.salesQuotations.accept(user, id);
    }
    convertToSalesOrder(user, id) {
        return this.salesQuotations.convertToSalesOrder(user, id);
    }
};
exports.SalesQuotationsController = SalesQuotationsController;
__decorate([
    (0, require_permission_decorator_1.RequirePermission)('shop:read'),
    (0, common_1.Get)(),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Query)('customer_id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", void 0)
], SalesQuotationsController.prototype, "list", null);
__decorate([
    (0, require_permission_decorator_1.RequirePermission)('shop:read'),
    (0, common_1.Get)(':id'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('id', new common_1.ParseUUIDPipe())),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", void 0)
], SalesQuotationsController.prototype, "get", null);
__decorate([
    (0, require_permission_decorator_1.RequirePermission)('shop:write'),
    (0, common_1.Post)(),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, create_sales_quotation_dto_1.CreateSalesQuotationDto]),
    __metadata("design:returntype", void 0)
], SalesQuotationsController.prototype, "create", null);
__decorate([
    (0, require_permission_decorator_1.RequirePermission)('shop:write'),
    (0, common_1.Patch)(':id'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('id', new common_1.ParseUUIDPipe())),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, update_sales_quotation_dto_1.UpdateSalesQuotationDto]),
    __metadata("design:returntype", void 0)
], SalesQuotationsController.prototype, "update", null);
__decorate([
    (0, require_permission_decorator_1.RequirePermission)('shop:write'),
    (0, common_1.Post)(':id/send'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('id', new common_1.ParseUUIDPipe())),
    __param(2, (0, common_1.Query)('resend')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, String]),
    __metadata("design:returntype", void 0)
], SalesQuotationsController.prototype, "send", null);
__decorate([
    (0, require_permission_decorator_1.RequirePermission)('shop:write'),
    (0, common_1.Post)(':id/resend'),
    (0, swagger_1.ApiOperation)({ summary: 'Resend revised quotation after customer pricing request' }),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('id', new common_1.ParseUUIDPipe())),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", void 0)
], SalesQuotationsController.prototype, "resend", null);
__decorate([
    (0, require_permission_decorator_1.RequirePermission)('shop:write'),
    (0, common_1.Post)(':id/cancel'),
    (0, swagger_1.ApiOperation)({ summary: 'Cancel quotation (customer request or awaiting response)' }),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('id', new common_1.ParseUUIDPipe())),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", void 0)
], SalesQuotationsController.prototype, "cancel", null);
__decorate([
    (0, require_permission_decorator_1.RequirePermission)('shop:write'),
    (0, common_1.Post)(':id/accept'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('id', new common_1.ParseUUIDPipe())),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", void 0)
], SalesQuotationsController.prototype, "accept", null);
__decorate([
    (0, require_permission_decorator_1.RequirePermission)('shop:write'),
    (0, common_1.Post)(':id/convert-to-sales-order'),
    (0, swagger_1.ApiOperation)({ summary: 'Convert quotation to a draft sales order' }),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('id', new common_1.ParseUUIDPipe())),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", void 0)
], SalesQuotationsController.prototype, "convertToSalesOrder", null);
exports.SalesQuotationsController = SalesQuotationsController = __decorate([
    (0, swagger_1.ApiTags)('sales-quotations'),
    (0, swagger_1.ApiBearerAuth)(),
    (0, common_1.Controller)('sales-quotations'),
    __metadata("design:paramtypes", [sales_quotations_service_1.SalesQuotationsService])
], SalesQuotationsController);
//# sourceMappingURL=sales-quotations.controller.js.map