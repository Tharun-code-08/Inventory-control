import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class MfaChallengeTokenDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  token!: string;
}
