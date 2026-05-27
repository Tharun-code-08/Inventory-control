import { Body, Controller, Delete, Get, Param, Put, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import type { RequestUser } from '../../common/types/request-user';
import { DocumentSeriesService } from './document-series.service';
import { UpdateDocumentSeriesDto } from './dto/update-document-series.dto';

@ApiTags('settings')
@ApiBearerAuth()
@Controller('settings/document-series')
export class DocumentSeriesController {
  constructor(private readonly series: DocumentSeriesService) {}

  @Get()
  list(@CurrentUser() user: RequestUser, @Query('shopId') shopId?: string) {
    return this.series.listEffective(user, shopId?.trim() || null);
  }

  @Put()
  updateCompanyDefaults(@CurrentUser() user: RequestUser, @Body() dto: UpdateDocumentSeriesDto) {
    return this.series.updateCompanyDefaults(user, dto.rows);
  }

  @Put('shops/:shopId')
  updateShopOverrides(
    @CurrentUser() user: RequestUser,
    @Param('shopId') shopId: string,
    @Body() dto: UpdateDocumentSeriesDto,
  ) {
    return this.series.updateShopOverrides(user, shopId, dto.rows);
  }

  @Delete('shops/:shopId/:docType')
  deleteShopOverride(
    @CurrentUser() user: RequestUser,
    @Param('shopId') shopId: string,
    @Param('docType') docType: string,
  ) {
    return this.series.deleteShopOverride(user, shopId, docType.toUpperCase());
  }
}
