import { IsBoolean, IsEmail, IsOptional, IsString, Length, Matches } from 'class-validator';

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

export class VerifySenderOtpDto {
  @IsString()
  @Matches(/^\d{6}$/)
  otpCode!: string;
}
