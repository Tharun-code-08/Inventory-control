import { PartialType } from '@nestjs/swagger';
import { CreateDamagedStockDto } from './create-damaged-stock.dto';

export class UpdateDamagedStockDto extends PartialType(CreateDamagedStockDto) {}
