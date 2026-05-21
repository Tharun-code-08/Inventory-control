import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsBoolean, IsOptional, IsString } from 'class-validator';
import { CursorPageDto } from '../../../common/dto/cursor-page.dto';

export class ListSuppliersDto extends CursorPageDto {
  @ApiPropertyOptional({ description: 'Substring match on supplierCode or supplierName (case-insensitive).' })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({ default: undefined })
  @IsOptional()
  @Transform(({ value }) => {
    if (typeof value === 'boolean') return value;
    if (value === 'true' || value === '1') return true;
    if (value === 'false' || value === '0') return false;
    return undefined;
  })
  @IsBoolean()
  is_active?: boolean;
}
