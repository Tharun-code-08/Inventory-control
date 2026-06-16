import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Param,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '@/common/guards/jwt-auth.guard';
import { CurrentUser } from '@/common/decorators/current-user.decorator';
import type { RequestUser } from '@/common/types/request-user';
import { EwayBillsService } from './eway-bills.service';
import {
  CreateEwayBillDto,
  UpdateEwayBillDto,
  GenerateFromInvoiceDto,
  CancelEwayBillDto,
  EwayBillFilterDto,
} from './dto/eway-bill.dto';

@ApiTags('E-Way Bills')
@Controller('eway-bills')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class EwayBillsController {
  constructor(private readonly service: EwayBillsService) {}

  @Get()
  @ApiOperation({ summary: 'List e-way bills for the current shop/company' })
  list(@Query() filter: EwayBillFilterDto, @CurrentUser() user: RequestUser) {
    return this.service.list(user, filter);
  }

  @Get('stats/summary')
  @ApiOperation({ summary: 'E-way bill counts by status' })
  stats(@CurrentUser() user: RequestUser) {
    return this.service.stats(user);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a single e-way bill' })
  get(@Param('id') id: string, @CurrentUser() user: RequestUser) {
    return this.service.get(user, id);
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a draft e-way bill' })
  create(@Body() dto: CreateEwayBillDto, @CurrentUser() user: RequestUser) {
    return this.service.create(user, dto);
  }

  @Post('from-invoice')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a draft e-way bill prefilled from an invoice' })
  createFromInvoice(@Body() dto: GenerateFromInvoiceDto, @CurrentUser() user: RequestUser) {
    return this.service.createFromInvoice(user, dto);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Edit a draft e-way bill' })
  update(
    @Param('id') id: string,
    @Body() dto: UpdateEwayBillDto,
    @CurrentUser() user: RequestUser,
  ) {
    return this.service.update(user, id, dto);
  }

  @Post(':id/generate')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Generate (issue) the e-way bill number' })
  generate(@Param('id') id: string, @CurrentUser() user: RequestUser) {
    return this.service.generate(user, id);
  }

  @Post(':id/cancel')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Cancel an e-way bill' })
  cancel(
    @Param('id') id: string,
    @Body() dto: CancelEwayBillDto,
    @CurrentUser() user: RequestUser,
  ) {
    return this.service.cancel(user, id, dto.reason);
  }
}
