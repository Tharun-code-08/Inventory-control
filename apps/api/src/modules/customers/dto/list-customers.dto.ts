import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';
import { CursorPageDto } from '../../../common/dto/cursor-page.dto';

export class ListCustomersDto extends CursorPageDto {
  @ApiPropertyOptional({ description: 'Substring match on customerCode or customerName (case-insensitive).' })
  @IsOptional()
  @IsString()
  search?: string;
}
