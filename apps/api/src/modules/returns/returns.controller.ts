import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { RequirePermission } from '../../common/decorators/require-permission.decorator';
import type { RequestUser } from '../../common/types/request-user';
import { CreateCustomerReturnDto } from './dto/create-customer-return.dto';
import { CreateSupplierReturnDto } from './dto/create-supplier-return.dto';
import { ReturnsService } from './returns.service';

@ApiTags('Returns')
@ApiBearerAuth()
@Controller('returns')
export class ReturnsController {
  constructor(private readonly service: ReturnsService) {}

  @Get('customer')
  @RequirePermission('shop:read')
  @ApiOperation({ summary: 'List customer returns' })
  listCustomer(@CurrentUser() user: RequestUser) {
    return this.service.listCustomerReturns(user);
  }

  @Post('customer')
  @RequirePermission('shop:write')
  @ApiOperation({ summary: 'Create a customer return (DRAFT)' })
  createCustomer(
    @CurrentUser() user: RequestUser,
    @Body() dto: CreateCustomerReturnDto,
  ) {
    return this.service.createCustomerReturn(user, dto);
  }

  @Post('customer/:id/post')
  @RequirePermission('shop:write')
  @ApiOperation({ summary: 'Post a customer return: stock back-in + credit note' })
  postCustomer(
    @CurrentUser() user: RequestUser,
    @Param('id', new ParseUUIDPipe()) id: string,
  ) {
    return this.service.postCustomerReturn(user, id);
  }

  @Get('supplier')
  @RequirePermission('shop:read')
  @ApiOperation({ summary: 'List supplier returns' })
  listSupplier(@CurrentUser() user: RequestUser) {
    return this.service.listSupplierReturns(user);
  }

  @Post('supplier')
  @RequirePermission('shop:write')
  @ApiOperation({ summary: 'Create a supplier return (DRAFT)' })
  createSupplier(
    @CurrentUser() user: RequestUser,
    @Body() dto: CreateSupplierReturnDto,
  ) {
    return this.service.createSupplierReturn(user, dto);
  }

  @Post('supplier/:id/post')
  @RequirePermission('shop:write')
  @ApiOperation({ summary: 'Post a supplier return: stock-out + supplier debit' })
  postSupplier(
    @CurrentUser() user: RequestUser,
    @Param('id', new ParseUUIDPipe()) id: string,
  ) {
    return this.service.postSupplierReturn(user, id);
  }
}
