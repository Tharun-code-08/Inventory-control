import { Body, Controller, Get, Param, Post, Query } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Public } from '../../common/decorators/public.decorator';
import { SubmitPortalQuoteDto } from './dto/submit-portal-quote.dto';
import { VerifySupplierDto } from './dto/verify-supplier.dto';
import { SupplierPortalService } from './supplier-portal.service';

@ApiTags('supplier-portal')
@Public()
@Controller('supplier-portal')
export class SupplierPortalController {
  constructor(private readonly portal: SupplierPortalService) {}

  @Post('verify')
  verify(@Body() dto: VerifySupplierDto) {
    return this.portal.verify(dto);
  }

  @Get('rfqs/:id')
  getRfq(@Param('id') id: string, @Query('supplier_id') supplierId: string) {
    return this.portal.getRfqForSupplier(id, supplierId);
  }

  @Post('quotes')
  submitQuote(@Body() dto: SubmitPortalQuoteDto) {
    return this.portal.submitQuote(dto);
  }
}
