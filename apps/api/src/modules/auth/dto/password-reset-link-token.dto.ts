import { IsNotEmpty, IsString } from 'class-validator';

export class PasswordResetLinkTokenDto {
  @IsString()
  @IsNotEmpty()
  token!: string;
}
