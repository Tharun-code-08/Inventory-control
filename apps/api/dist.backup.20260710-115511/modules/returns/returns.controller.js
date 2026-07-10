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
exports.ReturnsController = void 0;
const common_1 = require("@nestjs/common");
const swagger_1 = require("@nestjs/swagger");
const platform_express_1 = require("@nestjs/platform-express");
const current_user_decorator_1 = require("../../common/decorators/current-user.decorator");
const public_decorator_1 = require("../../common/decorators/public.decorator");
const require_permission_decorator_1 = require("../../common/decorators/require-permission.decorator");
const return_image_multer_options_1 = require("../../common/upload/return-image-multer.options");
const create_customer_return_dto_1 = require("./dto/create-customer-return.dto");
const create_supplier_return_dto_1 = require("./dto/create-supplier-return.dto");
const update_supplier_return_dto_1 = require("./dto/update-supplier-return.dto");
const upload_supplier_return_image_dto_1 = require("./dto/upload-supplier-return-image.dto");
const returns_service_1 = require("./returns.service");
let ReturnsController = class ReturnsController {
    service;
    constructor(service) {
        this.service = service;
    }
    listCustomer(user) {
        return this.service.listCustomerReturns(user);
    }
    createCustomer(user, dto) {
        return this.service.createCustomerReturn(user, dto);
    }
    postCustomer(user, id) {
        return this.service.postCustomerReturn(user, id);
    }
    listSupplier(user) {
        return this.service.listSupplierReturns(user);
    }
    getSupplier(user, id) {
        return this.service.getSupplierReturn(user, id);
    }
    createSupplier(user, dto) {
        return this.service.createSupplierReturn(user, dto);
    }
    updateSupplier(user, id, dto) {
        return this.service.updateSupplierReturn(user, id, dto);
    }
    uploadSupplierImage(user, id, dto, file) {
        return this.service.uploadSupplierReturnImage(user, id, dto, file);
    }
    deleteSupplierImage(user, id, imageId) {
        return this.service.removeSupplierReturnImage(user, id, imageId);
    }
    submitSupplier(user, id) {
        return this.service.submitSupplierReturn(user, id);
    }
    sendSupplier(user, id, resend) {
        return this.service.sendSupplierReturnNotice(user, id, { resend: resend === 'true' });
    }
    acknowledgeSupplier(user, id) {
        return this.service.manuallyAcknowledgeSupplierReturn(user, id);
    }
    cancelSupplier(user, id) {
        return this.service.cancelSupplierReturn(user, id);
    }
    postSupplier(user, id) {
        return this.service.postSupplierReturn(user, id);
    }
    getSupplierPublic(token) {
        return this.service.getSupplierReturnPublic(token);
    }
    acknowledgeSupplierPublic(token) {
        return this.service.acknowledgeSupplierReturn(token);
    }
};
exports.ReturnsController = ReturnsController;
__decorate([
    (0, common_1.Get)('customer'),
    (0, require_permission_decorator_1.RequirePermission)('shop:read'),
    (0, swagger_1.ApiOperation)({ summary: 'List customer returns' }),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], ReturnsController.prototype, "listCustomer", null);
__decorate([
    (0, common_1.Post)('customer'),
    (0, require_permission_decorator_1.RequirePermission)('shop:write'),
    (0, swagger_1.ApiOperation)({ summary: 'Create a customer return (DRAFT)' }),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, create_customer_return_dto_1.CreateCustomerReturnDto]),
    __metadata("design:returntype", void 0)
], ReturnsController.prototype, "createCustomer", null);
__decorate([
    (0, common_1.Post)('customer/:id/post'),
    (0, require_permission_decorator_1.RequirePermission)('shop:write'),
    (0, swagger_1.ApiOperation)({ summary: 'Post a customer return: stock back-in + credit note' }),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('id', new common_1.ParseUUIDPipe())),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", void 0)
], ReturnsController.prototype, "postCustomer", null);
__decorate([
    (0, common_1.Get)('supplier'),
    (0, require_permission_decorator_1.RequirePermission)('shop:read'),
    (0, swagger_1.ApiOperation)({ summary: 'List supplier returns' }),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], ReturnsController.prototype, "listSupplier", null);
__decorate([
    (0, common_1.Get)('supplier/:id'),
    (0, require_permission_decorator_1.RequirePermission)('shop:read'),
    (0, swagger_1.ApiOperation)({ summary: 'Get supplier return detail' }),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('id', new common_1.ParseUUIDPipe())),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", void 0)
], ReturnsController.prototype, "getSupplier", null);
__decorate([
    (0, common_1.Post)('supplier'),
    (0, require_permission_decorator_1.RequirePermission)('shop:write'),
    (0, swagger_1.ApiOperation)({ summary: 'Create a supplier return (DRAFT)' }),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, create_supplier_return_dto_1.CreateSupplierReturnDto]),
    __metadata("design:returntype", void 0)
], ReturnsController.prototype, "createSupplier", null);
__decorate([
    (0, common_1.Patch)('supplier/:id'),
    (0, require_permission_decorator_1.RequirePermission)('shop:write'),
    (0, swagger_1.ApiOperation)({ summary: 'Update a supplier return draft' }),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('id', new common_1.ParseUUIDPipe())),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, update_supplier_return_dto_1.UpdateSupplierReturnDto]),
    __metadata("design:returntype", void 0)
], ReturnsController.prototype, "updateSupplier", null);
__decorate([
    (0, common_1.Post)('supplier/:id/images'),
    (0, require_permission_decorator_1.RequirePermission)('shop:write'),
    (0, swagger_1.ApiOperation)({ summary: 'Upload a supplier return image' }),
    (0, swagger_1.ApiConsumes)('multipart/form-data'),
    (0, swagger_1.ApiBody)({
        schema: {
            type: 'object',
            properties: {
                file: { type: 'string', format: 'binary' },
                returnItemId: { type: 'string', format: 'uuid', nullable: true },
            },
            required: ['file'],
        },
    }),
    (0, common_1.UseInterceptors)((0, platform_express_1.FileInterceptor)('file', return_image_multer_options_1.returnImageMulterOptions)),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('id', new common_1.ParseUUIDPipe())),
    __param(2, (0, common_1.Body)()),
    __param(3, (0, common_1.UploadedFile)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, upload_supplier_return_image_dto_1.UploadSupplierReturnImageDto, Object]),
    __metadata("design:returntype", void 0)
], ReturnsController.prototype, "uploadSupplierImage", null);
__decorate([
    (0, common_1.Delete)('supplier/:id/images/:imageId'),
    (0, require_permission_decorator_1.RequirePermission)('shop:write'),
    (0, swagger_1.ApiOperation)({ summary: 'Delete a supplier return image' }),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('id', new common_1.ParseUUIDPipe())),
    __param(2, (0, common_1.Param)('imageId', new common_1.ParseUUIDPipe())),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, String]),
    __metadata("design:returntype", void 0)
], ReturnsController.prototype, "deleteSupplierImage", null);
__decorate([
    (0, common_1.Post)('supplier/:id/submit'),
    (0, require_permission_decorator_1.RequirePermission)('shop:write'),
    (0, swagger_1.ApiOperation)({ summary: 'Submit supplier return and send acknowledgement email' }),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('id', new common_1.ParseUUIDPipe())),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", void 0)
], ReturnsController.prototype, "submitSupplier", null);
__decorate([
    (0, common_1.Post)('supplier/:id/send'),
    (0, require_permission_decorator_1.RequirePermission)('shop:write'),
    (0, swagger_1.ApiOperation)({ summary: 'Resend supplier return notice email (with PDF and images)' }),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('id', new common_1.ParseUUIDPipe())),
    __param(2, (0, common_1.Query)('resend')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, String]),
    __metadata("design:returntype", void 0)
], ReturnsController.prototype, "sendSupplier", null);
__decorate([
    (0, common_1.Post)('supplier/:id/acknowledge'),
    (0, require_permission_decorator_1.RequirePermission)('shop:write'),
    (0, swagger_1.ApiOperation)({ summary: 'Manually accept/acknowledge a submitted supplier return and post stock' }),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('id', new common_1.ParseUUIDPipe())),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", void 0)
], ReturnsController.prototype, "acknowledgeSupplier", null);
__decorate([
    (0, common_1.Post)('supplier/:id/cancel'),
    (0, require_permission_decorator_1.RequirePermission)('shop:write'),
    (0, swagger_1.ApiOperation)({ summary: 'Cancel a supplier return' }),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('id', new common_1.ParseUUIDPipe())),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", void 0)
], ReturnsController.prototype, "cancelSupplier", null);
__decorate([
    (0, common_1.Post)('supplier/:id/post'),
    (0, require_permission_decorator_1.RequirePermission)('shop:write'),
    (0, swagger_1.ApiOperation)({ summary: 'Legacy supplier return posting endpoint' }),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('id', new common_1.ParseUUIDPipe())),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", void 0)
], ReturnsController.prototype, "postSupplier", null);
__decorate([
    (0, public_decorator_1.Public)(),
    (0, common_1.Get)('supplier/public/:token'),
    (0, swagger_1.ApiOperation)({ summary: 'Public supplier return acknowledgement preview' }),
    __param(0, (0, common_1.Param)('token')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], ReturnsController.prototype, "getSupplierPublic", null);
__decorate([
    (0, public_decorator_1.Public)(),
    (0, common_1.Post)('supplier/public/:token/acknowledge'),
    (0, swagger_1.ApiOperation)({ summary: 'Public supplier acknowledgement for a return notice' }),
    __param(0, (0, common_1.Param)('token')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], ReturnsController.prototype, "acknowledgeSupplierPublic", null);
exports.ReturnsController = ReturnsController = __decorate([
    (0, swagger_1.ApiTags)('Returns'),
    (0, swagger_1.ApiBearerAuth)(),
    (0, common_1.Controller)('returns'),
    __metadata("design:paramtypes", [returns_service_1.ReturnsService])
], ReturnsController);
//# sourceMappingURL=returns.controller.js.map