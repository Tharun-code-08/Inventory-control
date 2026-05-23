import { IsOptional, IsString, MinLength } from 'class-validator';

export class InviteAcceptDto {
  @IsString()
  token!: string;

  @IsString()
  @MinLength(8)
  password!: string;

  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  turnstileToken?: string;
}
