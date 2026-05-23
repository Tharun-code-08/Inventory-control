import { IsEmail, IsOptional, IsString } from 'class-validator';

export class InviteUserDto {
  @IsEmail()
  email!: string;

  @IsOptional()
  @IsString()
  name?: string;

  @IsString()
  roleId!: string;

  @IsOptional()
  @IsString()
  shopId?: string;
}
