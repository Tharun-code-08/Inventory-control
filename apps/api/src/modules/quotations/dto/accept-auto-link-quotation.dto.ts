import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { ArrayMinSize, IsArray, IsOptional, IsUUID, Min, ValidateNested } from 'class-validator';

export class AcceptAutoLinkQuotationItemDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  quotationItemId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  rfqItemId?: string;

  @ApiPropertyOptional({ description: 'Quantity to include on the generated PO' })
  @Type(() => Number)
  @Min(0.0001)
  orderQty!: number;
}

export class AcceptAutoLinkQuotationDto {
  @ApiPropertyOptional({ type: [AcceptAutoLinkQuotationItemDto] })
  @IsOptional()
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => AcceptAutoLinkQuotationItemDto)
  items?: AcceptAutoLinkQuotationItemDto[];
}
