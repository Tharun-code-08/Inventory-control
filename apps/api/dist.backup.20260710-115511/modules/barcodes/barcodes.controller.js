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
exports.BarcodesController = void 0;
const common_1 = require("@nestjs/common");
const swagger_1 = require("@nestjs/swagger");
const client_1 = require("@prisma/client");
const current_user_decorator_1 = require("../../common/decorators/current-user.decorator");
const require_permission_decorator_1 = require("../../common/decorators/require-permission.decorator");
const barcodes_service_1 = require("./barcodes.service");
const create_barcode_dto_1 = require("./dto/create-barcode.dto");
const lookup_barcode_dto_1 = require("./dto/lookup-barcode.dto");
const list_barcodes_dto_1 = require("./dto/list-barcodes.dto");
const update_barcode_dto_1 = require("./dto/update-barcode.dto");
const mark_invalid_barcode_dto_1 = require("./dto/mark-invalid-barcode.dto");
let BarcodesController = class BarcodesController {
    barcodes;
    constructor(barcodes) {
        this.barcodes = barcodes;
    }
    lookup(user, query) {
        return this.barcodes.lookup(user, query.code, query.action ?? client_1.ScanAction.LOOKUP, query.shopId, query.source ?? client_1.ScanSource.API);
    }
    scanLogs(user, take) {
        return this.barcodes.scanLogs(user, take ? Number(take) : undefined);
    }
    list(user, productId) {
        return this.barcodes.listForProduct(user, productId);
    }
    listAll(user, query) {
        return this.barcodes.listAll(user, query);
    }
    create(user, productId, dto) {
        return this.barcodes.create(user, productId, dto);
    }
    generate(user, productId) {
        return this.barcodes.generateInternal(user, productId);
    }
    update(user, id, dto) {
        return this.barcodes.update(user, id, dto);
    }
    remove(user, id) {
        return this.barcodes.remove(user, id);
    }
    markInvalid(user, dto) {
        return this.barcodes.markInvalid(user, dto.code, dto.action ?? client_1.ScanAction.LOOKUP, dto.shopId, dto.source ?? client_1.ScanSource.API);
    }
};
exports.BarcodesController = BarcodesController;
__decorate([
    (0, require_permission_decorator_1.RequirePermission)('product:read'),
    (0, common_1.Get)('lookup'),
    (0, swagger_1.ApiOperation)({ summary: 'Resolve a scanned barcode to a product (logs the scan)' }),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Query)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, lookup_barcode_dto_1.LookupBarcodeDto]),
    __metadata("design:returntype", void 0)
], BarcodesController.prototype, "lookup", null);
__decorate([
    (0, require_permission_decorator_1.RequirePermission)('product:read'),
    (0, common_1.Get)('scan-logs'),
    (0, swagger_1.ApiOperation)({ summary: 'Recent scan history for the company (audit)' }),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Query)('take')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", void 0)
], BarcodesController.prototype, "scanLogs", null);
__decorate([
    (0, require_permission_decorator_1.RequirePermission)('product:read'),
    (0, common_1.Get)('products/:productId'),
    (0, swagger_1.ApiOperation)({ summary: 'List barcodes registered for a product' }),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('productId', new common_1.ParseUUIDPipe())),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", void 0)
], BarcodesController.prototype, "list", null);
__decorate([
    (0, require_permission_decorator_1.RequirePermission)('product:read'),
    (0, common_1.Get)(),
    (0, swagger_1.ApiOperation)({ summary: 'Paginated list of all company barcodes' }),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Query)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, list_barcodes_dto_1.ListBarcodesDto]),
    __metadata("design:returntype", void 0)
], BarcodesController.prototype, "listAll", null);
__decorate([
    (0, require_permission_decorator_1.RequirePermission)('product:write'),
    (0, common_1.Post)('products/:productId'),
    (0, swagger_1.ApiOperation)({ summary: 'Register a barcode for a product' }),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('productId', new common_1.ParseUUIDPipe())),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, create_barcode_dto_1.CreateBarcodeDto]),
    __metadata("design:returntype", void 0)
], BarcodesController.prototype, "create", null);
__decorate([
    (0, require_permission_decorator_1.RequirePermission)('product:write'),
    (0, common_1.Post)('products/:productId/generate'),
    (0, swagger_1.ApiOperation)({ summary: 'Register the product code as an internal barcode (idempotent)' }),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('productId', new common_1.ParseUUIDPipe())),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", void 0)
], BarcodesController.prototype, "generate", null);
__decorate([
    (0, require_permission_decorator_1.RequirePermission)('product:write'),
    (0, common_1.Patch)(':id'),
    (0, swagger_1.ApiOperation)({ summary: 'Update barcode metadata' }),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('id', new common_1.ParseUUIDPipe())),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, update_barcode_dto_1.UpdateBarcodeDto]),
    __metadata("design:returntype", void 0)
], BarcodesController.prototype, "update", null);
__decorate([
    (0, require_permission_decorator_1.RequirePermission)('product:write'),
    (0, common_1.Delete)(':id'),
    (0, swagger_1.ApiOperation)({ summary: 'Remove a barcode mapping' }),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('id', new common_1.ParseUUIDPipe())),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", void 0)
], BarcodesController.prototype, "remove", null);
__decorate([
    (0, require_permission_decorator_1.RequirePermission)('product:read'),
    (0, common_1.Post)('mark-invalid'),
    (0, swagger_1.ApiOperation)({ summary: 'Log a scanned code as INVALID' }),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, mark_invalid_barcode_dto_1.MarkInvalidBarcodeDto]),
    __metadata("design:returntype", void 0)
], BarcodesController.prototype, "markInvalid", null);
exports.BarcodesController = BarcodesController = __decorate([
    (0, swagger_1.ApiTags)('barcodes'),
    (0, swagger_1.ApiBearerAuth)(),
    (0, common_1.Controller)('barcodes'),
    __metadata("design:paramtypes", [barcodes_service_1.BarcodesService])
], BarcodesController);
//# sourceMappingURL=barcodes.controller.js.map