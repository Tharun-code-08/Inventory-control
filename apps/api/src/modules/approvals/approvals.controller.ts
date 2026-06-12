import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags, ApiQuery } from '@nestjs/swagger';
import { JwtAuthGuard } from '@/common/guards/jwt-auth.guard';
import { CurrentUser } from '@/common/decorators/current-user.decorator';
import { ApprovalService } from './services';
import {
  CreateApprovalRequestDto,
  ApprovalRequestResponseDto,
  ApproveApprovalDto,
  RejectApprovalDto,
  AddApprovalCommentDto,
  ApprovalCommentResponseDto,
  ApprovalListResponseDto,
  ApprovalFilterDto,
} from './dto';

@ApiTags('Approvals')
@Controller('approvals')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class ApprovalController {
  private readonly logger = new Logger(ApprovalController.name);

  constructor(private readonly approvalService: ApprovalService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create an approval request' })
  @ApiResponse({ status: 201, type: ApprovalRequestResponseDto })
  async createApprovalRequest(
    @Body() dto: CreateApprovalRequestDto,
    @CurrentUser() user: any,
  ): Promise<ApprovalRequestResponseDto> {
    this.logger.debug(`Creating approval request for reference ${dto.referenceId}`);
    return this.approvalService.createApprovalRequest(dto, user.id, user.companyId!);
  }

  @Get()
  @ApiOperation({ summary: 'Get pending approvals for current user' })
  @ApiResponse({ status: 200, type: ApprovalListResponseDto })
  @ApiQuery({ name: 'page', required: false, type: Number, example: 1 })
  @ApiQuery({ name: 'limit', required: false, type: Number, example: 20 })
  @ApiQuery({ name: 'status', required: false, enum: ['PENDING', 'APPROVED', 'REJECTED'] })
  @ApiQuery({ name: 'approvalType', required: false, type: String })
  @ApiQuery({ name: 'sortBy', required: false, enum: ['createdAt', 'requiredAt', 'amount'] })
  @ApiQuery({ name: 'sortOrder', required: false, enum: ['asc', 'desc'] })
  async getApprovals(
    @Query() filter: ApprovalFilterDto,
    @CurrentUser() user: any,
  ): Promise<ApprovalListResponseDto> {
    const { data, total, pendingCount } = await this.approvalService.getApprovals(user.id, user.companyId!, filter);

    const page = filter.page || 1;
    const limit = filter.limit || 20;
    const hasMore = page * limit < total;

    return {
      data: data as ApprovalRequestResponseDto[],
      total,
      pendingCount,
      page,
      limit,
      hasMore,
    };
  }

  @Get('/stats/summary')
  @ApiOperation({ summary: 'Get approval stats for company' })
  @ApiResponse({ status: 200 })
  async getApprovalStats(
    @CurrentUser() user: any,
  ): Promise<{ pending: number; approved: number; rejected: number }> {
    return this.approvalService.getApprovalStats(user.companyId!);
  }

  @Get('/count/pending')
  @ApiOperation({ summary: 'Get pending approval count' })
  @ApiResponse({ status: 200, schema: { properties: { count: { type: 'number' } } } })
  async getPendingCount(
    @CurrentUser() user: any,
  ): Promise<{ count: number }> {
    const count = await this.approvalService.getPendingApprovalsCount(user.companyId!);
    return { count };
  }

  @Get(':approvalId')
  @ApiOperation({ summary: 'Get a single approval request' })
  @ApiResponse({ status: 200, type: ApprovalRequestResponseDto })
  async getApproval(
    @Param('approvalId') approvalId: string,
  ): Promise<ApprovalRequestResponseDto> {
    return this.approvalService.getApproval(approvalId);
  }

  @Post(':approvalId/approve')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Approve an approval request' })
  @ApiResponse({ status: 200, type: ApprovalRequestResponseDto })
  async approveApproval(
    @Param('approvalId') approvalId: string,
    @Body() dto: ApproveApprovalDto,
    @CurrentUser() user: any,
  ): Promise<ApprovalRequestResponseDto> {
    this.logger.debug(`Approving approval request ${approvalId}`);
    return this.approvalService.approve(approvalId, user.id, user.companyId!, dto);
  }

  @Post(':approvalId/reject')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Reject an approval request' })
  @ApiResponse({ status: 200, type: ApprovalRequestResponseDto })
  async rejectApproval(
    @Param('approvalId') approvalId: string,
    @Body() dto: RejectApprovalDto,
    @CurrentUser() user: any,
  ): Promise<ApprovalRequestResponseDto> {
    this.logger.debug(`Rejecting approval request ${approvalId}`);
    return this.approvalService.reject(approvalId, user.id, user.companyId!, dto);
  }

  // ========== COMMENTS ENDPOINTS ==========

  @Get(':approvalId/comments')
  @ApiOperation({ summary: 'Get comments for an approval request' })
  @ApiResponse({ status: 200, type: [ApprovalCommentResponseDto] })
  async getComments(
    @Param('approvalId') approvalId: string,
  ): Promise<ApprovalCommentResponseDto[]> {
    return this.approvalService.getComments(approvalId);
  }

  @Post(':approvalId/comments')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Add a comment to an approval request' })
  @ApiResponse({ status: 201, type: ApprovalCommentResponseDto })
  async addComment(
    @Param('approvalId') approvalId: string,
    @Body() dto: AddApprovalCommentDto,
    @CurrentUser() user: any,
  ): Promise<ApprovalCommentResponseDto> {
    return this.approvalService.addComment(approvalId, user.id, dto.comment);
  }

  // ========== ESCALATION ENDPOINTS ==========

  @Post(':approvalId/escalate')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Escalate an approval request' })
  @ApiResponse({ status: 200 })
  async escalateApproval(
    @Param('approvalId') approvalId: string,
    @Body() body: { escalatedTo: string },
  ): Promise<{ success: boolean }> {
    await this.approvalService.escalateApproval(approvalId, body.escalatedTo);
    return { success: true };
  }

  @Post(':approvalId/check-escalation')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Check if approval needs escalation' })
  @ApiResponse({ status: 200 })
  async checkEscalation(
    @Param('approvalId') approvalId: string,
  ): Promise<{ checked: boolean }> {
    await this.approvalService.checkEscalation(approvalId);
    return { checked: true };
  }
}
