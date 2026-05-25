import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsUUID } from 'class-validator';

export class UploadSupplierReturnImageDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  returnItemId?: string;
}
