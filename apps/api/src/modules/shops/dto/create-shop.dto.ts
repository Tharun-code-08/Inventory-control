import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsBoolean, IsEmail, IsOptional, IsString, IsUUID, Matches, MaxLength, MinLength } from 'class-validator';
import { normalizeSpaces } from '../../../common/utils/normalize';

export class CreateShopDto {
  @ApiProperty({ example: 'SH-003' })
  @Transform(({ value }) => (typeof value === 'string' ? value.trim().toUpperCase() : value))
  @IsString()
  @Matches(/^[A-Z0-9_-]{3,20}$/)
  shopNumber!: string;

  @ApiProperty()
  @Transform(({ value }) => (typeof value === 'string' ? normalizeSpaces(value) : value))
  @IsString()
  @MinLength(2)
  @MaxLength(120)
  shopName!: string;

  @ApiProperty()
  @Transform(({ value }) => (typeof value === 'string' ? normalizeSpaces(value) : value))
  @IsString()
  @MinLength(3)
  address!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @Transform(({ value }) => (typeof value === 'string' ? normalizeSpaces(value) : value))
  @IsString()
  taxId?: string;

  @ApiProperty()
  @Transform(({ value }) => (typeof value === 'string' ? normalizeSpaces(value) : value))
  @IsString()
  contactPerson!: string;

  @ApiProperty({ example: '+94771234567' })
  @Matches(/^\+?[0-9]{7,15}$/)
  mobile!: string;

  @ApiProperty()
  @IsEmail()
  email!: string;

  @ApiPropertyOptional({ description: 'Optional company id (for plant grouping)' })
  @IsOptional()
  @IsUUID()
  companyId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
