import { Body, Controller, Get, Param, Patch, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { RequirePermission } from '../../common/decorators/require-permission.decorator';
import type { RequestUser } from '../../common/types/request-user';
import { CreateContractDto } from './dto/create-contract.dto';
import { UpdateContractDto } from './dto/update-contract.dto';
import { ContractsService } from './contracts.service';

@ApiTags('contracts')
@ApiBearerAuth()
@Controller('contracts')
export class ContractsController {
  constructor(private readonly contracts: ContractsService) {}

  @RequirePermission('contract:read')
  @Get()
  list(@CurrentUser() user: RequestUser) {
    return this.contracts.list(user);
  }

  @RequirePermission('contract:write')
  @Post()
  create(@CurrentUser() user: RequestUser, @Body() dto: CreateContractDto) {
    return this.contracts.create(user, dto);
  }

  @RequirePermission('contract:read')
  @Get(':id')
  get(@CurrentUser() user: RequestUser, @Param('id') id: string) {
    return this.contracts.get(user, id);
  }

  @RequirePermission('contract:write')
  @Patch(':id')
  update(@CurrentUser() user: RequestUser, @Param('id') id: string, @Body() dto: UpdateContractDto) {
    return this.contracts.update(user, id, dto);
  }

  @RequirePermission('contract:write')
  @Post(':id/activate')
  activate(@CurrentUser() user: RequestUser, @Param('id') id: string) {
    return this.contracts.activate(user, id);
  }

  @RequirePermission('contract:write')
  @Post(':id/terminate')
  terminate(@CurrentUser() user: RequestUser, @Param('id') id: string) {
    return this.contracts.terminate(user, id);
  }
}

