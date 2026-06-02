import { IsBoolean, IsEmail, IsOptional, IsString } from 'class-validator';

export class UpdateBrandingProfileDto {
  @IsOptional()
  @IsString()
  footerText?: string;

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
  @IsBoolean()
  removeLogo?: boolean;
}
