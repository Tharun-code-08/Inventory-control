import { IsNotEmpty, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class UpsertSettingDto {
  @ApiProperty({ description: 'The configuration value for the setting' })
  @IsString()
  @IsNotEmpty()
  value: string;
}
