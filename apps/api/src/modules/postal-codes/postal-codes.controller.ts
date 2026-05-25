import { Controller, Get, Param } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { Public } from '../../common/decorators/public.decorator';
import { PostalCodesService } from './postal-codes.service';

@ApiTags('postal-codes')
@Controller('postal-codes')
export class PostalCodesController {
  constructor(private readonly postalCodes: PostalCodesService) {}

  @Public()
  @Get(':postalCode')
  @ApiOperation({ summary: 'Lookup city and state for a postal code' })
  lookup(@Param('postalCode') postalCode: string) {
    return this.postalCodes.lookup(postalCode);
  }
}
