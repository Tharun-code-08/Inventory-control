import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsNumber, IsOptional, IsString, MaxLength, Min } from 'class-validator';

export class RequestQuotationRevisionDto {
  @ApiProperty({ description: 'Customer target total amount for the quotation' })
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  requestedTotal!: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(500)
  note?: string;
}
