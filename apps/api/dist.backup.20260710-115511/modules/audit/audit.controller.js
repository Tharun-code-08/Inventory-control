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
var AuditController_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuditController = void 0;
const common_1 = require("@nestjs/common");
const swagger_1 = require("@nestjs/swagger");
const jwt_auth_guard_1 = require("../../common/guards/jwt-auth.guard");
const audit_export_rate_limit_guard_1 = require("../../common/guards/audit-export-rate-limit.guard");
const current_user_decorator_1 = require("../../common/decorators/current-user.decorator");
const audit_service_1 = require("./audit.service");
const dto_1 = require("./dto");
let AuditController = AuditController_1 = class AuditController {
    auditService;
    exportRateLimitGuard;
    logger = new common_1.Logger(AuditController_1.name);
    constructor(auditService, exportRateLimitGuard) {
        this.auditService = auditService;
        this.exportRateLimitGuard = exportRateLimitGuard;
    }
    async listAuditLogs(user, query) {
        this.logger.debug(`Fetching audit logs for company ${user.companyId}, page ${query.page}`);
        const convertedFilters = {
            ...query,
            startDate: query.startDate ? new Date(query.startDate) : undefined,
            endDate: query.endDate ? new Date(query.endDate) : undefined,
        };
        const { data, total } = await this.auditService.findAll(user.companyId, convertedFilters, {
            page: query.page,
            limit: query.limit,
            sortBy: query.sortBy,
            sortOrder: query.sortOrder,
        });
        const hasMore = query.page * query.limit < total;
        return {
            data: data,
            total,
            page: query.page,
            limit: query.limit,
            hasMore,
        };
    }
    async getAuditLog(user, auditLogId) {
        this.logger.debug(`Fetching audit log ${auditLogId}`);
        const log = await this.auditService.findById(auditLogId, user.companyId);
        if (!log) {
            throw new common_1.NotFoundException('Audit log not found');
        }
        return log;
    }
    async getAuditLogsByUser(user, targetUserId, pagination) {
        this.logger.debug(`Fetching audit logs for user ${targetUserId}`);
        const { data, total } = await this.auditService.findByUser(user.companyId, targetUserId, {
            page: pagination.page,
            limit: pagination.limit,
            sortBy: pagination.sortBy,
            sortOrder: pagination.sortOrder,
        });
        const hasMore = pagination.page * pagination.limit < total;
        return {
            data: data,
            total,
            page: pagination.page,
            limit: pagination.limit,
            hasMore,
        };
    }
    async getAuditLogsByEntity(user, entityType, entityId) {
        this.logger.debug(`Fetching audit logs for ${entityType} ${entityId}`);
        const logs = await this.auditService.findByEntity(user.companyId, entityType, entityId);
        return logs;
    }
    async exportAuditLogsCsv(user, filters) {
        this.logger.debug(`Exporting audit logs for company ${user.companyId}`);
        const convertedFilters = {
            ...filters,
            startDate: filters.startDate ? new Date(filters.startDate) : undefined,
            endDate: filters.endDate ? new Date(filters.endDate) : undefined,
        };
        const csv = await this.auditService.exportCsv(user.companyId, convertedFilters);
        return csv;
    }
};
exports.AuditController = AuditController;
__decorate([
    (0, common_1.Get)(),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    (0, swagger_1.ApiOperation)({
        summary: 'List audit logs',
        description: 'Get paginated list of audit logs with optional filtering',
    }),
    (0, swagger_1.ApiResponse)({ status: 200, type: dto_1.AuditListResponseDto }),
    (0, swagger_1.ApiQuery)({ name: 'page', required: false, type: Number, example: 1 }),
    (0, swagger_1.ApiQuery)({ name: 'limit', required: false, type: Number, example: 20 }),
    (0, swagger_1.ApiQuery)({ name: 'action', required: false, type: String }),
    (0, swagger_1.ApiQuery)({ name: 'entityType', required: false, type: String }),
    (0, swagger_1.ApiQuery)({ name: 'entityId', required: false, type: String }),
    (0, swagger_1.ApiQuery)({ name: 'userId', required: false, type: String }),
    (0, swagger_1.ApiQuery)({ name: 'startDate', required: false, type: String }),
    (0, swagger_1.ApiQuery)({ name: 'endDate', required: false, type: String }),
    (0, swagger_1.ApiQuery)({ name: 'ipAddress', required: false, type: String }),
    (0, swagger_1.ApiQuery)({ name: 'sortBy', required: false, enum: ['createdAt', 'userId', 'action'] }),
    (0, swagger_1.ApiQuery)({ name: 'sortOrder', required: false, enum: ['asc', 'desc'] }),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Query)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, dto_1.AuditListQueryDto]),
    __metadata("design:returntype", Promise)
], AuditController.prototype, "listAuditLogs", null);
__decorate([
    (0, common_1.Get)(':id'),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    (0, swagger_1.ApiOperation)({
        summary: 'Get audit log by ID',
        description: 'Retrieve a specific audit log entry',
    }),
    (0, swagger_1.ApiResponse)({ status: 200, type: dto_1.AuditLogResponseDto }),
    (0, swagger_1.ApiResponse)({ status: 404, description: 'Audit log not found' }),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", Promise)
], AuditController.prototype, "getAuditLog", null);
__decorate([
    (0, common_1.Get)('users/:userId'),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    (0, swagger_1.ApiOperation)({
        summary: 'Get audit logs by user',
        description: 'Retrieve all audit log entries for a specific user',
    }),
    (0, swagger_1.ApiResponse)({ status: 200, type: dto_1.AuditListResponseDto }),
    (0, swagger_1.ApiQuery)({ name: 'page', required: false, type: Number, example: 1 }),
    (0, swagger_1.ApiQuery)({ name: 'limit', required: false, type: Number, example: 20 }),
    (0, swagger_1.ApiQuery)({ name: 'sortBy', required: false, enum: ['createdAt', 'userId', 'action'] }),
    (0, swagger_1.ApiQuery)({ name: 'sortOrder', required: false, enum: ['asc', 'desc'] }),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('userId')),
    __param(2, (0, common_1.Query)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, dto_1.PaginationDto]),
    __metadata("design:returntype", Promise)
], AuditController.prototype, "getAuditLogsByUser", null);
__decorate([
    (0, common_1.Get)('entity/:entityType/:entityId'),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    (0, swagger_1.ApiOperation)({
        summary: 'Get audit logs by entity',
        description: 'Retrieve all audit log entries for a specific entity (e.g., a product or order)',
    }),
    (0, swagger_1.ApiResponse)({ status: 200, type: [dto_1.AuditLogResponseDto] }),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('entityType')),
    __param(2, (0, common_1.Param)('entityId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, String]),
    __metadata("design:returntype", Promise)
], AuditController.prototype, "getAuditLogsByEntity", null);
__decorate([
    (0, common_1.UseGuards)(audit_export_rate_limit_guard_1.AuditExportRateLimitGuard),
    (0, common_1.Get)('export/csv'),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    (0, common_1.Header)('Content-Type', 'text/csv; charset=utf-8'),
    (0, common_1.Header)('Content-Disposition', 'attachment; filename="audit-log.csv"'),
    (0, swagger_1.ApiOperation)({
        summary: 'Export audit logs as CSV',
        description: 'Download audit logs in CSV format (max 10,000 rows). Limit: 100 exports per hour per user.',
    }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'CSV file exported successfully' }),
    (0, swagger_1.ApiResponse)({ status: 429, description: 'Export limit exceeded (100 per hour)' }),
    (0, swagger_1.ApiQuery)({ name: 'action', required: false, type: String }),
    (0, swagger_1.ApiQuery)({ name: 'entityType', required: false, type: String }),
    (0, swagger_1.ApiQuery)({ name: 'entityId', required: false, type: String }),
    (0, swagger_1.ApiQuery)({ name: 'userId', required: false, type: String }),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Query)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, dto_1.AuditFilterDto]),
    __metadata("design:returntype", Promise)
], AuditController.prototype, "exportAuditLogsCsv", null);
exports.AuditController = AuditController = AuditController_1 = __decorate([
    (0, swagger_1.ApiTags)('Audit Logs'),
    (0, common_1.Controller)('audit'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, swagger_1.ApiBearerAuth)(),
    __metadata("design:paramtypes", [audit_service_1.AuditService,
        audit_export_rate_limit_guard_1.AuditExportRateLimitGuard])
], AuditController);
//# sourceMappingURL=audit.controller.js.map