import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsOptional, IsEnum, IsUUID, IsDateString, IsNumber } from 'class-validator';
import { ApprovalStatus, ApprovalType } from '@prisma/client';

export class CreateApprovalRequestDto {
  @ApiProperty({
    enum: ApprovalType,
    description: 'Type of approval required',
    example: 'GOODS_RECEIPT',
  })
  @IsEnum(ApprovalType)
  approvalType: ApprovalType;

  @ApiProperty({
    description: 'ID of the entity requiring approval',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  @IsUUID()
  referenceId: string;

  @ApiProperty({
    description: 'User ID of the approver',
    example: '550e8400-e29b-41d4-a716-446655440001',
  })
  @IsUUID()
  assignedTo: string;

  @ApiProperty({
    description: 'Document number (e.g., GR-001, PO-001)',
    example: 'GR-2024-001',
    required: false,
  })
  @IsString()
  @IsOptional()
  documentNumber?: string;

  @ApiProperty({
    description: 'Amount for approval (for high-value transactions)',
    example: 50000.00,
    required: false,
  })
  @IsNumber()
  @IsOptional()
  amount?: number;

  @ApiProperty({
    description: 'Description of approval request',
    example: 'Please approve the goods receipt for order PO-001',
    required: false,
  })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiProperty({
    description: 'When approval is required by',
    example: '2024-06-15T18:00:00Z',
    required: false,
  })
  @IsDateString()
  @IsOptional()
  requiredAt?: string;
}

export class ApprovalRequestResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  companyId: string;

  @ApiProperty()
  requestedBy: string;

  @ApiProperty()
  assignedTo: string;

  @ApiProperty({ enum: ApprovalType })
  approvalType: ApprovalType;

  @ApiProperty()
  referenceId: string;

  @ApiProperty({ enum: ApprovalStatus })
  status: ApprovalStatus;

  @ApiProperty({ required: false, nullable: true })
  documentNumber?: string | null;

  @ApiProperty({ type: 'number', required: false, nullable: true })
  amount?: number | null;

  @ApiProperty({ required: false, nullable: true })
  description?: string | null;

  @ApiProperty({ required: false, nullable: true })
  rejectionReason?: string | null;

  @ApiProperty({ required: false, nullable: true })
  approvedAt?: Date | null;

  @ApiProperty({ required: false, nullable: true })
  rejectedAt?: Date | null;

  @ApiProperty({ required: false, nullable: true })
  requiredAt?: Date | null;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;
}

export class ApproveApprovalDto {
  @ApiProperty({
    description: 'Comment on approval',
    example: 'Looks good. Items match the PO.',
    required: false,
  })
  @IsString()
  @IsOptional()
  comment?: string;
}

export class RejectApprovalDto {
  @ApiProperty({
    description: 'Reason for rejection',
    example: 'Quantity mismatch with original PO',
  })
  @IsString()
  rejectionReason: string;

  @ApiProperty({
    description: 'Additional comment',
    example: 'Please resubmit with corrected quantities',
    required: false,
  })
  @IsString()
  @IsOptional()
  comment?: string;
}

export class AddApprovalCommentDto {
  @ApiProperty({
    description: 'Comment text',
    example: 'Need more information about the supplier',
  })
  @IsString()
  comment: string;
}

export class ApprovalCommentResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  approvalId: string;

  @ApiProperty()
  userId: string;

  @ApiProperty()
  comment: string;

  @ApiProperty()
  createdAt: Date;
}

export class ApprovalListResponseDto {
  @ApiProperty({ type: [ApprovalRequestResponseDto] })
  data: ApprovalRequestResponseDto[];

  @ApiProperty()
  total: number;

  @ApiProperty()
  pendingCount: number;

  @ApiProperty()
  page: number;

  @ApiProperty()
  limit: number;

  @ApiProperty()
  hasMore: boolean;
}

export class ApprovalFilterDto {
  @ApiProperty({
    enum: ApprovalStatus,
    description: 'Filter by approval status',
    required: false,
  })
  @IsEnum(ApprovalStatus)
  @IsOptional()
  status?: ApprovalStatus;

  @ApiProperty({
    enum: ApprovalType,
    description: 'Filter by approval type',
    required: false,
  })
  @IsEnum(ApprovalType)
  @IsOptional()
  approvalType?: ApprovalType;

  @ApiProperty({
    description: 'Pagination: page number',
    required: false,
    default: 1,
  })
  @IsOptional()
  page?: number = 1;

  @ApiProperty({
    description: 'Pagination: items per page',
    required: false,
    default: 20,
  })
  @IsOptional()
  limit?: number = 20;

  @ApiProperty({
    description: 'Sort by field',
    required: false,
    enum: ['createdAt', 'requiredAt', 'amount'],
    default: 'createdAt',
  })
  @IsOptional()
  sortBy?: string = 'createdAt';

  @ApiProperty({
    description: 'Sort order',
    required: false,
    enum: ['asc', 'desc'],
    default: 'desc',
  })
  @IsOptional()
  sortOrder?: 'asc' | 'desc' = 'desc';
}
