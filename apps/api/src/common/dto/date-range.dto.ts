import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsDateString, IsOptional } from 'class-validator';

/**
 * Standard date-window query params used by reports and date-filterable lists.
 * Both fields are inclusive ISO date strings (YYYY-MM-DD or full ISO timestamps).
 */
export class DateRangeQueryDto {
  @ApiPropertyOptional({ description: 'Inclusive start of the date window (ISO 8601).' })
  @IsOptional()
  @IsDateString()
  date_from?: string;

  @ApiPropertyOptional({ description: 'Inclusive end of the date window (ISO 8601).' })
  @IsOptional()
  @IsDateString()
  date_to?: string;
}
