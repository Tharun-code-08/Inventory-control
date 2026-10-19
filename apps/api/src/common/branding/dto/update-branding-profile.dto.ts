import { Transform } from 'class-transformer';
import { IsBoolean, IsEmail, IsOptional, IsString, IsHexColor } from 'class-validator';

export class UpdateBrandingProfileDto {
  @IsOptional()
  @IsString()
  companyName?: string;

  @IsOptional()
  @IsString()
  gstNumber?: string;

  @IsOptional()
  @IsString()
  address?: string;

  @IsOptional()
  @IsString()
  footerText?: string;

  // The Settings form posts every field as multipart text, so a blank email
  // arrives as '' and must count as "not provided".
  @Transform(({ value }) => (typeof value === 'string' && value.trim() === '' ? undefined : value))
  @IsOptional()
  @IsEmail()
  email?: string;

  @IsOptional()
  @IsString()
  phone?: string;

  @IsOptional()
  @IsString()
  website?: string;

  @IsOptional()
  @IsHexColor()
  primaryColor?: string;

  @IsOptional()
  @IsHexColor()
  secondaryColor?: string;

  @IsOptional()
  @IsHexColor()
  accentColor?: string;

  // Multipart sends "false" as a string, which implicit conversion turns into
  // true; read the raw body value instead.
  @Transform(({ obj }) => obj.removeLogo === true || obj.removeLogo === 'true')
  @IsOptional()
  @IsBoolean()
  removeLogo?: boolean;
}
