import { PartialType } from '@nestjs/swagger';
import { CreateRfqDto } from './create-rfq.dto';

export class UpdateRfqDto extends PartialType(CreateRfqDto) {}

