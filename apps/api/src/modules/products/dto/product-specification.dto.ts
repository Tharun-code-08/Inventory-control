import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsString, MaxLength, MinLength } from 'class-validator';
import { normalizeSpaces } from '../../../common/utils/normalize';

/**
 * A free-form product specification entry, e.g. {label: "Material", value: "Stainless Steel"}.
 * Order is preserved in the UI via the array index; the API maps that to
 * `sortOrder` on persistence.
 */
export class ProductSpecificationDto {
  @ApiProperty()
  @Transform(({ value }) => (typeof value === 'string' ? normalizeSpaces(value) : value))
  @IsString()
  @MinLength(1)
  @MaxLength(80)
  label!: string;

  @ApiProperty()
  @Transform(({ value }) => (typeof value === 'string' ? normalizeSpaces(value) : value))
  @IsString()
  @MinLength(1)
  @MaxLength(255)
  value!: string;
}
