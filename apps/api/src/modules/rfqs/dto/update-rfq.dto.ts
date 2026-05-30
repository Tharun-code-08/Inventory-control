import { ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { IsDateString, IsOptional } from 'class-validator';
import { CreateRfqDto } from './create-rfq.dto';

export class UpdateRfqDto extends PartialType(CreateRfqDto) {
  @ApiPropertyOptional({
    description: 'Optimistic lock token. Update succeeds only if record was not modified after this timestamp.',
  })
  @IsOptional()
  @IsDateString()
  ifUnmodifiedSince?: string;
}

