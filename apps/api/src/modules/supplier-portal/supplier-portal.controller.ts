import { Body, Controller, Get, HttpCode, Post, Query } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { Public } from '../../common/decorators/public.decorator';
import { RequestPortalLinkDto } from './dto/request-portal-link.dto';
import { SubmitPortalQuoteDto } from './dto/submit-portal-quote.dto';
import { SupplierPortalService } from './supplier-portal.service';

@ApiTags('supplier-portal')
@Public()
@Controller('supplier-portal')
export class SupplierPortalController {
  constructor(private readonly portal: SupplierPortalService) {}

  /** Emails the supplier a link; never says whether the address is a supplier. */
  @Post('request-link')
  @HttpCode(200)
  @Throttle({ global: { limit: 5, ttl: 15 * 60_000 } })
  requestLink(@Body() dto: RequestPortalLinkDto) {
    return this.portal.requestLink(dto);
  }

  @Get('session')
  @Throttle({ global: { limit: 60, ttl: 60_000 } })
  session(@Query('token') token: string) {
    return this.portal.getSession(token ?? '');
  }

  @Post('quotes')
  @Throttle({ global: { limit: 10, ttl: 60_000 } })
  submitQuote(@Body() dto: SubmitPortalQuoteDto) {
    return this.portal.submitQuote(dto);
  }
}
