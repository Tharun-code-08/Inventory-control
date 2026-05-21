import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, IsOptional, IsString, Max, Min } from 'class-validator';

/**
 * Common cursor-pagination query params. Reuse on any list endpoint that uses
 * the `clampTake`/`buildMeta` helpers in `common/utils/pagination.ts`.
 */
export class CursorPageDto {
  @ApiPropertyOptional({ description: 'Opaque cursor returned in `meta.nextCursor` on the previous page.' })
  @IsOptional()
  @IsString()
  cursor?: string;

  @ApiPropertyOptional({ minimum: 1, maximum: 100, default: 20 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  take?: number;
}
