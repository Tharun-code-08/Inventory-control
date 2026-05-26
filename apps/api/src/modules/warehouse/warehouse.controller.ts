import { Controller, Get, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { RequirePermission } from '../../common/decorators/require-permission.decorator';
import type { RequestUser } from '../../common/types/request-user';
import { WarehouseService } from './warehouse.service';

@ApiTags('warehouse')
@ApiBearerAuth()
@Controller('warehouse')
export class WarehouseController {
  constructor(private readonly warehouse: WarehouseService) {}

  @RequirePermission('report:view')
  @Get('inventory')
  inventory(@CurrentUser() user: RequestUser, @Query('shop_id') shopId?: string) {
    return this.warehouse.inventory(user, { shop_id: shopId });
  }
}
