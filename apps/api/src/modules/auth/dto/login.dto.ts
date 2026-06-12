import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsEmail, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

export class LoginDto {
  @ApiProperty({ example: 'admin@retailims.com' })
  @IsEmail()
  email!: string;

  @ApiProperty({ example: 'CorrectHorseBatteryStaple1!' })
  @IsString()
  @MinLength(8)
  password!: string;

  @ApiPropertyOptional({
    example: 'ABCSTORE',
    description:
      'Tenant company code. When provided, the user must belong to this company — blocks cross-tenant logins from shared devices.',
  })
  @IsOptional()
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsString()
  @MinLength(2)
  @MaxLength(40)
  companyCode?: string;

  @ApiPropertyOptional({
    example: 'iPhone 13 · Expo Go',
    description: 'Human-readable device label shown in active-session management.',
  })
  @IsOptional()
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsString()
  @MaxLength(80)
  deviceName?: string;
}
