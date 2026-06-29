import {
  Controller,
  Get,
  Param,
  Query,
  UseGuards,
  Header,
  HttpCode,
  HttpStatus,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags, ApiQuery } from '@nestjs/swagger';
import { JwtAuthGuard } from '@/common/guards/jwt-auth.guard';
import { AuditExportRateLimitGuard } from '@/common/guards/audit-export-rate-limit.guard';
import { CurrentUser } from '@/common/decorators/current-user.decorator';
import type { RequestUser } from '@/common/types/request-user';
import { AuditService } from './audit.service';
import {
  AuditFilterDto,
  AuditListQueryDto,
  PaginationDto,
  AuditLogResponseDto,
  AuditListResponseDto,
} from './dto';

@ApiTags('Audit Logs')
@Controller('audit')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class AuditController {
  private readonly logger = new Logger(AuditController.name);

  constructor(
    private readonly auditService: AuditService,
    private readonly exportRateLimitGuard: AuditExportRateLimitGuard,
  ) {}

  /**
   * GET /audit
   * List all audit logs for the current company with optional filtering and pagination
   */
  @Get()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'List audit logs',
    description: 'Get paginated list of audit logs with optional filtering',
  })
  @ApiResponse({ status: 200, type: AuditListResponseDto })
  @ApiQuery({ name: 'page', required: false, type: Number, example: 1 })
  @ApiQuery({ name: 'limit', required: false, type: Number, example: 20 })
  @ApiQuery({ name: 'action', required: false, type: String })
  @ApiQuery({ name: 'entityType', required: false, type: String })
  @ApiQuery({ name: 'entityId', required: false, type: String })
  @ApiQuery({ name: 'userId', required: false, type: String })
  @ApiQuery({ name: 'startDate', required: false, type: String })
  @ApiQuery({ name: 'endDate', required: false, type: String })
  @ApiQuery({ name: 'ipAddress', required: false, type: String })
  @ApiQuery({ name: 'sortBy', required: false, enum: ['createdAt', 'userId', 'action'] })
  @ApiQuery({ name: 'sortOrder', required: false, enum: ['asc', 'desc'] })
  async listAuditLogs(
    @CurrentUser() user: RequestUser,
    @Query() query: AuditListQueryDto,
  ): Promise<AuditListResponseDto> {
    this.logger.debug(`Fetching audit logs for company ${user.companyId}, page ${query.page}`);

    // Convert string dates to Date objects
    const convertedFilters = {
      ...query,
      startDate: query.startDate ? new Date(query.startDate) : undefined,
      endDate: query.endDate ? new Date(query.endDate) : undefined,
    };

    const { data, total } = await this.auditService.findAll(user.companyId!, convertedFilters, {
      page: query.page,
      limit: query.limit,
      sortBy: query.sortBy,
      sortOrder: query.sortOrder,
    });

    const hasMore = query.page * query.limit < total;

    return {
      data: data as AuditLogResponseDto[],
      total,
      page: query.page,
      limit: query.limit,
      hasMore,
    };
  }

  /**
   * GET /audit/:id
   * Get a single audit log by ID
   */
  @Get(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Get audit log by ID',
    description: 'Retrieve a specific audit log entry',
  })
  @ApiResponse({ status: 200, type: AuditLogResponseDto })
  @ApiResponse({ status: 404, description: 'Audit log not found' })
  async getAuditLog(
    @CurrentUser() user: RequestUser,
    @Param('id') auditLogId: string,
  ): Promise<AuditLogResponseDto> {
    this.logger.debug(`Fetching audit log ${auditLogId}`);

    const log = await this.auditService.findById(auditLogId, user.companyId!);

    if (!log) {
      throw new NotFoundException('Audit log not found');
    }

    return log as AuditLogResponseDto;
  }

  /**
   * GET /audit/users/:userId
   * Get all audit logs for a specific user
   */
  @Get('users/:userId')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Get audit logs by user',
    description: 'Retrieve all audit log entries for a specific user',
  })
  @ApiResponse({ status: 200, type: AuditListResponseDto })
  @ApiQuery({ name: 'page', required: false, type: Number, example: 1 })
  @ApiQuery({ name: 'limit', required: false, type: Number, example: 20 })
  @ApiQuery({ name: 'sortBy', required: false, enum: ['createdAt', 'userId', 'action'] })
  @ApiQuery({ name: 'sortOrder', required: false, enum: ['asc', 'desc'] })
  async getAuditLogsByUser(
    @CurrentUser() user: RequestUser,
    @Param('userId') targetUserId: string,
    @Query() pagination: PaginationDto,
  ): Promise<AuditListResponseDto> {
    this.logger.debug(`Fetching audit logs for user ${targetUserId}`);

    const { data, total } = await this.auditService.findByUser(user.companyId!, targetUserId, {
      page: pagination.page,
      limit: pagination.limit,
      sortBy: pagination.sortBy,
      sortOrder: pagination.sortOrder,
    });

    const hasMore = pagination.page * pagination.limit < total;

    return {
      data: data as AuditLogResponseDto[],
      total,
      page: pagination.page,
      limit: pagination.limit,
      hasMore,
    };
  }

  /**
   * GET /audit/entity/:entityType/:entityId
   * Get all audit logs for a specific entity
   */
  @Get('entity/:entityType/:entityId')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Get audit logs by entity',
    description: 'Retrieve all audit log entries for a specific entity (e.g., a product or order)',
  })
  @ApiResponse({ status: 200, type: [AuditLogResponseDto] })
  async getAuditLogsByEntity(
    @CurrentUser() user: RequestUser,
    @Param('entityType') entityType: string,
    @Param('entityId') entityId: string,
  ): Promise<AuditLogResponseDto[]> {
    this.logger.debug(`Fetching audit logs for ${entityType} ${entityId}`);

    const logs = await this.auditService.findByEntity(user.companyId!, entityType, entityId);
    return logs as AuditLogResponseDto[];
  }

  /**
   * GET /audit/export/csv
   * Export audit logs as CSV file
   */
  @UseGuards(AuditExportRateLimitGuard)
  @Get('export/csv')
  @HttpCode(HttpStatus.OK)
  @Header('Content-Type', 'text/csv; charset=utf-8')
  @Header('Content-Disposition', 'attachment; filename="audit-log.csv"')
  @ApiOperation({
    summary: 'Export audit logs as CSV',
    description: 'Download audit logs in CSV format (max 10,000 rows). Limit: 100 exports per hour per user.',
  })
  @ApiResponse({ status: 200, description: 'CSV file exported successfully' })
  @ApiResponse({ status: 429, description: 'Export limit exceeded (100 per hour)' })
  @ApiQuery({ name: 'action', required: false, type: String })
  @ApiQuery({ name: 'entityType', required: false, type: String })
  @ApiQuery({ name: 'entityId', required: false, type: String })
  @ApiQuery({ name: 'userId', required: false, type: String })
  async exportAuditLogsCsv(
    @CurrentUser() user: RequestUser,
    @Query() filters: AuditFilterDto,
  ): Promise<string> {
    this.logger.debug(`Exporting audit logs for company ${user.companyId}`);

    // Convert string dates to Date objects
    const convertedFilters = {
      ...filters,
      startDate: filters.startDate ? new Date(filters.startDate) : undefined,
      endDate: filters.endDate ? new Date(filters.endDate) : undefined,
    };

    const csv = await this.auditService.exportCsv(user.companyId!, convertedFilters);
    return csv;
  }
}
