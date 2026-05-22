import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEmail, IsOptional, IsString, IsUUID, MaxLength } from 'class-validator';

export class VerifySupplierDto {
  @ApiProperty()
  @IsEmail()
  email!: string;

  @ApiProperty()
  @IsString()
  @MaxLength(150)
  companyName!: string;

  @ApiPropertyOptional({ description: 'Optional RFQ id from portal link' })
  @IsOptional()
  @IsUUID()
  rfqId?: string;
}
