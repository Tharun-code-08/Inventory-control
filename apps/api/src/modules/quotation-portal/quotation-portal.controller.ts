import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { Public } from '../../common/decorators/public.decorator';
import { RequestQuotationRevisionDto } from './dto/request-quotation-revision.dto';
import { QuotationPortalService } from './quotation-portal.service';

@ApiTags('quotation-portal')
@Public()
@Controller('quotation-portal')
export class QuotationPortalController {
  constructor(private readonly portal: QuotationPortalService) {}

  @Get('quotes/:token')
  @Throttle({ global: { limit: 60, ttl: 60_000 } })
  getQuote(@Param('token') token: string) {
    return this.portal.getByToken(token);
  }

  @Post('quotes/:token/accept')
  @Throttle({ global: { limit: 10, ttl: 60_000 } })
  accept(@Param('token') token: string) {
    return this.portal.accept(token);
  }

  @Post('quotes/:token/request-revision')
  @Throttle({ global: { limit: 10, ttl: 60_000 } })
  requestRevision(@Param('token') token: string, @Body() dto: RequestQuotationRevisionDto) {
    return this.portal.requestRevision(token, dto);
  }
}
