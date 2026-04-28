import { Body, Controller, Delete, Get, Header, Param, Patch, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { DocumentStatus } from '@prisma/client';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { SkipEnvelope } from '../../common/decorators/skip-envelope.decorator';
import { RequirePermission } from '../../common/decorators/require-permission.decorator';
import type { RequestUser } from '../../common/types/request-user';
import { CreateGoodsIssueDto } from './dto/create-goods-issue.dto';
import { UpdateGoodsIssueDto } from './dto/update-goods-issue.dto';
import { GoodsIssuesService } from './goods-issues.service';

@ApiTags('goods-issues')
@ApiBearerAuth()
@Controller('goods-issues')
export class GoodsIssuesController {
  constructor(private readonly service: GoodsIssuesService) {}

  @RequirePermission('goods_issue:read')
  @Get()
  list(
    @CurrentUser() user: RequestUser,
    @Query('shop_id') shopId?: string,
    @Query('date_from') dateFrom?: string,
    @Query('date_to') dateTo?: string,
    @Query('status') status?: DocumentStatus,
    @Query('cursor') cursor?: string,
    @Query('take') take?: string,
  ) {
    return this.service.list(user, {
      shop_id: shopId,
      date_from: dateFrom,
      date_to: dateTo,
      status,
      cursor,
      take: take ? Number(take) : undefined,
    });
  }

  @RequirePermission('goods_issue:create')
  @Post()
  create(@CurrentUser() user: RequestUser, @Body() dto: CreateGoodsIssueDto) {
    return this.service.create(user, dto);
  }

  @SkipEnvelope()
  @RequirePermission('goods_issue:read')
  @Get(':id/print')
  @Header('Content-Type', 'text/html; charset=utf-8')
  print(@CurrentUser() user: RequestUser, @Param('id') id: string) {
    return this.service.print(user, id);
  }

  @RequirePermission('goods_issue:read')
  @Get(':id')
  get(@CurrentUser() user: RequestUser, @Param('id') id: string) {
    return this.service.get(user, id);
  }

  @RequirePermission('goods_issue:create')
  @Patch(':id')
  update(@CurrentUser() user: RequestUser, @Param('id') id: string, @Body() dto: UpdateGoodsIssueDto) {
    return this.service.update(user, id, dto);
  }

  @RequirePermission('goods_issue:create')
  @Post(':id/post')
  post(@CurrentUser() user: RequestUser, @Param('id') id: string) {
    return this.service.post(user, id);
  }

  @RequirePermission('goods_issue:create')
  @Delete(':id')
  remove(@CurrentUser() user: RequestUser, @Param('id') id: string) {
    return this.service.remove(user, id);
  }
}
