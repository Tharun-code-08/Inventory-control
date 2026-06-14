import { IsOptional, IsEnum, IsUUID, IsISO8601, IsString, IsInt, Min, Max } from 'class-validator';
import { AuditAction } from '@prisma/client';
import { Type } from 'class-transformer';
import { IntersectionType } from '@nestjs/swagger';

export class AuditFilterDto {
  @IsOptional()
  @IsEnum(AuditAction)
  action?: AuditAction;

  @IsOptional()
  @IsString()
  entityType?: string;

  @IsOptional()
  @IsUUID()
  entityId?: string;

  @IsOptional()
  @IsUUID()
  userId?: string;

  @IsOptional()
  @IsISO8601()
  startDate?: string;

  @IsOptional()
  @IsISO8601()
  endDate?: string;

  @IsOptional()
  @IsString()
  ipAddress?: string;

  @IsOptional()
  @IsString()
  searchQuery?: string;
}

export class PaginationDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page: number = 1;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit: number = 20;

  @IsOptional()
  @IsEnum(['createdAt', 'userId', 'action'])
  sortBy: 'createdAt' | 'userId' | 'action' = 'createdAt';

  @IsOptional()
  @IsEnum(['asc', 'desc'])
  sortOrder: 'asc' | 'desc' = 'desc';
}

/**
 * Combined filter + pagination query. A single DTO is required because the
 * global ValidationPipe runs with `forbidNonWhitelisted`, which would reject
 * pagination params when validating against the filter DTO alone (and vice
 * versa) if two separate `@Query()` bindings were used.
 */
export class AuditQueryDto extends IntersectionType(AuditFilterDto, PaginationDto) {}

export class AuditLogResponseDto {
  id: string;
  companyId: string;
  userId: string;
  action: AuditAction;
  entityType?: string;
  entityId?: string;
  oldValues?: Record<string, any>;
  newValues?: Record<string, any>;
  ipAddress?: string;
  userAgent?: string;
  deviceId?: string;
  metadata?: Record<string, any>;
  reason?: string;
  severity?: string;
  requestId?: string;
  createdAt: Date;
  user: {
    id: string;
    email: string;
    name?: string;
  };
}

export class AuditListResponseDto {
  data: AuditLogResponseDto[];
  total: number;
  page: number;
  limit: number;
  hasMore: boolean;
}
