import { Body, Controller, Delete, Get, Param, ParseUUIDPipe, Patch, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { RequirePermission } from '../../common/decorators/require-permission.decorator';
import type { RequestUser } from '../../common/types/request-user';
import { CreateSupplierDto } from './dto/create-supplier.dto';
import { ListSuppliersDto } from './dto/list-suppliers.dto';
import { UpdateSupplierDto } from './dto/update-supplier.dto';
import { SuppliersService } from './suppliers.service';

@ApiTags('suppliers')
@ApiBearerAuth()
@Controller('suppliers')
export class SuppliersController {
  constructor(private readonly suppliers: SuppliersService) {}

  @RequirePermission('supplier:read')
  @Get()
  @ApiOperation({ summary: 'List suppliers (paginated)' })
  list(@Query() query: ListSuppliersDto) {
    return this.suppliers.list(query);
  }

  @RequirePermission('supplier:write')
  @Post()
  @ApiOperation({ summary: 'Create a supplier' })
  create(@CurrentUser() user: RequestUser, @Body() dto: CreateSupplierDto) {
    return this.suppliers.create(user, dto);
  }

  @RequirePermission('supplier:read')
  @Get(':id')
  @ApiOperation({ summary: 'Get a supplier by id' })
  get(@Param('id', new ParseUUIDPipe()) id: string) {
    return this.suppliers.get(id);
  }

  @RequirePermission('supplier:write')
  @Patch(':id')
  @ApiOperation({ summary: 'Update a supplier' })
  update(
    @CurrentUser() user: RequestUser,
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() dto: UpdateSupplierDto,
  ) {
    return this.suppliers.update(user, id, dto);
  }

  @RequirePermission('supplier:write')
  @Delete(':id')
  @ApiOperation({ summary: 'Soft-disable a supplier' })
  remove(@CurrentUser() user: RequestUser, @Param('id', new ParseUUIDPipe()) id: string) {
    return this.suppliers.remove(user, id);
  }
}

