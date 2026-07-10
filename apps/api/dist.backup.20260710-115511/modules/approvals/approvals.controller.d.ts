import { ApprovalService } from './services';
import { CreateApprovalRequestDto, ApprovalRequestResponseDto, ApproveApprovalDto, RejectApprovalDto, AddApprovalCommentDto, ApprovalCommentResponseDto, ApprovalListResponseDto, ApprovalFilterDto } from './dto';
export declare class ApprovalController {
    private readonly approvalService;
    private readonly logger;
    constructor(approvalService: ApprovalService);
    createApprovalRequest(dto: CreateApprovalRequestDto, user: any): Promise<ApprovalRequestResponseDto>;
    getApprovals(filter: ApprovalFilterDto, user: any): Promise<ApprovalListResponseDto>;
    getApprovalStats(user: any): Promise<{
        pending: number;
        approved: number;
        rejected: number;
    }>;
    getPendingCount(user: any): Promise<{
        count: number;
    }>;
    getApproval(approvalId: string): Promise<ApprovalRequestResponseDto>;
    approveApproval(approvalId: string, dto: ApproveApprovalDto, user: any): Promise<ApprovalRequestResponseDto>;
    rejectApproval(approvalId: string, dto: RejectApprovalDto, user: any): Promise<ApprovalRequestResponseDto>;
    getComments(approvalId: string): Promise<ApprovalCommentResponseDto[]>;
    addComment(approvalId: string, dto: AddApprovalCommentDto, user: any): Promise<ApprovalCommentResponseDto>;
    escalateApproval(approvalId: string, body: {
        escalatedTo: string;
    }, user: any): Promise<{
        success: boolean;
    }>;
    checkEscalation(approvalId: string): Promise<{
        checked: boolean;
    }>;
}
