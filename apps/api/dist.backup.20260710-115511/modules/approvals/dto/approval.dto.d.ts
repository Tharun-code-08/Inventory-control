import { ApprovalStatus, ApprovalType } from '@prisma/client';
export declare class CreateApprovalRequestDto {
    approvalType: ApprovalType;
    referenceId: string;
    assignedTo: string;
    documentNumber?: string;
    amount?: number;
    description?: string;
    requiredAt?: string;
}
export declare class ApprovalRequestResponseDto {
    id: string;
    companyId: string;
    requestedBy: string;
    assignedTo: string;
    approvalType: ApprovalType;
    referenceId: string;
    status: ApprovalStatus;
    documentNumber?: string | null;
    amount?: number | null;
    description?: string | null;
    rejectionReason?: string | null;
    approvedAt?: Date | null;
    rejectedAt?: Date | null;
    requiredAt?: Date | null;
    createdAt: Date;
    updatedAt: Date;
}
export declare class ApproveApprovalDto {
    comment?: string;
}
export declare class RejectApprovalDto {
    rejectionReason: string;
    comment?: string;
}
export declare class AddApprovalCommentDto {
    comment: string;
}
export declare class ApprovalCommentResponseDto {
    id: string;
    approvalId: string;
    userId: string;
    comment: string;
    createdAt: Date;
}
export declare class ApprovalListResponseDto {
    data: ApprovalRequestResponseDto[];
    total: number;
    pendingCount: number;
    page: number;
    limit: number;
    hasMore: boolean;
}
export declare class ApprovalFilterDto {
    status?: ApprovalStatus;
    approvalType?: ApprovalType;
    page?: number;
    limit?: number;
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
}
