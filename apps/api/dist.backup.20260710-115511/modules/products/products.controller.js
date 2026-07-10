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
exports.ProductsController = void 0;
const common_1 = require("@nestjs/common");
const platform_express_1 = require("@nestjs/platform-express");
const swagger_1 = require("@nestjs/swagger");
const product_image_multer_options_1 = require("../../common/upload/product-image-multer.options");
const current_user_decorator_1 = require("../../common/decorators/current-user.decorator");
const require_permission_decorator_1 = require("../../common/decorators/require-permission.decorator");
const cursor_page_dto_1 = require("../../common/dto/cursor-page.dto");
const bulk_inventory_dto_1 = require("./dto/bulk-inventory.dto");
const bulk_product_upsert_dto_1 = require("./dto/bulk-product-upsert.dto");
const create_product_dto_1 = require("./dto/create-product.dto");
const list_products_dto_1 = require("./dto/list-products.dto");
const update_product_dto_1 = require("./dto/update-product.dto");
const search_hsn_dto_1 = require("./dto/search-hsn.dto");
const gst_hsn_service_1 = require("./gst-hsn.service");
const products_service_1 = require("./products.service");
let ProductsController = class ProductsController {
    products;
    gstHsn;
    constructor(products, gstHsn) {
        this.products = products;
        this.gstHsn = gstHsn;
    }
    list(user, query) {
        return this.products.list(user, {
            shop_id: query.shop_id ?? query.shopId,
            category: query.category,
            is_active: query.is_active ?? query.isActive,
            search: query.search,
            page: query.page,
            limit: query.limit,
            company_catalog: query.company_catalog,
        });
    }
    create(user, dto) {
        return this.products.create(user, dto);
    }
    bulkInventory(user, dto) {
        return this.products.bulkUpdateInventory(user, dto);
    }
    bulkUpsert(user, dto) {
        return this.products.bulkUpsert(user, dto);
    }
    searchHsn(query) {
        return this.gstHsn.search(query.q);
    }
    history(user, id, page) {
        return this.products.stockHistory(user, id, page);
    }
    reorderSuggestion(user, id, shop_id) {
        return this.products.reorderSuggestion(user, id, shop_id);
    }
    get(user, id) {
        return this.products.get(user, id);
    }
    update(user, id, dto) {
        return this.products.update(user, id, dto);
    }
    uploadImage(user, id, image) {
        return this.products.setImage(user, id, image);
    }
    removeImage(user, id) {
        return this.products.removeImage(user, id);
    }
    deletionImpact(user, id) {
        return this.products.deletionImpact(user, id);
    }
    remove(user, id) {
        return this.products.remove(user, id);
    }
};
exports.ProductsController = ProductsController;
__decorate([
    (0, require_permission_decorator_1.RequirePermission)('product:read'),
    (0, common_1.Get)(),
    (0, swagger_1.ApiOperation)({ summary: 'List products (paginated, shop-scoped, filterable)' }),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Query)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, list_products_dto_1.ListProductsDto]),
    __metadata("design:returntype", void 0)
], ProductsController.prototype, "list", null);
__decorate([
    (0, require_permission_decorator_1.RequirePermission)('product:write'),
    (0, common_1.Post)(),
    (0, swagger_1.ApiOperation)({ summary: 'Create a product' }),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, create_product_dto_1.CreateProductDto]),
    __metadata("design:returntype", void 0)
], ProductsController.prototype, "create", null);
__decorate([
    (0, require_permission_decorator_1.RequirePermission)('product:write'),
    (0, common_1.Post)('bulk-inventory'),
    (0, swagger_1.ApiOperation)({
        summary: 'Bulk update plant-level inventory thresholds (min/max/reorder + optional storage location) by productCode + shopNumber',
    }),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, bulk_inventory_dto_1.BulkInventoryDto]),
    __metadata("design:returntype", void 0)
], ProductsController.prototype, "bulkInventory", null);
__decorate([
    (0, require_permission_decorator_1.RequirePermission)('product:write'),
    (0, common_1.Post)('bulk-upsert'),
    (0, swagger_1.ApiOperation)({
        summary: 'Validate or commit SKU-based bulk product upserts, including plant assignment and stock synchronization',
    }),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, bulk_product_upsert_dto_1.BulkProductUpsertDto]),
    __metadata("design:returntype", void 0)
], ProductsController.prototype, "bulkUpsert", null);
__decorate([
    (0, require_permission_decorator_1.RequirePermission)('product:read'),
    (0, common_1.Get)('hsn/search'),
    (0, swagger_1.ApiOperation)({
        summary: 'Search HSN codes via GST portal (description or code prefix)',
    }),
    __param(0, (0, common_1.Query)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [search_hsn_dto_1.SearchHsnDto]),
    __metadata("design:returntype", void 0)
], ProductsController.prototype, "searchHsn", null);
__decorate([
    (0, require_permission_decorator_1.RequirePermission)('product:read'),
    (0, common_1.Get)(':id/stock-history'),
    (0, swagger_1.ApiOperation)({ summary: 'Cursor-paginated stock-ledger history for a product' }),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('id', new common_1.ParseUUIDPipe())),
    __param(2, (0, common_1.Query)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, cursor_page_dto_1.CursorPageDto]),
    __metadata("design:returntype", void 0)
], ProductsController.prototype, "history", null);
__decorate([
    (0, require_permission_decorator_1.RequirePermission)('product:read'),
    (0, common_1.Get)(':id/reorder-suggestion'),
    (0, swagger_1.ApiOperation)({ summary: 'PO prefill from prior orders and stock thresholds' }),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('id', new common_1.ParseUUIDPipe())),
    __param(2, (0, common_1.Query)('shop_id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, String]),
    __metadata("design:returntype", void 0)
], ProductsController.prototype, "reorderSuggestion", null);
__decorate([
    (0, require_permission_decorator_1.RequirePermission)('product:read'),
    (0, common_1.Get)(':id'),
    (0, swagger_1.ApiOperation)({ summary: 'Get a product by id' }),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('id', new common_1.ParseUUIDPipe())),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", void 0)
], ProductsController.prototype, "get", null);
__decorate([
    (0, require_permission_decorator_1.RequirePermission)('product:write'),
    (0, common_1.Patch)(':id'),
    (0, swagger_1.ApiOperation)({ summary: 'Update a product' }),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('id', new common_1.ParseUUIDPipe())),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, update_product_dto_1.UpdateProductDto]),
    __metadata("design:returntype", void 0)
], ProductsController.prototype, "update", null);
__decorate([
    (0, require_permission_decorator_1.RequirePermission)('product:write'),
    (0, common_1.Post)(':id/image'),
    (0, swagger_1.ApiOperation)({ summary: 'Upload or replace the product image (compressed + thumbnailed)' }),
    (0, common_1.UseInterceptors)((0, platform_express_1.FileInterceptor)('image', product_image_multer_options_1.productImageMulterOptions)),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('id', new common_1.ParseUUIDPipe())),
    __param(2, (0, common_1.UploadedFile)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, Object]),
    __metadata("design:returntype", void 0)
], ProductsController.prototype, "uploadImage", null);
__decorate([
    (0, require_permission_decorator_1.RequirePermission)('product:write'),
    (0, common_1.Delete)(':id/image'),
    (0, swagger_1.ApiOperation)({ summary: 'Remove the product image' }),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('id', new common_1.ParseUUIDPipe())),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", void 0)
], ProductsController.prototype, "removeImage", null);
__decorate([
    (0, require_permission_decorator_1.RequirePermission)('product:write'),
    (0, common_1.Get)(':id/deletion-impact'),
    (0, swagger_1.ApiOperation)({ summary: 'Explain whether a product can be permanently deleted' }),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('id', new common_1.ParseUUIDPipe())),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", void 0)
], ProductsController.prototype, "deletionImpact", null);
__decorate([
    (0, require_permission_decorator_1.RequirePermission)('product:write'),
    (0, common_1.Delete)(':id'),
    (0, swagger_1.ApiOperation)({ summary: 'Delete a product (only if it has no stock history)' }),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('id', new common_1.ParseUUIDPipe())),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", void 0)
], ProductsController.prototype, "remove", null);
exports.ProductsController = ProductsController = __decorate([
    (0, swagger_1.ApiTags)('products'),
    (0, swagger_1.ApiBearerAuth)(),
    (0, common_1.Controller)('products'),
    __metadata("design:paramtypes", [products_service_1.ProductsService,
        gst_hsn_service_1.GstHsnService])
], ProductsController);
//# sourceMappingURL=products.controller.js.map