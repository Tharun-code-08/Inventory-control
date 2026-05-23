import { Controller } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';

@ApiTags('inventory-lots')
@ApiBearerAuth()
@Controller('inventory-lots')
export class InventoryLotsController {}
