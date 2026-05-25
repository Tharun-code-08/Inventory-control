import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class SignupFinalizeDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  token!: string;
}
