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
exports.DashboardController = void 0;
const common_1 = require("@nestjs/common");
const client_1 = require("@prisma/client");
const swagger_1 = require("@nestjs/swagger");
const current_user_decorator_1 = require("../../common/decorators/current-user.decorator");
const require_permission_decorator_1 = require("../../common/decorators/require-permission.decorator");
const audit_service_1 = require("../audit/audit.service");
const dashboard_service_1 = require("./dashboard.service");
const dashboard_event_dto_1 = require("./dto/dashboard-event.dto");
const EVENT_ACTION = {
    opened: client_1.AuditAction.VIEW_DASHBOARD,
    card: client_1.AuditAction.DASHBOARD_CARD_CLICKED,
    action: client_1.AuditAction.DASHBOARD_ACTION_TAKEN,
    exit: client_1.AuditAction.DASHBOARD_EXIT,
    attention_resolved: client_1.AuditAction.ATTENTION_ITEM_RESOLVED,
};
let DashboardController = class DashboardController {
    dashboard;
    audit;
    constructor(dashboard, audit) {
        this.dashboard = dashboard;
        this.audit = audit;
    }
    summary(user, shopId) {
        return this.dashboard.summary(user, shopId);
    }
    async executive(user, shopId) {
        return this.dashboard.executive(user, shopId);
    }
    async recordEvent(user, event, ip, userAgent) {
        await this.audit.logTenant(user, {
            action: EVENT_ACTION[event.type],
            entityType: 'Dashboard',
            severity: client_1.AuditSeverity.LOW,
            ipAddress: ip ?? null,
            userAgent: userAgent ?? null,
            metadata: {
                card: event.card ?? null,
                firstClick: event.firstClick ?? false,
                action: event.action ?? null,
                loadTimeMs: event.loadTimeMs ?? null,
                sessionId: event.sessionId ?? null,
                durationMs: event.durationMs ?? null,
                cardsViewed: event.cardsViewed ?? null,
                actionsTaken: event.actionsTaken ?? null,
                firstCard: event.firstCard ?? null,
                openedAt: event.openedAt ?? null,
                closedAt: event.closedAt ?? null,
                itemId: event.itemId ?? null,
                itemType: event.itemType ?? null,
                resolution: event.resolution ?? null,
            },
        });
    }
};
exports.DashboardController = DashboardController;
__decorate([
    (0, require_permission_decorator_1.RequirePermission)('report:view'),
    (0, common_1.Get)('summary'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Query)('shop_id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", void 0)
], DashboardController.prototype, "summary", null);
__decorate([
    (0, require_permission_decorator_1.RequirePermission)('report:view'),
    (0, common_1.Get)('executive'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Query)('shop_id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", Promise)
], DashboardController.prototype, "executive", null);
__decorate([
    (0, require_permission_decorator_1.RequirePermission)('report:view'),
    (0, common_1.Post)('events'),
    (0, common_1.HttpCode)(204),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, common_1.Ip)()),
    __param(3, (0, common_1.Headers)('user-agent')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, dashboard_event_dto_1.DashboardEventDto, String, String]),
    __metadata("design:returntype", Promise)
], DashboardController.prototype, "recordEvent", null);
exports.DashboardController = DashboardController = __decorate([
    (0, swagger_1.ApiTags)('dashboard'),
    (0, swagger_1.ApiBearerAuth)(),
    (0, common_1.Controller)('dashboard'),
    __metadata("design:paramtypes", [dashboard_service_1.DashboardService,
        audit_service_1.AuditService])
], DashboardController);
//# sourceMappingURL=dashboard.controller.js.map