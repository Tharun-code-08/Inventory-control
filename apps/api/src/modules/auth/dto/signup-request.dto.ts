import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import {
  IsEmail,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  MinLength,
} from 'class-validator';

export class SignupRequestDto {
  @ApiProperty({ example: 'Acme Retail Pvt Ltd' })
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsString()
  @MinLength(2)
  @MaxLength(120)
  companyName!: string;

  @ApiPropertyOptional({ example: '12 Industrial Estate, Mumbai' })
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsOptional()
  @IsString()
  @MaxLength(240)
  companyAddress?: string;

  @ApiProperty({ example: 'Head Office' })
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsString()
  @MinLength(2)
  @MaxLength(120)
  plantName!: string;

  @ApiProperty({ example: '12 Industrial Estate, Mumbai' })
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsString()
  @MinLength(5)
  @MaxLength(240)
  plantAddress!: string;

  @ApiProperty({ example: 'Priya Sharma' })
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsString()
  @MinLength(2)
  @MaxLength(80)
  contactPerson!: string;

  @ApiProperty({ example: '+919876543210' })
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsString()
  @MinLength(8)
  @MaxLength(20)
  @Matches(/^[+0-9][0-9\s-]{7,18}$/, {
    message: 'Enter a valid mobile number with country code',
  })
  mobile!: string;

  @ApiProperty({ example: 'Priya Sharma' })
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsString()
  @MinLength(2)
  @MaxLength(80)
  adminName!: string;

  @ApiProperty({ example: 'priya@acmeretail.com' })
  @Transform(({ value }) => (typeof value === 'string' ? value.toLowerCase().trim() : value))
  @IsEmail()
  email!: string;

  @ApiProperty({ example: 'SecurePass123!' })
  @IsString()
  @MinLength(8)
  @MaxLength(72)
  @Matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/, {
    message: 'Password must include upper, lower, and a number',
  })
  password!: string;

  @ApiProperty({ example: 'SecurePass123!' })
  @IsString()
  @MinLength(8)
  confirmPassword!: string;

  @ApiPropertyOptional({ description: 'Verified Razorpay order id when signing up after payment' })
  @IsOptional()
  @IsString()
  paymentOrderId?: string;
}
