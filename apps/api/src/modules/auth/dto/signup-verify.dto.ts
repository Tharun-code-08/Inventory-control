import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import {
  IsEmail,
  IsOptional,
  IsString,
  Length,
  Matches,
} from 'class-validator';

export class SignupVerifyDto {
  @ApiProperty({ example: 'priya@acmeretail.com' })
  @Transform(({ value }) => (typeof value === 'string' ? value.toLowerCase().trim() : value))
  @IsEmail()
  email!: string;

  @ApiProperty({ example: '482916' })
  @IsString()
  @Length(6, 6)
  @Matches(/^\d{6}$/, { message: 'Enter the 6-digit code from your email' })
  otp!: string;

  @ApiPropertyOptional({ example: '193842', description: 'WhatsApp OTP — required when one was sent to the mobile number' })
  @IsOptional()
  @IsString()
  @Length(6, 6)
  @Matches(/^\d{6}$/, { message: 'Enter the 6-digit code from WhatsApp' })
  phoneOtp?: string;

  @ApiPropertyOptional({ description: 'Verified Razorpay order id when signing up after payment' })
  @IsOptional()
  @IsString()
  paymentOrderId?: string;
}
