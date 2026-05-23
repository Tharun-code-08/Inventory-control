import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Public } from '../../common/decorators/public.decorator';
import { RequestQuotationRevisionDto } from './dto/request-quotation-revision.dto';
import { QuotationPortalService } from './quotation-portal.service';

@ApiTags('quotation-portal')
@Public()
@Controller('quotation-portal')
export class QuotationPortalController {
  constructor(private readonly portal: QuotationPortalService) {}

  @Get('quotes/:token')
  getQuote(@Param('token') token: string) {
    return this.portal.getByToken(token);
  }

  @Post('quotes/:token/accept')
  accept(@Param('token') token: string) {
    return this.portal.accept(token);
  }

  @Post('quotes/:token/request-revision')
  requestRevision(@Param('token') token: string, @Body() dto: RequestQuotationRevisionDto) {
    return this.portal.requestRevision(token, dto);
  }
}
