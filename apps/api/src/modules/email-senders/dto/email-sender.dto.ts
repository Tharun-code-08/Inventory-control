import { Type } from 'class-transformer';
import { IsBoolean, IsEmail, IsInt, IsOptional, IsString, Length, Matches, Max, Min } from 'class-validator';

export class CreateEmailSenderDto {
  @IsString()
  @Length(1, 120)
  displayName!: string;

  @IsEmail()
  email!: string;
}

export class UpdateEmailSenderDto {
  @IsOptional()
  @IsString()
  @Length(1, 120)
  displayName?: string;

  @IsOptional()
  @IsBoolean()
  isPrimary?: boolean;
}

export class ConfigureSenderSmtpDto {
  @IsString()
  @Length(1, 255)
  host!: string;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(65535)
  port!: number;

  @IsBoolean()
  secure!: boolean;

  @IsString()
  @Length(1, 255)
  user!: string;

  @IsString()
  @Length(1, 512)
  password!: string;
}

export class VerifySenderOtpDto {
  @IsString()
  @Matches(/^\d{6}$/)
  otpCode!: string;
}
