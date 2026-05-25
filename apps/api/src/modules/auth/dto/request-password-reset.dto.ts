import { Transform } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsIn } from 'class-validator';

export class RequestPasswordResetDto {
  @ApiProperty({ example: 'user@example.com' })
  @Transform(({ value }) => (typeof value === 'string' ? value.toLowerCase().trim() : value))
  @IsEmail()
  email!: string;

  @ApiProperty({ enum: ['otp', 'magic_link'] })
  @IsIn(['otp', 'magic_link'])
  method!: 'otp' | 'magic_link';
}
