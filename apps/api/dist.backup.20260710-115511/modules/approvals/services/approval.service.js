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
var ApprovalService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.ApprovalService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../../../prisma/prisma.service");
const client_1 = require("@prisma/client");
const services_1 = require("../../notifications/services");
const client_2 = require("@prisma/client");
const audit_service_1 = require("../../audit/audit.service");
const approval_audit_1 = require("../../../common/state-machines/approval-audit");
let ApprovalService = ApprovalService_1 = class ApprovalService {
    prisma;
    notificationService;
    audit;
    logger = new common_1.Logger(ApprovalService_1.name);
    constructor(prisma, notificationService, audit) {
        this.prisma = prisma;
        this.notificationService = notificationService;
        this.audit = audit;
    }
    formatApprovalResponse(approval) {
        return {
            ...approval,
            amount: approval.amount ? Number(approval.amount) : null,
        };
    }
    async createApprovalRequest(dto, requestedBy, companyId) {
        const assignee = await this.prisma.user.findUnique({
            where: { id: dto.assignedTo },
        });
        if (!assignee) {
            throw new common_1.NotFoundException('Approver user not found');
        }
        const approval = await this.prisma.approvalRequest.create({
            data: {
                companyId,
                requestedBy,
                assignedTo: dto.assignedTo,
                approvalType: dto.approvalType,
                referenceId: dto.referenceId,
                documentNumber: dto.documentNumber,
                amount: dto.amount,
                description: dto.description,
                requiredAt: dto.requiredAt ? new Date(dto.requiredAt) : undefined,
                status: client_1.ApprovalStatus.PENDING,
            },
        });
        const notificationType = this.getNotificationTypeForApproval(dto.approvalType);
        try {
            await this.notificationService.create({
                title: `Approval Required: ${approval.documentNumber || dto.approvalType}`,
                message: `${dto.description || 'A new approval request requires your attention'}`,
                type: notificationType,
                priority: client_2.NotificationPriority.HIGH,
                module: client_2.NotificationModule.APPROVAL,
                userId: dto.assignedTo,
                referenceType: dto.approvalType,
                referenceId: approval.id,
                deepLink: `/approvals/${approval.id}`,
            }, requestedBy, companyId);
        }
        catch (error) {
            this.logger.error(`Failed to send approval notification`, error);
        }
        return this.formatApprovalResponse(approval);
    }
    async getApprovals(userId, companyId, filter) {
        const page = filter.page || 1;
        const limit = filter.limit || 10;
        const skip = (page - 1) * limit;
        const where = {
            companyId,
            assignedTo: userId,
        };
        if (filter.status) {
            where.status = filter.status;
        }
        if (filter.approvalType) {
            where.approvalType = filter.approvalType;
        }
        const sortOrder = filter.sortOrder === 'asc' ? 'asc' : 'desc';
        const [data, total, pendingCount] = await Promise.all([
            this.prisma.approvalRequest.findMany({
                where,
                orderBy: { [filter.sortBy || 'createdAt']: sortOrder },
                skip,
                take: filter.limit,
                include: { comments: true },
            }),
            this.prisma.approvalRequest.count({ where }),
            this.prisma.approvalRequest.count({
                where: { ...where, status: client_1.ApprovalStatus.PENDING },
            }),
        ]);
        return { data, total, pendingCount };
    }
    async getApproval(approvalId) {
        const approval = await this.prisma.approvalRequest.findUnique({
            where: { id: approvalId },
            include: {
                comments: {
                    include: { user: true },
                },
                escalations: true,
            },
        });
        if (!approval) {
            throw new common_1.NotFoundException('Approval request not found');
        }
        return this.formatApprovalResponse(approval);
    }
    async approve(approvalId, approverId, companyId, dto) {
        const approval = await this.getApproval(approvalId);
        if (approval.assignedTo !== approverId) {
            throw new common_1.BadRequestException('Not authorized to approve this request');
        }
        if (approval.status !== client_1.ApprovalStatus.PENDING) {
            throw new common_1.BadRequestException(`Cannot approve: already ${approval.status}`);
        }
        const updated = await this.prisma.$transaction(async (tx) => {
            const result = await tx.approvalRequest.update({
                where: { id: approvalId },
                data: {
                    status: client_1.ApprovalStatus.APPROVED,
                    approvedAt: new Date(),
                },
            });
            await this.audit.log((0, approval_audit_1.buildApproveAudit)({
                companyId,
                userId: approverId,
                approvalId,
                approvalType: approval.approvalType,
                documentNumber: approval.documentNumber,
                comment: dto.comment,
            }), tx);
            return result;
        });
        if (dto.comment) {
            await this.addComment(approvalId, approverId, dto.comment);
        }
        const requester = await this.prisma.user.findUnique({
            where: { id: approval.requestedBy },
        });
        if (requester) {
            try {
                await this.notificationService.create({
                    title: `Approval Approved: ${approval.documentNumber || approval.approvalType}`,
                    message: `Your approval request has been approved`,
                    type: client_2.AlertType.PURCHASE_ORDER_APPROVED,
                    priority: client_2.NotificationPriority.NORMAL,
                    module: client_2.NotificationModule.APPROVAL,
                    userId: approval.requestedBy,
                    referenceType: approval.approvalType,
                    referenceId: approval.id,
                    deepLink: `/approvals/${approval.id}`,
                }, approverId, companyId);
            }
            catch (error) {
                this.logger.error(`Failed to send approval notification`, error);
            }
        }
        return this.formatApprovalResponse(updated);
    }
    async reject(approvalId, approverId, companyId, dto) {
        const approval = await this.getApproval(approvalId);
        if (approval.assignedTo !== approverId) {
            throw new common_1.BadRequestException('Not authorized to reject this request');
        }
        if (approval.status !== client_1.ApprovalStatus.PENDING) {
            throw new common_1.BadRequestException(`Cannot reject: already ${approval.status}`);
        }
        const updated = await this.prisma.$transaction(async (tx) => {
            const result = await tx.approvalRequest.update({
                where: { id: approvalId },
                data: {
                    status: client_1.ApprovalStatus.REJECTED,
                    rejectionReason: dto.rejectionReason,
                    rejectedAt: new Date(),
                },
            });
            await this.audit.log((0, approval_audit_1.buildRejectAudit)({
                companyId,
                userId: approverId,
                approvalId,
                approvalType: approval.approvalType,
                documentNumber: approval.documentNumber,
                reason: dto.rejectionReason,
                comment: dto.comment,
            }), tx);
            return result;
        });
        if (dto.comment) {
            await this.addComment(approvalId, approverId, dto.comment);
        }
        try {
            await this.notificationService.create({
                title: `Approval Rejected: ${approval.documentNumber || approval.approvalType}`,
                message: `Your approval request has been rejected: ${dto.rejectionReason}`,
                type: client_2.AlertType.PURCHASE_ORDER_REJECTED,
                priority: client_2.NotificationPriority.HIGH,
                module: client_2.NotificationModule.APPROVAL,
                userId: approval.requestedBy,
                referenceType: approval.approvalType,
                referenceId: approval.id,
                deepLink: `/approvals/${approval.id}`,
            }, approverId, companyId);
        }
        catch (error) {
            this.logger.error(`Failed to send rejection notification`, error);
        }
        return this.formatApprovalResponse(updated);
    }
    async addComment(approvalId, userId, comment) {
        this.getApproval(approvalId);
        return this.prisma.approvalComment.create({
            data: {
                approvalId,
                userId,
                comment,
            },
        });
    }
    async getComments(approvalId) {
        return this.prisma.approvalComment.findMany({
            where: { approvalId },
            include: { user: { select: { id: true, name: true, email: true } } },
            orderBy: { createdAt: 'asc' },
        });
    }
    async checkEscalation(approvalId) {
        const approval = await this.getApproval(approvalId);
        if (approval.status !== client_1.ApprovalStatus.PENDING) {
            return;
        }
        const now = new Date();
        const requireDate = approval.requiredAt;
        if (requireDate && now > requireDate) {
            await this.escalateApproval(approvalId);
        }
    }
    async escalateApproval(approvalId, escalatedTo, actorId) {
        const approval = await this.getApproval(approvalId);
        const escalationCount = await this.prisma.approvalEscalation.count({
            where: { approvalId },
        });
        if (escalatedTo) {
            const level = escalationCount + 1;
            const reason = 'Approval overdue';
            await this.prisma.$transaction(async (tx) => {
                await tx.approvalEscalation.create({
                    data: {
                        approvalId,
                        escalatedTo,
                        level,
                        reason,
                    },
                });
                await this.audit.log((0, approval_audit_1.buildEscalateAudit)({
                    companyId: approval.companyId,
                    userId: actorId,
                    approvalId,
                    approvalType: approval.approvalType,
                    documentNumber: approval.documentNumber,
                    level,
                    escalatedTo,
                    reason,
                }), tx);
            });
            try {
                await this.prisma.notification.create({
                    data: {
                        userId: escalatedTo,
                        companyId: approval.companyId,
                        title: `Escalated Approval: ${approval.documentNumber || approval.approvalType}`,
                        message: `An approval has been escalated to you due to overdue status`,
                        type: client_2.AlertType.PURCHASE_ORDER_APPROVED,
                        priority: client_2.NotificationPriority.CRITICAL,
                        module: client_2.NotificationModule.APPROVAL,
                        referenceType: approval.approvalType,
                        referenceId: approval.id,
                        deepLink: `/approvals/${approval.id}`,
                    },
                });
            }
            catch (error) {
                this.logger.error(`Failed to send escalation notification`, error);
            }
        }
    }
    async getPendingApprovalsCount(companyId) {
        return this.prisma.approvalRequest.count({
            where: {
                companyId,
                status: client_1.ApprovalStatus.PENDING,
            },
        });
    }
    async getApprovalStats(companyId) {
        const [pending, approved, rejected] = await Promise.all([
            this.prisma.approvalRequest.count({
                where: { companyId, status: client_1.ApprovalStatus.PENDING },
            }),
            this.prisma.approvalRequest.count({
                where: { companyId, status: client_1.ApprovalStatus.APPROVED },
            }),
            this.prisma.approvalRequest.count({
                where: { companyId, status: client_1.ApprovalStatus.REJECTED },
            }),
        ]);
        return { pending, approved, rejected };
    }
    getNotificationTypeForApproval(approvalType) {
        const typeMap = {
            GOODS_RECEIPT: client_2.AlertType.GOODS_RECEIPT_APPROVED,
            PURCHASE_ORDER: client_2.AlertType.PURCHASE_ORDER_APPROVED,
            RFQ: client_2.AlertType.RFQ_APPROVED,
            SALES_QUOTATION: client_2.AlertType.SALES_QUOTATION_APPROVED,
            WAREHOUSE_TRANSFER: client_2.AlertType.WAREHOUSE_TRANSFER_COMPLETED,
            INVENTORY_ADJUSTMENT: client_2.AlertType.INVENTORY_ADJUSTMENT_COMPLETED,
        };
        return typeMap[approvalType] || client_2.AlertType.PURCHASE_ORDER_APPROVED;
    }
};
exports.ApprovalService = ApprovalService;
exports.ApprovalService = ApprovalService = ApprovalService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        services_1.NotificationService,
        audit_service_1.AuditService])
], ApprovalService);
//# sourceMappingURL=approval.service.js.map