import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Min,
  ValidateNested,
} from 'class-validator';

export class PortalQuoteLineDto {
  @ApiProperty()
  @IsUUID()
  rfqItemId!: string;

  @ApiProperty()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  unitPrice!: number;
}

export class SubmitPortalQuoteDto {
  @ApiProperty()
  @IsUUID()
  rfqId!: string;

  @ApiProperty()
  @IsUUID()
  supplierId!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  leadTimeDays?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  notes?: string;

  @ApiProperty({ type: [PortalQuoteLineDto] })
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => PortalQuoteLineDto)
  items!: PortalQuoteLineDto[];
}
