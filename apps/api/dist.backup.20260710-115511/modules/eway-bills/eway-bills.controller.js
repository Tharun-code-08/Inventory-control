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
exports.EwayBillsController = void 0;
const common_1 = require("@nestjs/common");
const swagger_1 = require("@nestjs/swagger");
const jwt_auth_guard_1 = require("../../common/guards/jwt-auth.guard");
const current_user_decorator_1 = require("../../common/decorators/current-user.decorator");
const eway_bills_service_1 = require("./eway-bills.service");
const eway_bill_dto_1 = require("./dto/eway-bill.dto");
let EwayBillsController = class EwayBillsController {
    service;
    constructor(service) {
        this.service = service;
    }
    list(filter, user) {
        return this.service.list(user, filter);
    }
    stats(user) {
        return this.service.stats(user);
    }
    async downloadPdf(id, user, res) {
        const pdf = await this.service.generatePdf(user, id);
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename="eway-bill-${id}.pdf"`);
        res.send(pdf);
    }
    get(id, user) {
        return this.service.get(user, id);
    }
    create(dto, user) {
        return this.service.create(user, dto);
    }
    createFromInvoice(dto, user) {
        return this.service.createFromInvoice(user, dto);
    }
    update(id, dto, user) {
        return this.service.update(user, id, dto);
    }
    generate(id, user) {
        return this.service.generate(user, id);
    }
    cancel(id, dto, user) {
        return this.service.cancel(user, id, dto.reason);
    }
};
exports.EwayBillsController = EwayBillsController;
__decorate([
    (0, common_1.Get)(),
    (0, swagger_1.ApiOperation)({ summary: 'List e-way bills for the current shop/company' }),
    __param(0, (0, common_1.Query)()),
    __param(1, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [eway_bill_dto_1.EwayBillFilterDto, Object]),
    __metadata("design:returntype", void 0)
], EwayBillsController.prototype, "list", null);
__decorate([
    (0, common_1.Get)('stats/summary'),
    (0, swagger_1.ApiOperation)({ summary: 'E-way bill counts by status' }),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], EwayBillsController.prototype, "stats", null);
__decorate([
    (0, common_1.Get)(':id/pdf'),
    (0, swagger_1.ApiOperation)({ summary: 'Download E-Way Bill as PDF' }),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, current_user_decorator_1.CurrentUser)()),
    __param(2, (0, common_1.Res)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object, Object]),
    __metadata("design:returntype", Promise)
], EwayBillsController.prototype, "downloadPdf", null);
__decorate([
    (0, common_1.Get)(':id'),
    (0, swagger_1.ApiOperation)({ summary: 'Get a single e-way bill' }),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", void 0)
], EwayBillsController.prototype, "get", null);
__decorate([
    (0, common_1.Post)(),
    (0, common_1.HttpCode)(common_1.HttpStatus.CREATED),
    (0, swagger_1.ApiOperation)({ summary: 'Create a draft e-way bill' }),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [eway_bill_dto_1.CreateEwayBillDto, Object]),
    __metadata("design:returntype", void 0)
], EwayBillsController.prototype, "create", null);
__decorate([
    (0, common_1.Post)('from-invoice'),
    (0, common_1.HttpCode)(common_1.HttpStatus.CREATED),
    (0, swagger_1.ApiOperation)({ summary: 'Create a draft e-way bill prefilled from an invoice' }),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [eway_bill_dto_1.GenerateFromInvoiceDto, Object]),
    __metadata("design:returntype", void 0)
], EwayBillsController.prototype, "createFromInvoice", null);
__decorate([
    (0, common_1.Patch)(':id'),
    (0, swagger_1.ApiOperation)({ summary: 'Edit a draft e-way bill' }),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, eway_bill_dto_1.UpdateEwayBillDto, Object]),
    __metadata("design:returntype", void 0)
], EwayBillsController.prototype, "update", null);
__decorate([
    (0, common_1.Post)(':id/generate'),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    (0, swagger_1.ApiOperation)({ summary: 'Generate (issue) the e-way bill number' }),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", void 0)
], EwayBillsController.prototype, "generate", null);
__decorate([
    (0, common_1.Post)(':id/cancel'),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    (0, swagger_1.ApiOperation)({ summary: 'Cancel an e-way bill' }),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, eway_bill_dto_1.CancelEwayBillDto, Object]),
    __metadata("design:returntype", void 0)
], EwayBillsController.prototype, "cancel", null);
exports.EwayBillsController = EwayBillsController = __decorate([
    (0, swagger_1.ApiTags)('E-Way Bills'),
    (0, common_1.Controller)('eway-bills'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, swagger_1.ApiBearerAuth)(),
    __metadata("design:paramtypes", [eway_bills_service_1.EwayBillsService])
], EwayBillsController);
//# sourceMappingURL=eway-bills.controller.js.map