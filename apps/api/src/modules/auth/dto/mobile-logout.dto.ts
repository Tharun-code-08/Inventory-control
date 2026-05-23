import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, MinLength } from 'class-validator';

export class MobileLogoutDto {
  @ApiPropertyOptional({ description: 'Refresh token to revoke (optional if only access JWT is sent)' })
  @IsOptional()
  @IsString()
  @MinLength(10)
  refreshToken?: string;
}
