import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class SignupFinalizeDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  token!: string;

  @ApiPropertyOptional({ default: false })
  @IsOptional()
  @IsBoolean()
  skipMfa?: boolean;
}
