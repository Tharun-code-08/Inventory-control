import { ApiProperty } from '@nestjs/swagger';
import { IsString, MinLength } from 'class-validator';

export class MobileRefreshDto {
  @ApiProperty({ description: 'JWT refresh token from mobile login' })
  @IsString()
  @MinLength(10)
  refreshToken!: string;
}
