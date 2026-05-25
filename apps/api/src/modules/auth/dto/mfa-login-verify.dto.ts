import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsNotEmpty, IsOptional, IsString, Matches } from 'class-validator';

export class MfaLoginVerifyDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  challengeToken!: string;

  @ApiPropertyOptional({ example: '123456' })
  @IsOptional()
  @IsString()
  @Matches(/^\d{6}$/, { message: 'Authenticator code must be 6 digits.' })
  code?: string;

  @ApiPropertyOptional({ example: 'ABCD-EFGH' })
  @IsOptional()
  @IsString()
  backupCode?: string;

  @ApiPropertyOptional({ default: false })
  @IsOptional()
  @IsBoolean()
  rememberDevice?: boolean;
}
