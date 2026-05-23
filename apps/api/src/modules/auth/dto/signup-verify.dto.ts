import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsEmail, IsString, Length, Matches } from 'class-validator';

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
}
