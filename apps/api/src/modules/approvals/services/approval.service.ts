import { Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';
import {
  CreateApprovalRequestDto,
  ApproveApprovalDto,
  RejectApprovalDto,
  AddApprovalCommentDto,
  ApprovalFilterDto,
  ApprovalRequestResponseDto,
} from '../dto';
import { ApprovalRequest, ApprovalStatus, ApprovalComment } from '@prisma/client';
import { NotificationService } from '../../notifications/services';
import { AlertType, NotificationPriority, NotificationModule } from '@prisma/client';

@Injectable()
export class ApprovalService {
  private readonly logger = new Logger(ApprovalService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly notificationService: NotificationService,
  ) {}

  /**
   * Convert Decimal to number for API responses
   */
  private formatApprovalResponse(approval: any): any {
    return {
      ...approval,
      amount: approval.amount ? Number(approval.amount) : null,
    } as ApprovalRequestResponseDto;
  }

  /**
   * Create an approval request
   */
  async createApprovalRequest(
    dto: CreateApprovalRequestDto,
    requestedBy: string,
    companyId: string,
  ): Promise<ApprovalRequestResponseDto> {
    // Validate assignee exists
    const assignee = await this.prisma.user.findUnique({
      where: { id: dto.assignedTo },
    });

    if (!assignee) {
      throw new NotFoundException('Approver user not found');
    }

    // Create approval request
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
        status: ApprovalStatus.PENDING,
      },
    });

    // Send notification to approver
    const notificationType = this.getNotificationTypeForApproval(dto.approvalType);
    try {
      await this.notificationService.create(
        {
          title: `Approval Required: ${approval.documentNumber || dto.approvalType}`,
          message: `${dto.description || 'A new approval request requires your attention'}`,
          type: notificationType,
          priority: NotificationPriority.HIGH,
          module: NotificationModule.APPROVAL,
          userId: dto.assignedTo,
          referenceType: dto.approvalType,
          referenceId: approval.id,
          deepLink: `/approvals/${approval.id}`,
        },
        requestedBy,
        companyId,
      );
    } catch (error) {
      this.logger.error(`Failed to send approval notification`, error);
    }

    return this.formatApprovalResponse(approval);
  }

  /**
   * Get pending approvals for a user
   */
  async getApprovals(
    userId: string,
    companyId: string,
    filter: ApprovalFilterDto,
  ): Promise<{ data: ApprovalRequest[]; total: number; pendingCount: number }> {
    const page = filter.page || 1;
    const limit = filter.limit || 10;
    const skip = (page - 1) * limit;

    const where: any = {
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
        where: { ...where, status: ApprovalStatus.PENDING },
      }),
    ]);

    return { data, total, pendingCount };
  }

  /**
   * Get a single approval request
   */
  async getApproval(approvalId: string): Promise<ApprovalRequestResponseDto> {
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
      throw new NotFoundException('Approval request not found');
    }

    return this.formatApprovalResponse(approval);
  }

  /**
   * Approve an approval request
   */
  async approve(
    approvalId: string,
    approverId: string,
    companyId: string,
    dto: ApproveApprovalDto,
  ): Promise<ApprovalRequestResponseDto> {
    const approval = await this.getApproval(approvalId);

    if (approval.assignedTo !== approverId) {
      throw new BadRequestException('Not authorized to approve this request');
    }

    if (approval.status !== ApprovalStatus.PENDING) {
      throw new BadRequestException(`Cannot approve: already ${approval.status}`);
    }

    // Update approval status
    const updated = await this.prisma.approvalRequest.update({
      where: { id: approvalId },
      data: {
        status: ApprovalStatus.APPROVED,
        approvedAt: new Date(),
      },
    });

    // Add comment if provided
    if (dto.comment) {
      await this.addComment(approvalId, approverId, dto.comment);
    }

    // Send notification to requester
    const requester = await this.prisma.user.findUnique({
      where: { id: approval.requestedBy },
    });

    if (requester) {
      try {
        await this.notificationService.create(
          {
            title: `Approval Approved: ${approval.documentNumber || approval.approvalType}`,
            message: `Your approval request has been approved`,
            type: AlertType.PURCHASE_ORDER_APPROVED,
            priority: NotificationPriority.NORMAL,
            module: NotificationModule.APPROVAL,
            userId: approval.requestedBy,
            referenceType: approval.approvalType,
            referenceId: approval.id,
            deepLink: `/approvals/${approval.id}`,
          },
          approverId,
          companyId,
        );
      } catch (error) {
        this.logger.error(`Failed to send approval notification`, error);
      }
    }

    return this.formatApprovalResponse(updated);
  }

  /**
   * Reject an approval request
   */
  async reject(
    approvalId: string,
    approverId: string,
    companyId: string,
    dto: RejectApprovalDto,
  ): Promise<ApprovalRequestResponseDto> {
    const approval = await this.getApproval(approvalId);

    if (approval.assignedTo !== approverId) {
      throw new BadRequestException('Not authorized to reject this request');
    }

    if (approval.status !== ApprovalStatus.PENDING) {
      throw new BadRequestException(`Cannot reject: already ${approval.status}`);
    }

    // Update approval status
    const updated = await this.prisma.approvalRequest.update({
      where: { id: approvalId },
      data: {
        status: ApprovalStatus.REJECTED,
        rejectionReason: dto.rejectionReason,
        rejectedAt: new Date(),
      },
    });

    // Add comment if provided
    if (dto.comment) {
      await this.addComment(approvalId, approverId, dto.comment);
    }

    // Send notification to requester
    try {
      await this.notificationService.create(
        {
          title: `Approval Rejected: ${approval.documentNumber || approval.approvalType}`,
          message: `Your approval request has been rejected: ${dto.rejectionReason}`,
          type: AlertType.PURCHASE_ORDER_REJECTED,
          priority: NotificationPriority.HIGH,
          module: NotificationModule.APPROVAL,
          userId: approval.requestedBy,
          referenceType: approval.approvalType,
          referenceId: approval.id,
          deepLink: `/approvals/${approval.id}`,
        },
        approverId,
        companyId,
      );
    } catch (error) {
      this.logger.error(`Failed to send rejection notification`, error);
    }

    return this.formatApprovalResponse(updated);
  }

  /**
   * Add comment to approval
   */
  async addComment(approvalId: string, userId: string, comment: string): Promise<ApprovalComment> {
    const approval = await this.getApproval(approvalId);

    return this.prisma.approvalComment.create({
      data: {
        approvalId,
        userId,
        comment,
      },
    });
  }

  /**
   * Get comments for an approval
   */
  async getComments(approvalId: string): Promise<ApprovalComment[]> {
    return this.prisma.approvalComment.findMany({
      where: { approvalId },
      include: { user: { select: { id: true, name: true, email: true } } },
      orderBy: { createdAt: 'asc' },
    });
  }

  /**
   * Check if approval requires escalation
   */
  async checkEscalation(approvalId: string): Promise<void> {
    const approval = await this.getApproval(approvalId);

    if (approval.status !== ApprovalStatus.PENDING) {
      return;
    }

    // Check if approval is overdue
    const now = new Date();
    const requireDate = approval.requiredAt;

    if (requireDate && now > requireDate) {
      // Escalate to higher authority
      await this.escalateApproval(approvalId);
    }
  }

  /**
   * Escalate approval to a higher authority
   */
  async escalateApproval(
    approvalId: string,
    escalatedTo?: string,
  ): Promise<void> {
    const approval = await this.getApproval(approvalId);

    // Count existing escalations for this approval
    const escalationCount = await this.prisma.approvalEscalation.count({
      where: { approvalId },
    });

    // Get escalation targets from configuration
    // For now, we'll just record the escalation
    if (escalatedTo) {
      await this.prisma.approvalEscalation.create({
        data: {
          approvalId,
          escalatedTo,
          level: escalationCount + 1,
          reason: 'Approval overdue',
        },
      });

      // Send notification to escalated user
      try {
        await this.prisma.notification.create({
          data: {
            userId: escalatedTo,
            companyId: approval.companyId,
            title: `Escalated Approval: ${approval.documentNumber || approval.approvalType}`,
            message: `An approval has been escalated to you due to overdue status`,
            type: AlertType.PURCHASE_ORDER_APPROVED,
            priority: NotificationPriority.CRITICAL,
            module: NotificationModule.APPROVAL,
            referenceType: approval.approvalType,
            referenceId: approval.id,
            deepLink: `/approvals/${approval.id}`,
          },
        });
      } catch (error) {
        this.logger.error(`Failed to send escalation notification`, error);
      }
    }
  }

  /**
   * Get pending approvals for reporting/dashboard
   */
  async getPendingApprovalsCount(companyId: string): Promise<number> {
    return this.prisma.approvalRequest.count({
      where: {
        companyId,
        status: ApprovalStatus.PENDING,
      },
    });
  }

  /**
   * Get approval stats for a company
   */
  async getApprovalStats(
    companyId: string,
  ): Promise<{ pending: number; approved: number; rejected: number }> {
    const [pending, approved, rejected] = await Promise.all([
      this.prisma.approvalRequest.count({
        where: { companyId, status: ApprovalStatus.PENDING },
      }),
      this.prisma.approvalRequest.count({
        where: { companyId, status: ApprovalStatus.APPROVED },
      }),
      this.prisma.approvalRequest.count({
        where: { companyId, status: ApprovalStatus.REJECTED },
      }),
    ]);

    return { pending, approved, rejected };
  }

  /**
   * Helper to determine notification type based on approval type
   */
  private getNotificationTypeForApproval(approvalType: string): AlertType {
    const typeMap: Record<string, AlertType> = {
      GOODS_RECEIPT: AlertType.GOODS_RECEIPT_APPROVED,
      PURCHASE_ORDER: AlertType.PURCHASE_ORDER_APPROVED,
      RFQ: AlertType.RFQ_APPROVED,
      SALES_QUOTATION: AlertType.SALES_QUOTATION_APPROVED,
      WAREHOUSE_TRANSFER: AlertType.WAREHOUSE_TRANSFER_COMPLETED,
      INVENTORY_ADJUSTMENT: AlertType.INVENTORY_ADJUSTMENT_COMPLETED,
    };

    return typeMap[approvalType] || AlertType.PURCHASE_ORDER_APPROVED;
  }
}
