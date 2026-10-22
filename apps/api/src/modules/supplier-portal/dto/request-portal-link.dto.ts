import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEmail, IsOptional, IsUUID } from 'class-validator';

export class RequestPortalLinkDto {
  @ApiProperty()
  @IsEmail()
  email!: string;

  @ApiPropertyOptional({ description: 'Only send the link for this RFQ' })
  @IsOptional()
  @IsUUID()
  rfqId?: string;
}
