import { ApiProperty } from '@nestjs/swagger';
import { IsString, MaxLength, MinLength } from 'class-validator';

export class RenameDeviceDto {
  @ApiProperty({
    description: 'Friendly label for a linked WhatsApp device.',
    example: 'Personal Phone',
  })
  @IsString()
  @MinLength(1)
  @MaxLength(50)
  nickname!: string;
}
