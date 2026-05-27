import { DocumentSeriesRestart } from '@prisma/client';
import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsBoolean,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  Matches,
  Max,
  Min,
  ValidateNested,
} from 'class-validator';

export class DocumentSeriesRowDto {
  @IsString()
  docType!: string;

  @IsOptional()
  @IsString()
  @Matches(/^[A-Za-z0-9-]+$/, { message: 'prefix must be alphanumeric with optional hyphens' })
  prefix?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(999999999)
  startingNumber?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(12)
  padWidth?: number;

  @IsOptional()
  @IsEnum(DocumentSeriesRestart)
  restartPeriod?: DocumentSeriesRestart;

  @IsOptional()
  @IsBoolean()
  shopScoped?: boolean;

  @IsOptional()
  @IsBoolean()
  enabled?: boolean;

  @IsOptional()
  @IsBoolean()
  useCategoryPrefix?: boolean;
}

export class UpdateDocumentSeriesDto {
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => DocumentSeriesRowDto)
  rows!: DocumentSeriesRowDto[];
}
