import { Body, Controller, Get, Patch, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { IsIn, IsInt, IsObject, IsOptional, IsString, Min } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { CurrentUser } from '@/common/decorators/current-user.decorator';
import { RequirePermission } from '@/common/decorators/require-permission.decorator';
import type { RequestUser } from '@/common/types/request-user';
import { AiSettingsService } from './ai-settings.service';
import { PlatformHealthService } from '../ai/platform-health.service';

class UpdateAiSettingsDto {
  @ApiPropertyOptional({ example: 'deepseek' })
  @IsOptional()
  @IsString()
  @IsIn(['deepseek'])
  provider?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  intentModel?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  reasoningModel?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  escalationModel?: string;

  @ApiPropertyOptional({ description: 'Feature-flag overrides: { stock, sales, purchase, … }' })
  @IsOptional()
  @IsObject()
  featureFlags?: Record<string, boolean>;

  @ApiPropertyOptional({ description: 'Max AI requests per day (null = unlimited)' })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Type(() => Number)
  dailyRequestLimit?: number | null;

  @ApiPropertyOptional({ description: 'Max AI tokens per month (null = unlimited)' })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Type(() => Number)
  monthlyTokenLimit?: number | null;

  @ApiPropertyOptional({ description: 'Max AI cost per month in cents (null = unlimited)' })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Type(() => Number)
  monthlyCostCentsLimit?: number | null;
}

class UpdateSystemPromptDto {
  @ApiPropertyOptional({ description: 'New system-prompt body; leave blank to reset to the platform default' })
  @IsOptional()
  @IsString()
  body?: string;
}

@ApiTags('agent-platform/settings')
@ApiBearerAuth()
@Controller('agent-platform/settings')
export class AiSettingsController {
  constructor(
    private readonly settings: AiSettingsService,
    private readonly health: PlatformHealthService,
  ) {}

  @RequirePermission('api:manage')
  @Get()
  @ApiOperation({ summary: "Get effective AI settings for the caller's company" })
  async get(@CurrentUser() user: RequestUser) {
    if (!user.companyId) return null;
    return this.settings.forCompany(user.companyId);
  }

  @RequirePermission('api:manage')
  @Patch()
  @ApiOperation({ summary: 'Update provider / model / feature-flag / budget settings' })
  async update(@CurrentUser() user: RequestUser, @Body() dto: UpdateAiSettingsDto) {
    if (!user.companyId) return null;
    await this.settings.updateSettings(user.companyId, dto);
    return this.settings.forCompany(user.companyId);
  }

  @RequirePermission('api:manage')
  @Post('prompt')
  @ApiOperation({ summary: 'Update the system prompt (creates a versioned history entry)' })
  async updatePrompt(@CurrentUser() user: RequestUser, @Body() dto: UpdateSystemPromptDto) {
    if (!user.companyId) return null;
    return this.settings.updateSystemPrompt(user.companyId, dto.body ?? '', user.id);
  }

  @RequirePermission('api:manage')
  @Get('prompt/history')
  @ApiOperation({ summary: 'List all historical system-prompt versions' })
  async promptHistory(@CurrentUser() user: RequestUser) {
    if (!user.companyId) return [];
    return this.settings.promptHistory(user.companyId);
  }

  @RequirePermission('api:manage')
  @Get('health')
  @ApiOperation({ summary: 'Circuit-breaker status for AI/WhatsApp/DB dependencies' })
  circuitHealth() {
    return this.health.status();
  }
}
