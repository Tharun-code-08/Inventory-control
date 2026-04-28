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
const current_user_decorator_1 = require("../../common/decorators/current-user.decorator");
const require_permission_decorator_1 = require("../../common/decorators/require-permission.decorator");
const export_report_dto_1 = require("./dto/export-report.dto");
const reports_service_1 = require("./reports.service");
let ReportsController = class ReportsController {
    reports;
    exportsQueue;
    constructor(reports, exportsQueue) {
        this.reports = reports;
        this.exportsQueue = exportsQueue;
    }
    inventory(user, shopId, category, low) {
        return this.reports.inventory(user, {
            shop_id: shopId,
            category,
            low_stock_only: low === 'true',
        });
    }
    lowStock(user, shopId) {
        return this.reports.lowStock(user, shopId);
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
    gr(user, dateFrom, dateTo, shopId) {
        return this.reports.grRegister(user, dateFrom, dateTo, shopId);
    }
    gi(user, dateFrom, dateTo, shopId) {
        return this.reports.giRegister(user, dateFrom, dateTo, shopId);
    }
    ledger(user, productId, dateFrom, dateTo, shopId) {
        return this.reports.stockLedger(user, productId, dateFrom, dateTo, shopId);
    }
    shopSummary(user, shopId) {
        return this.reports.shopSummary(user, shopId);
    }
    async export(body) {
        const job = await this.exportsQueue.add('report-xlsx', { type: 'report-xlsx', reportType: body.reportType, filters: body.filters }, { removeOnComplete: true });
        return { jobId: job.id };
    }
};
exports.ReportsController = ReportsController;
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
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", void 0)
], ReportsController.prototype, "lowStock", null);
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
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, String, String]),
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
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", void 0)
], ReportsController.prototype, "shopSummary", null);
__decorate([
    (0, require_permission_decorator_1.RequirePermission)('report:export'),
    (0, common_1.Post)('export'),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [export_report_dto_1.ExportReportDto]),
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