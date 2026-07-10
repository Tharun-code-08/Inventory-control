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
const common_2 = require("@nestjs/common");
const current_user_decorator_1 = require("../../common/decorators/current-user.decorator");
const skip_envelope_decorator_1 = require("../../common/decorators/skip-envelope.decorator");
const require_any_permission_decorator_1 = require("../../common/decorators/require-any-permission.decorator");
const require_permission_decorator_1 = require("../../common/decorators/require-permission.decorator");
const document_pdf_service_1 = require("../../common/pdf/document-pdf.service");
const create_purchase_order_dto_1 = require("./dto/create-purchase-order.dto");
const update_purchase_order_dto_1 = require("./dto/update-purchase-order.dto");
const list_purchase_orders_dto_1 = require("./dto/list-purchase-orders.dto");
const purchase_orders_service_1 = require("./purchase-orders.service");
const po_cancel_service_1 = require("./po-cancel.service");
const cancel_purchase_order_dto_1 = require("./dto/cancel-purchase-order.dto");
let PurchaseOrdersController = class PurchaseOrdersController {
    service;
    poCancel;
    documentPdf;
    constructor(service, poCancel, documentPdf) {
        this.service = service;
        this.poCancel = poCancel;
        this.documentPdf = documentPdf;
    }
    list(user, query) {
        return this.service.list(user, query);
    }
    async create(user, dto, idempotencyKey) {
        const payload = {
            ...dto,
            idempotencyKey: dto.idempotencyKey ?? idempotencyKey,
            confirmOnSend: dto.confirmOnSend ?? dto.sendToSupplier ?? false,
        };
        const po = await this.service.create(user, payload);
        if (!dto.sendToSupplier) {
            return po;
        }
        const emailDelivery = await this.service.sendToSupplierSafe(user, po.id);
        return { ...po, emailDelivery };
    }
    get(user, id) {
        return this.service.get(user, id);
    }
    update(user, id, dto, ifUnmodifiedSince) {
        return this.service.update(user, id, {
            ...dto,
            ifUnmodifiedSince: dto.ifUnmodifiedSince ?? ifUnmodifiedSince,
        });
    }
    confirm(user, id, idempotencyKey) {
        return this.service.confirm(user, id, idempotencyKey);
    }
    requestCancel(user, id, dto) {
        return this.poCancel.requestCancel(user, id, dto.reason);
    }
    confirmCancel(user, id, dto) {
        return this.poCancel.confirmCancel(user, id, dto.reason, dto.otp);
    }
    cancel(user, id, idempotencyKey) {
        return this.service.cancel(user, id, idempotencyKey);
    }
    send(user, id, resend) {
        return this.service.sendToSupplier(user, id, { resend: resend === 'true' });
    }
    async exportPdf(user, id, res) {
        try {
            const result = await this.documentPdf.renderWithRetry(() => this.documentPdf.renderPurchaseOrderPdf(user, id));
            res.set({
                'Content-Type': result.contentType,
                'Content-Disposition': `attachment; filename="${result.filename}"`,
                'Content-Length': result.buffer.length,
            });
            res.send(result.buffer);
        }
        catch (err) {
            if (err instanceof common_2.HttpException)
                throw err;
            const message = err instanceof Error ? err.message.trim() : String(err);
            const lower = message.toLowerCase();
            if (lower.includes('pdf engine') ||
                lower.includes('chromium') ||
                lower.includes('could not render pdf')) {
                throw new common_1.ServiceUnavailableException(message || 'Could not generate PDF');
            }
            throw new common_2.BadRequestException(message || 'Could not generate PDF');
        }
    }
};
exports.PurchaseOrdersController = PurchaseOrdersController;
__decorate([
    (0, require_permission_decorator_1.RequirePermission)('purchase_order:read'),
    (0, common_1.Get)(),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Query)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, list_purchase_orders_dto_1.ListPurchaseOrdersDto]),
    __metadata("design:returntype", void 0)
], PurchaseOrdersController.prototype, "list", null);
__decorate([
    (0, require_permission_decorator_1.RequirePermission)('purchase_order:create'),
    (0, common_1.Post)(),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, common_1.Headers)('x-idempotency-key')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, create_purchase_order_dto_1.CreatePurchaseOrderDto, String]),
    __metadata("design:returntype", Promise)
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
    __param(3, (0, common_1.Headers)('if-unmodified-since')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, update_purchase_order_dto_1.UpdatePurchaseOrderDto, String]),
    __metadata("design:returntype", void 0)
], PurchaseOrdersController.prototype, "update", null);
__decorate([
    (0, require_permission_decorator_1.RequirePermission)('purchase_order:create'),
    (0, common_1.Post)(':id/confirm'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('id')),
    __param(2, (0, common_1.Headers)('x-idempotency-key')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, String]),
    __metadata("design:returntype", void 0)
], PurchaseOrdersController.prototype, "confirm", null);
__decorate([
    (0, require_permission_decorator_1.RequirePermission)('purchase_order:create'),
    (0, common_1.Post)(':id/cancel/request'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('id')),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, cancel_purchase_order_dto_1.RequestPoCancelDto]),
    __metadata("design:returntype", void 0)
], PurchaseOrdersController.prototype, "requestCancel", null);
__decorate([
    (0, require_permission_decorator_1.RequirePermission)('purchase_order:create'),
    (0, common_1.Post)(':id/cancel/confirm'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('id')),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, cancel_purchase_order_dto_1.ConfirmPoCancelDto]),
    __metadata("design:returntype", void 0)
], PurchaseOrdersController.prototype, "confirmCancel", null);
__decorate([
    (0, require_permission_decorator_1.RequirePermission)('purchase_order:create'),
    (0, common_1.Post)(':id/cancel'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('id')),
    __param(2, (0, common_1.Headers)('x-idempotency-key')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, String]),
    __metadata("design:returntype", void 0)
], PurchaseOrdersController.prototype, "cancel", null);
__decorate([
    (0, require_any_permission_decorator_1.RequireAnyPermission)('purchase_order:create', 'purchase_order:approve'),
    (0, common_1.Post)(':id/send'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('id')),
    __param(2, (0, common_1.Query)('resend')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, String]),
    __metadata("design:returntype", void 0)
], PurchaseOrdersController.prototype, "send", null);
__decorate([
    (0, skip_envelope_decorator_1.SkipEnvelope)(),
    (0, require_permission_decorator_1.RequirePermission)('purchase_order:read'),
    (0, common_1.Get)(':id/export-pdf'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('id')),
    __param(2, (0, common_1.Res)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, Object]),
    __metadata("design:returntype", Promise)
], PurchaseOrdersController.prototype, "exportPdf", null);
exports.PurchaseOrdersController = PurchaseOrdersController = __decorate([
    (0, swagger_1.ApiTags)('purchase-orders'),
    (0, swagger_1.ApiBearerAuth)(),
    (0, common_1.Controller)('purchase-orders'),
    __metadata("design:paramtypes", [purchase_orders_service_1.PurchaseOrdersService,
        po_cancel_service_1.PoCancelService,
        document_pdf_service_1.DocumentPdfService])
], PurchaseOrdersController);
//# sourceMappingURL=purchase-orders.controller.js.map