import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsString, MinLength } from 'class-validator';

export class LoginDto {
  @ApiProperty({ example: 'admin@retailims.com' })
  @IsEmail()
  email!: string;

  @ApiProperty({ example: 'CorrectHorseBatteryStaple1!' })
  @IsString()
  @MinLength(8)
  password!: string;
}
