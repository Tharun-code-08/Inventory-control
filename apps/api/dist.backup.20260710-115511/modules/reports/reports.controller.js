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
exports.ReportsController = void 0;
const common_1 = require("@nestjs/common");
const swagger_1 = require("@nestjs/swagger");
const bullmq_1 = require("@nestjs/bullmq");
const bullmq_2 = require("bullmq");
const crypto_1 = require("crypto");
const current_user_decorator_1 = require("../../common/decorators/current-user.decorator");
const require_permission_decorator_1 = require("../../common/decorators/require-permission.decorator");
const export_report_dto_1 = require("./dto/export-report.dto");
const create_saved_filter_dto_1 = require("./dto/create-saved-filter.dto");
const reports_service_1 = require("./reports.service");
let ReportsController = class ReportsController {
    reports;
    exportsQueue;
    constructor(reports, exportsQueue) {
        this.reports = reports;
        this.exportsQueue = exportsQueue;
    }
    overview(user, shopId, dateFrom, dateTo) {
        return this.reports.analyticsOverview(user, {
            shop_id: shopId,
            date_from: dateFrom,
            date_to: dateTo,
        });
    }
    poSummary(user, shopId, dateFrom, dateTo, poNumber, supplier, status, page, limit) {
        return this.reports.purchaseOrderSummary(user, {
            shop_id: shopId,
            date_from: dateFrom,
            date_to: dateTo,
            po_number: poNumber,
            supplier,
            status,
            page: page ? Number(page) : undefined,
            limit: limit ? Number(limit) : undefined,
        });
    }
    salesSummary(user, shopId, dateFrom, dateTo, orderNumber, customer, status, page, limit) {
        return this.reports.salesOrderSummary(user, {
            shop_id: shopId,
            date_from: dateFrom,
            date_to: dateTo,
            order_number: orderNumber,
            customer,
            status,
            page: page ? Number(page) : undefined,
            limit: limit ? Number(limit) : undefined,
        });
    }
    inventory(user, shopId, category, low) {
        return this.reports.inventory(user, {
            shop_id: shopId,
            category,
            low_stock_only: low === 'true',
        });
    }
    lowStock(user, shopId, category) {
        return this.reports.lowStock(user, shopId, category);
    }
    deadStock(user, shopId, category, supplier, daysUnsold, sortBy, page, limit) {
        const days = daysUnsold ? Number(daysUnsold) : 90;
        return this.reports.deadStock(user, {
            shop_id: shopId,
            category,
            supplier,
            days_unsold: days,
            sort_by: sortBy,
            page: page ? Number(page) : undefined,
            limit: limit ? Number(limit) : undefined,
        });
    }
    reorderIntelligence(user, shopId, dateFrom, dateTo, category, stockStatus, sortBy, page, limit) {
        return this.reports.reorderIntelligence(user, {
            shop_id: shopId,
            date_from: dateFrom,
            date_to: dateTo,
            category,
            stock_status: stockStatus,
            sort_by: sortBy,
            page: page ? Number(page) : undefined,
            limit: limit ? Number(limit) : undefined,
        });
    }
    customerAging(user, shopId, showOverdueOnly, customerName, sortBy, page, limit) {
        return this.reports.customerAging(user, {
            shop_id: shopId,
            show_overdue_only: showOverdueOnly === 'true',
            customer_name: customerName,
            sort_by: sortBy,
            page: page ? Number(page) : undefined,
            limit: limit ? Number(limit) : undefined,
        });
    }
    productProfitability(user, shopId, dateFrom, dateTo, category, showLossOnly, sortBy, page, limit) {
        return this.reports.productProfitability(user, {
            shop_id: shopId,
            date_from: dateFrom,
            date_to: dateTo,
            category,
            show_loss_only: showLossOnly === 'true',
            sort_by: sortBy,
            page: page ? Number(page) : undefined,
            limit: limit ? Number(limit) : undefined,
        });
    }
    actionCenter(user, shopId) {
        return this.reports.actionCenter(user, {
            shop_id: shopId,
        });
    }
    fastMoving(user, shopId, dateFrom, dateTo, limit) {
        return this.reports.fastMoving(user, {
            shop_id: shopId,
            date_from: dateFrom,
            date_to: dateTo,
            limit: limit ? Number(limit) : undefined,
        });
    }
    damaged(user, shopId) {
        return this.reports.damagedRegister(user, shopId);
    }
    gr(user, dateFrom, dateTo, shopId, grNumber, status, productId, category) {
        return this.reports.grRegister(user, {
            date_from: dateFrom,
            date_to: dateTo,
            shop_id: shopId,
            gr_number: grNumber,
            status,
            product_id: productId,
            category,
        });
    }
    gi(user, dateFrom, dateTo, shopId) {
        return this.reports.giRegister(user, dateFrom, dateTo, shopId);
    }
    ledger(user, productId, dateFrom, dateTo, shopId) {
        return this.reports.stockLedger(user, productId, dateFrom, dateTo, shopId);
    }
    shopSummary(user, shopId, dateFrom, dateTo) {
        return this.reports.shopSummary(user, { shop_id: shopId, date_from: dateFrom, date_to: dateTo });
    }
    executiveSummary(user, shopId, dateFrom, dateTo) {
        return this.reports.executiveSummary(user, {
            shop_id: shopId,
            date_from: dateFrom,
            date_to: dateTo,
        });
    }
    inventoryAging(user, shopId, bucket) {
        return this.reports.inventoryAging(user, { shop_id: shopId, bucket });
    }
    rfqSummary(user, shopId, dateFrom, dateTo) {
        return this.reports.rfqSummary(user, { shop_id: shopId, date_from: dateFrom, date_to: dateTo });
    }
    savedFilters(user, reportType) {
        return this.reports.listSavedFilters(user, reportType);
    }
    createSavedFilter(user, body) {
        return this.reports.createSavedFilter(user, {
            reportType: body.reportType,
            name: body.name,
            filterJson: body.filterJson,
        });
    }
    deleteSavedFilter(user, id) {
        return this.reports.deleteSavedFilter(user, id);
    }
    async export(user, body) {
        const filtersHash = (0, crypto_1.createHash)('sha1')
            .update(JSON.stringify(body.filters ?? {}))
            .digest('hex')
            .slice(0, 12);
        const shopId = user.shopId ?? 'global';
        const jobId = `exp:${shopId}:${body.reportType}:${filtersHash}`;
        const job = await this.exportsQueue.add('report-xlsx', { type: 'report-xlsx', reportType: body.reportType, filters: body.filters }, { jobId });
        return { jobId: job.id };
    }
};
exports.ReportsController = ReportsController;
__decorate([
    (0, require_permission_decorator_1.RequirePermission)('report:view'),
    (0, common_1.Get)('analytics/overview'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Query)('shop_id')),
    __param(2, (0, common_1.Query)('date_from')),
    __param(3, (0, common_1.Query)('date_to')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, String, String]),
    __metadata("design:returntype", void 0)
], ReportsController.prototype, "overview", null);
__decorate([
    (0, require_permission_decorator_1.RequirePermission)('report:view'),
    (0, common_1.Get)('po-summary'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Query)('shop_id')),
    __param(2, (0, common_1.Query)('date_from')),
    __param(3, (0, common_1.Query)('date_to')),
    __param(4, (0, common_1.Query)('po_number')),
    __param(5, (0, common_1.Query)('supplier')),
    __param(6, (0, common_1.Query)('status')),
    __param(7, (0, common_1.Query)('page')),
    __param(8, (0, common_1.Query)('limit')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, String, String, String, String, String, String, String]),
    __metadata("design:returntype", void 0)
], ReportsController.prototype, "poSummary", null);
__decorate([
    (0, require_permission_decorator_1.RequirePermission)('report:view'),
    (0, common_1.Get)('sales-summary'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Query)('shop_id')),
    __param(2, (0, common_1.Query)('date_from')),
    __param(3, (0, common_1.Query)('date_to')),
    __param(4, (0, common_1.Query)('order_number')),
    __param(5, (0, common_1.Query)('customer')),
    __param(6, (0, common_1.Query)('status')),
    __param(7, (0, common_1.Query)('page')),
    __param(8, (0, common_1.Query)('limit')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, String, String, String, String, String, String, String]),
    __metadata("design:returntype", void 0)
], ReportsController.prototype, "salesSummary", null);
__decorate([
    (0, require_permission_decorator_1.RequirePermission)('report:view'),
    (0, common_1.Get)('inventory'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Query)('shop_id')),
    __param(2, (0, common_1.Query)('category')),
    __param(3, (0, common_1.Query)('low_stock_only')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, String, String]),
    __metadata("design:returntype", void 0)
], ReportsController.prototype, "inventory", null);
__decorate([
    (0, require_permission_decorator_1.RequirePermission)('report:view'),
    (0, common_1.Get)('low-stock'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Query)('shop_id')),
    __param(2, (0, common_1.Query)('category')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, String]),
    __metadata("design:returntype", void 0)
], ReportsController.prototype, "lowStock", null);
__decorate([
    (0, require_permission_decorator_1.RequirePermission)('report:view'),
    (0, common_1.Get)('dead-stock'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Query)('shop_id')),
    __param(2, (0, common_1.Query)('category')),
    __param(3, (0, common_1.Query)('supplier')),
    __param(4, (0, common_1.Query)('days_unsold')),
    __param(5, (0, common_1.Query)('sort_by')),
    __param(6, (0, common_1.Query)('page')),
    __param(7, (0, common_1.Query)('limit')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, String, String, String, String, String, String]),
    __metadata("design:returntype", void 0)
], ReportsController.prototype, "deadStock", null);
__decorate([
    (0, require_permission_decorator_1.RequirePermission)('report:view'),
    (0, common_1.Get)('reorder-intelligence'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Query)('shop_id')),
    __param(2, (0, common_1.Query)('date_from')),
    __param(3, (0, common_1.Query)('date_to')),
    __param(4, (0, common_1.Query)('category')),
    __param(5, (0, common_1.Query)('stock_status')),
    __param(6, (0, common_1.Query)('sort_by')),
    __param(7, (0, common_1.Query)('page')),
    __param(8, (0, common_1.Query)('limit')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, String, String, String, String, String, String, String]),
    __metadata("design:returntype", void 0)
], ReportsController.prototype, "reorderIntelligence", null);
__decorate([
    (0, require_permission_decorator_1.RequirePermission)('report:view'),
    (0, common_1.Get)('customer-aging'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Query)('shop_id')),
    __param(2, (0, common_1.Query)('show_overdue_only')),
    __param(3, (0, common_1.Query)('customer_name')),
    __param(4, (0, common_1.Query)('sort_by')),
    __param(5, (0, common_1.Query)('page')),
    __param(6, (0, common_1.Query)('limit')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, String, String, String, String, String]),
    __metadata("design:returntype", void 0)
], ReportsController.prototype, "customerAging", null);
__decorate([
    (0, require_permission_decorator_1.RequirePermission)('report:view'),
    (0, common_1.Get)('product-profitability'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Query)('shop_id')),
    __param(2, (0, common_1.Query)('date_from')),
    __param(3, (0, common_1.Query)('date_to')),
    __param(4, (0, common_1.Query)('category')),
    __param(5, (0, common_1.Query)('show_loss_only')),
    __param(6, (0, common_1.Query)('sort_by')),
    __param(7, (0, common_1.Query)('page')),
    __param(8, (0, common_1.Query)('limit')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, String, String, String, String, String, String, String]),
    __metadata("design:returntype", void 0)
], ReportsController.prototype, "productProfitability", null);
__decorate([
    (0, require_permission_decorator_1.RequirePermission)('report:view'),
    (0, common_1.Get)('action-center'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Query)('shop_id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", void 0)
], ReportsController.prototype, "actionCenter", null);
__decorate([
    (0, require_permission_decorator_1.RequirePermission)('report:view'),
    (0, common_1.Get)('fast-moving'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Query)('shop_id')),
    __param(2, (0, common_1.Query)('date_from')),
    __param(3, (0, common_1.Query)('date_to')),
    __param(4, (0, common_1.Query)('limit')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, String, String, String]),
    __metadata("design:returntype", void 0)
], ReportsController.prototype, "fastMoving", null);
__decorate([
    (0, require_permission_decorator_1.RequirePermission)('report:view'),
    (0, common_1.Get)('damaged-stock'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Query)('shop_id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", void 0)
], ReportsController.prototype, "damaged", null);
__decorate([
    (0, require_permission_decorator_1.RequirePermission)('report:view'),
    (0, common_1.Get)('gr-register'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Query)('date_from')),
    __param(2, (0, common_1.Query)('date_to')),
    __param(3, (0, common_1.Query)('shop_id')),
    __param(4, (0, common_1.Query)('gr_number')),
    __param(5, (0, common_1.Query)('status')),
    __param(6, (0, common_1.Query)('product_id')),
    __param(7, (0, common_1.Query)('category')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, String, String, String, String, String, String]),
    __metadata("design:returntype", void 0)
], ReportsController.prototype, "gr", null);
__decorate([
    (0, require_permission_decorator_1.RequirePermission)('report:view'),
    (0, common_1.Get)('gi-register'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Query)('date_from')),
    __param(2, (0, common_1.Query)('date_to')),
    __param(3, (0, common_1.Query)('shop_id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, String, String]),
    __metadata("design:returntype", void 0)
], ReportsController.prototype, "gi", null);
__decorate([
    (0, require_permission_decorator_1.RequirePermission)('report:view'),
    (0, common_1.Get)('stock-ledger'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Query)('product_id')),
    __param(2, (0, common_1.Query)('date_from')),
    __param(3, (0, common_1.Query)('date_to')),
    __param(4, (0, common_1.Query)('shop_id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, String, String, String]),
    __metadata("design:returntype", void 0)
], ReportsController.prototype, "ledger", null);
__decorate([
    (0, require_permission_decorator_1.RequirePermission)('report:view'),
    (0, common_1.Get)('shop-summary'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Query)('shop_id')),
    __param(2, (0, common_1.Query)('date_from')),
    __param(3, (0, common_1.Query)('date_to')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, String, String]),
    __metadata("design:returntype", void 0)
], ReportsController.prototype, "shopSummary", null);
__decorate([
    (0, require_permission_decorator_1.RequirePermission)('report:view'),
    (0, common_1.Get)('executive-summary'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Query)('shop_id')),
    __param(2, (0, common_1.Query)('date_from')),
    __param(3, (0, common_1.Query)('date_to')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, String, String]),
    __metadata("design:returntype", void 0)
], ReportsController.prototype, "executiveSummary", null);
__decorate([
    (0, require_permission_decorator_1.RequirePermission)('report:view'),
    (0, common_1.Get)('inventory-aging'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Query)('shop_id')),
    __param(2, (0, common_1.Query)('bucket')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, String]),
    __metadata("design:returntype", void 0)
], ReportsController.prototype, "inventoryAging", null);
__decorate([
    (0, require_permission_decorator_1.RequirePermission)('report:view'),
    (0, common_1.Get)('rfq-summary'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Query)('shop_id')),
    __param(2, (0, common_1.Query)('date_from')),
    __param(3, (0, common_1.Query)('date_to')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, String, String]),
    __metadata("design:returntype", void 0)
], ReportsController.prototype, "rfqSummary", null);
__decorate([
    (0, require_permission_decorator_1.RequirePermission)('report:view'),
    (0, common_1.Get)('saved-filters'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Query)('report_type')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", void 0)
], ReportsController.prototype, "savedFilters", null);
__decorate([
    (0, require_permission_decorator_1.RequirePermission)('report:view'),
    (0, common_1.Post)('saved-filters'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, create_saved_filter_dto_1.CreateSavedFilterDto]),
    __metadata("design:returntype", void 0)
], ReportsController.prototype, "createSavedFilter", null);
__decorate([
    (0, require_permission_decorator_1.RequirePermission)('report:view'),
    (0, common_1.Delete)('saved-filters/:id'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", void 0)
], ReportsController.prototype, "deleteSavedFilter", null);
__decorate([
    (0, require_permission_decorator_1.RequirePermission)('report:export'),
    (0, common_1.Post)('export'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, export_report_dto_1.ExportReportDto]),
    __metadata("design:returntype", Promise)
], ReportsController.prototype, "export", null);
exports.ReportsController = ReportsController = __decorate([
    (0, swagger_1.ApiTags)('reports'),
    (0, swagger_1.ApiBearerAuth)(),
    (0, common_1.Controller)('reports'),
    __param(1, (0, bullmq_1.InjectQueue)('exports')),
    __metadata("design:paramtypes", [reports_service_1.ReportsService,
        bullmq_2.Queue])
], ReportsController);
//# sourceMappingURL=reports.controller.js.map