import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsEmail, IsOptional, IsString, IsUUID, MinLength } from 'class-validator';

export class CreateUserDto {
  @ApiProperty()
  @IsString()
  @MinLength(2)
  name!: string;

  @ApiProperty()
  @IsEmail()
  email!: string;

  @ApiProperty({ minLength: 10, description: 'At least 10 characters; recommend a passphrase' })
  @IsString()
  @MinLength(10)
  password!: string;

  @ApiProperty()
  @IsString()
  @MinLength(2)
  roleId!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  shopId?: string | null;

  @ApiPropertyOptional({ default: true })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
