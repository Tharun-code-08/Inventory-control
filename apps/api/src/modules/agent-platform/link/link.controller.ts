import { Body, Controller, Delete, Get, HttpCode, HttpStatus, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '@/common/guards/jwt-auth.guard';
import { CurrentUser } from '@/common/decorators/current-user.decorator';
import type { RequestUser } from '@/common/types/request-user';
import { RequestLinkDto } from '../dto/link.dto';
import { LinkService } from './link.service';

@ApiTags('Agent Platform')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('agent-platform/whatsapp/link')
export class LinkController {
  constructor(private readonly links: LinkService) {}

  @Post('request')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Issue a WhatsApp linking code for the current user' })
  requestLink(@CurrentUser() user: RequestUser, @Body() dto: RequestLinkDto) {
    return this.links.requestLink(user, dto.phoneNumber);
  }

  @Get()
  @ApiOperation({ summary: 'Current WhatsApp link status' })
  getStatus(@CurrentUser() user: RequestUser) {
    return this.links.getStatus(user);
  }

  @Delete()
  @ApiOperation({ summary: 'Revoke the current WhatsApp link' })
  unlink(@CurrentUser() user: RequestUser) {
    return this.links.unlink(user);
  }
}
