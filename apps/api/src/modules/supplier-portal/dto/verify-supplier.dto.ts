import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEmail, IsOptional, IsUUID } from 'class-validator';

export class VerifySupplierDto {
  @ApiProperty()
  @IsEmail()
  email!: string;

  @ApiPropertyOptional({ description: 'Optional RFQ id from portal link' })
  @IsOptional()
  @IsUUID()
  rfqId?: string;
}
