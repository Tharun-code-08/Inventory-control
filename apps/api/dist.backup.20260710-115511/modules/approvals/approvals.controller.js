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
var ApprovalController_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.ApprovalController = void 0;
const common_1 = require("@nestjs/common");
const swagger_1 = require("@nestjs/swagger");
const jwt_auth_guard_1 = require("../../common/guards/jwt-auth.guard");
const current_user_decorator_1 = require("../../common/decorators/current-user.decorator");
const services_1 = require("./services");
const dto_1 = require("./dto");
let ApprovalController = ApprovalController_1 = class ApprovalController {
    approvalService;
    logger = new common_1.Logger(ApprovalController_1.name);
    constructor(approvalService) {
        this.approvalService = approvalService;
    }
    async createApprovalRequest(dto, user) {
        this.logger.debug(`Creating approval request for reference ${dto.referenceId}`);
        return this.approvalService.createApprovalRequest(dto, user.id, user.companyId);
    }
    async getApprovals(filter, user) {
        const { data, total, pendingCount } = await this.approvalService.getApprovals(user.id, user.companyId, filter);
        const page = filter.page || 1;
        const limit = filter.limit || 20;
        const hasMore = page * limit < total;
        return {
            data: data,
            total,
            pendingCount,
            page,
            limit,
            hasMore,
        };
    }
    async getApprovalStats(user) {
        return this.approvalService.getApprovalStats(user.companyId);
    }
    async getPendingCount(user) {
        const count = await this.approvalService.getPendingApprovalsCount(user.companyId);
        return { count };
    }
    async getApproval(approvalId) {
        return this.approvalService.getApproval(approvalId);
    }
    async approveApproval(approvalId, dto, user) {
        this.logger.debug(`Approving approval request ${approvalId}`);
        return this.approvalService.approve(approvalId, user.id, user.companyId, dto);
    }
    async rejectApproval(approvalId, dto, user) {
        this.logger.debug(`Rejecting approval request ${approvalId}`);
        return this.approvalService.reject(approvalId, user.id, user.companyId, dto);
    }
    async getComments(approvalId) {
        return this.approvalService.getComments(approvalId);
    }
    async addComment(approvalId, dto, user) {
        return this.approvalService.addComment(approvalId, user.id, dto.comment);
    }
    async escalateApproval(approvalId, body, user) {
        await this.approvalService.escalateApproval(approvalId, body.escalatedTo, user.id);
        return { success: true };
    }
    async checkEscalation(approvalId) {
        await this.approvalService.checkEscalation(approvalId);
        return { checked: true };
    }
};
exports.ApprovalController = ApprovalController;
__decorate([
    (0, common_1.Post)(),
    (0, common_1.HttpCode)(common_1.HttpStatus.CREATED),
    (0, swagger_1.ApiOperation)({ summary: 'Create an approval request' }),
    (0, swagger_1.ApiResponse)({ status: 201, type: dto_1.ApprovalRequestResponseDto }),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [dto_1.CreateApprovalRequestDto, Object]),
    __metadata("design:returntype", Promise)
], ApprovalController.prototype, "createApprovalRequest", null);
__decorate([
    (0, common_1.Get)(),
    (0, swagger_1.ApiOperation)({ summary: 'Get pending approvals for current user' }),
    (0, swagger_1.ApiResponse)({ status: 200, type: dto_1.ApprovalListResponseDto }),
    (0, swagger_1.ApiQuery)({ name: 'page', required: false, type: Number, example: 1 }),
    (0, swagger_1.ApiQuery)({ name: 'limit', required: false, type: Number, example: 20 }),
    (0, swagger_1.ApiQuery)({ name: 'status', required: false, enum: ['PENDING', 'APPROVED', 'REJECTED'] }),
    (0, swagger_1.ApiQuery)({ name: 'approvalType', required: false, type: String }),
    (0, swagger_1.ApiQuery)({ name: 'sortBy', required: false, enum: ['createdAt', 'requiredAt', 'amount'] }),
    (0, swagger_1.ApiQuery)({ name: 'sortOrder', required: false, enum: ['asc', 'desc'] }),
    __param(0, (0, common_1.Query)()),
    __param(1, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [dto_1.ApprovalFilterDto, Object]),
    __metadata("design:returntype", Promise)
], ApprovalController.prototype, "getApprovals", null);
__decorate([
    (0, common_1.Get)('/stats/summary'),
    (0, swagger_1.ApiOperation)({ summary: 'Get approval stats for company' }),
    (0, swagger_1.ApiResponse)({ status: 200 }),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], ApprovalController.prototype, "getApprovalStats", null);
__decorate([
    (0, common_1.Get)('/count/pending'),
    (0, swagger_1.ApiOperation)({ summary: 'Get pending approval count' }),
    (0, swagger_1.ApiResponse)({ status: 200, schema: { properties: { count: { type: 'number' } } } }),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], ApprovalController.prototype, "getPendingCount", null);
__decorate([
    (0, common_1.Get)(':approvalId'),
    (0, swagger_1.ApiOperation)({ summary: 'Get a single approval request' }),
    (0, swagger_1.ApiResponse)({ status: 200, type: dto_1.ApprovalRequestResponseDto }),
    __param(0, (0, common_1.Param)('approvalId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], ApprovalController.prototype, "getApproval", null);
__decorate([
    (0, common_1.Post)(':approvalId/approve'),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    (0, swagger_1.ApiOperation)({ summary: 'Approve an approval request' }),
    (0, swagger_1.ApiResponse)({ status: 200, type: dto_1.ApprovalRequestResponseDto }),
    __param(0, (0, common_1.Param)('approvalId')),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, dto_1.ApproveApprovalDto, Object]),
    __metadata("design:returntype", Promise)
], ApprovalController.prototype, "approveApproval", null);
__decorate([
    (0, common_1.Post)(':approvalId/reject'),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    (0, swagger_1.ApiOperation)({ summary: 'Reject an approval request' }),
    (0, swagger_1.ApiResponse)({ status: 200, type: dto_1.ApprovalRequestResponseDto }),
    __param(0, (0, common_1.Param)('approvalId')),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, dto_1.RejectApprovalDto, Object]),
    __metadata("design:returntype", Promise)
], ApprovalController.prototype, "rejectApproval", null);
__decorate([
    (0, common_1.Get)(':approvalId/comments'),
    (0, swagger_1.ApiOperation)({ summary: 'Get comments for an approval request' }),
    (0, swagger_1.ApiResponse)({ status: 200, type: [dto_1.ApprovalCommentResponseDto] }),
    __param(0, (0, common_1.Param)('approvalId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], ApprovalController.prototype, "getComments", null);
__decorate([
    (0, common_1.Post)(':approvalId/comments'),
    (0, common_1.HttpCode)(common_1.HttpStatus.CREATED),
    (0, swagger_1.ApiOperation)({ summary: 'Add a comment to an approval request' }),
    (0, swagger_1.ApiResponse)({ status: 201, type: dto_1.ApprovalCommentResponseDto }),
    __param(0, (0, common_1.Param)('approvalId')),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, dto_1.AddApprovalCommentDto, Object]),
    __metadata("design:returntype", Promise)
], ApprovalController.prototype, "addComment", null);
__decorate([
    (0, common_1.Post)(':approvalId/escalate'),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    (0, swagger_1.ApiOperation)({ summary: 'Escalate an approval request' }),
    (0, swagger_1.ApiResponse)({ status: 200 }),
    __param(0, (0, common_1.Param)('approvalId')),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object, Object]),
    __metadata("design:returntype", Promise)
], ApprovalController.prototype, "escalateApproval", null);
__decorate([
    (0, common_1.Post)(':approvalId/check-escalation'),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    (0, swagger_1.ApiOperation)({ summary: 'Check if approval needs escalation' }),
    (0, swagger_1.ApiResponse)({ status: 200 }),
    __param(0, (0, common_1.Param)('approvalId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], ApprovalController.prototype, "checkEscalation", null);
exports.ApprovalController = ApprovalController = ApprovalController_1 = __decorate([
    (0, swagger_1.ApiTags)('Approvals'),
    (0, common_1.Controller)('approvals'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, swagger_1.ApiBearerAuth)(),
    __metadata("design:paramtypes", [services_1.ApprovalService])
], ApprovalController);
//# sourceMappingURL=approvals.controller.js.map