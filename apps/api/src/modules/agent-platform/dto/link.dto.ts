import { ApiProperty } from '@nestjs/swagger';
import { IsString, Matches } from 'class-validator';

export class RequestLinkDto {
  @ApiProperty({
    description: 'WhatsApp number in international format (8-15 digits, optional leading +).',
    example: '+919876543210',
  })
  @IsString()
  @Matches(/^\+?[0-9]{8,15}$/, {
    message: 'phoneNumber must be 8-15 digits in international format (optional leading +)',
  })
  phoneNumber!: string;
}
