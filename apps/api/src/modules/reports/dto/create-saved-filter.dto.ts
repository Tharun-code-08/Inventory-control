import { ApiProperty } from '@nestjs/swagger';
import { IsObject, IsString } from 'class-validator';

export class CreateSavedFilterDto {
  @ApiProperty()
  @IsString()
  reportType!: string;

  @ApiProperty()
  @IsString()
  name!: string;

  @ApiProperty()
  @IsObject()
  filterJson!: Record<string, unknown>;
}
