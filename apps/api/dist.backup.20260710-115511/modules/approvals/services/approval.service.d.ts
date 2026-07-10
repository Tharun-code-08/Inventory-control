import { PrismaService } from "../../../prisma/prisma.service";
import { CreateApprovalRequestDto, ApproveApprovalDto, RejectApprovalDto, ApprovalFilterDto, ApprovalRequestResponseDto } from '../dto';
import { ApprovalRequest, ApprovalComment } from '@prisma/client';
import { NotificationService } from '../../notifications/services';
import { AuditService } from '../../audit/audit.service';
export declare class ApprovalService {
    private readonly prisma;
    private readonly notificationService;
    private readonly audit;
    private readonly logger;
    constructor(prisma: PrismaService, notificationService: NotificationService, audit: AuditService);
    private formatApprovalResponse;
    createApprovalRequest(dto: CreateApprovalRequestDto, requestedBy: string, companyId: string): Promise<ApprovalRequestResponseDto>;
    getApprovals(userId: string, companyId: string, filter: ApprovalFilterDto): Promise<{
        data: ApprovalRequest[];
        total: number;
        pendingCount: number;
    }>;
    getApproval(approvalId: string): Promise<ApprovalRequestResponseDto>;
    approve(approvalId: string, approverId: string, companyId: string, dto: ApproveApprovalDto): Promise<ApprovalRequestResponseDto>;
    reject(approvalId: string, approverId: string, companyId: string, dto: RejectApprovalDto): Promise<ApprovalRequestResponseDto>;
    addComment(approvalId: string, userId: string, comment: string): Promise<ApprovalComment>;
    getComments(approvalId: string): Promise<ApprovalComment[]>;
    checkEscalation(approvalId: string): Promise<void>;
    escalateApproval(approvalId: string, escalatedTo?: string, actorId?: string): Promise<void>;
    getPendingApprovalsCount(companyId: string): Promise<number>;
    getApprovalStats(companyId: string): Promise<{
        pending: number;
        approved: number;
        rejected: number;
    }>;
    private getNotificationTypeForApproval;
}
