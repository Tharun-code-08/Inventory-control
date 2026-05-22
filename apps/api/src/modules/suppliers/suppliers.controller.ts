import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Public } from '../../common/decorators/public.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { RequirePermission } from '../../common/decorators/require-permission.decorator';
import type { RequestUser } from '../../common/types/request-user';
import { CreateSupplierDto } from './dto/create-supplier.dto';
import { ListSuppliersDto } from './dto/list-suppliers.dto';
import { UpdateSupplierDto } from './dto/update-supplier.dto';
import { SuppliersService } from './suppliers.service';

@ApiTags('suppliers')
@Controller('suppliers')
export class SuppliersController {
  constructor(private readonly suppliers: SuppliersService) {}

  @Public()
  @Get('confirm-deletion')
  @ApiOperation({ summary: 'Confirm supplier deletion from admin email link' })
  confirmDeletion(@Query('token') token: string) {
    return this.suppliers.confirmDeletion(token ?? '');
  }

  @ApiBearerAuth()
  @RequirePermission('supplier:read')
  @Get()
  @ApiOperation({ summary: 'List suppliers (paginated)' })
  list(@Query() query: ListSuppliersDto) {
    return this.suppliers.list(query);
  }

  @ApiBearerAuth()
  @RequirePermission('supplier:write')
  @Post()
  @ApiOperation({ summary: 'Create a supplier' })
  create(@CurrentUser() user: RequestUser, @Body() dto: CreateSupplierDto) {
    return this.suppliers.create(user, dto);
  }

  @ApiBearerAuth()
  @RequirePermission('supplier:read')
  @Get(':id/deletion-impact')
  @ApiOperation({ summary: 'Impact summary before deleting a supplier' })
  deletionImpact(@Param('id', new ParseUUIDPipe()) id: string) {
    return this.suppliers.getDeletionImpact(id);
  }

  @ApiBearerAuth()
  @RequirePermission('supplier:read')
  @Get(':id')
  @ApiOperation({ summary: 'Get a supplier by id' })
  get(@Param('id', new ParseUUIDPipe()) id: string) {
    return this.suppliers.get(id);
  }

  @ApiBearerAuth()
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

  @ApiBearerAuth()
  @RequirePermission('supplier:write')
  @Post(':id/request-deletion')
  @ApiOperation({ summary: 'Email admin to confirm supplier deletion' })
  requestDeletion(@CurrentUser() user: RequestUser, @Param('id', new ParseUUIDPipe()) id: string) {
    return this.suppliers.requestDeletion(user, id);
  }

  @ApiBearerAuth()
  @RequirePermission('supplier:write')
  @Delete(':id')
  @ApiOperation({ summary: 'Request supplier deletion (sends admin confirmation email)' })
  remove(@CurrentUser() user: RequestUser, @Param('id', new ParseUUIDPipe()) id: string) {
    return this.suppliers.requestDeletion(user, id);
  }
}
