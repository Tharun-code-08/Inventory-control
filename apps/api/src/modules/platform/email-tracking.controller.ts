import { Controller, Get, Param, Query, Res, UseGuards } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import type { Response } from 'express';
import { Public } from '../../common/decorators/public.decorator';
import { PrismaService } from '../../prisma/prisma.service';

@ApiTags('tracking')
@Controller('t/email')
export class EmailTrackingController {
  constructor(private readonly prisma: PrismaService) {}

  @Public()
  @Get(':logId')
  @ApiOperation({ summary: 'Track email link clicks and redirect' })
  async trackClick(
    @Param('logId') logId: string,
    @Query('u') targetUrl: string | undefined,
    @Res() res: Response,
  ) {
    if (logId) {
      await this.prisma.emailDeliveryLog
        .update({
          where: { id: logId },
          data: { clickCount: { increment: 1 } },
        })
        .catch(() => undefined);
    }

    const fallback = 'https://softdigitconsulting.com';
    let redirect = fallback;
    if (targetUrl) {
      try {
        const decoded = decodeURIComponent(targetUrl);
        if (decoded.startsWith('http://') || decoded.startsWith('https://')) {
          redirect = decoded;
        }
      } catch {
        // use fallback
      }
    }

    return res.redirect(302, redirect);
  }
}
