import { ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { IsDateString, IsOptional } from 'class-validator';
import { CreatePurchaseOrderDto } from './create-purchase-order.dto';

export class UpdatePurchaseOrderDto extends PartialType(CreatePurchaseOrderDto) {
  @ApiPropertyOptional({
    description: 'Optimistic lock token. Update succeeds only if record was not modified after this timestamp.',
  })
  @IsOptional()
  @IsDateString()
  ifUnmodifiedSince?: string;
}
