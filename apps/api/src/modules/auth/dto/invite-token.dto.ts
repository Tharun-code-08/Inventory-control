import { IsNotEmpty, IsString } from 'class-validator';

export class InviteTokenDto {
  @IsString()
  @IsNotEmpty()
  token!: string;
}
