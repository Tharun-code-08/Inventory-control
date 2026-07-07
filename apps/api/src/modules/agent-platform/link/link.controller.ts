import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import type { Request } from 'express';
import { JwtAuthGuard } from '@/common/guards/jwt-auth.guard';
import { CurrentUser } from '@/common/decorators/current-user.decorator';
import type { RequestUser } from '@/common/types/request-user';
import { RenameDeviceDto } from '../dto/link.dto';
import { LinkService } from './link.service';

@ApiTags('Agent Platform')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('agent-platform/whatsapp/link')
export class LinkController {
  constructor(private readonly links: LinkService) {}

  @Post('generate')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Generate a short-lived WhatsApp link token for the current user' })
  generate(@CurrentUser() user: RequestUser, @Req() req: Request) {
    return this.links.generateLinkToken(user, req.ip, req.headers['user-agent']);
  }

  @Get('devices')
  @ApiOperation({ summary: 'List linked WhatsApp devices for the current user' })
  listDevices(@CurrentUser() user: RequestUser) {
    return this.links.listDevices(user);
  }

  @Patch('devices/:id')
  @ApiOperation({ summary: 'Rename a linked WhatsApp device' })
  renameDevice(
    @CurrentUser() user: RequestUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: RenameDeviceDto,
  ) {
    return this.links.renameDevice(user, id, dto.nickname);
  }

  @Delete('devices/:id')
  @ApiOperation({ summary: 'Revoke a linked WhatsApp device' })
  revokeDevice(@CurrentUser() user: RequestUser, @Param('id', ParseUUIDPipe) id: string) {
    return this.links.revokeDevice(user, id);
  }

  @Get()
  @ApiOperation({ summary: 'Current WhatsApp link status' })
  getStatus(@CurrentUser() user: RequestUser) {
    return this.links.getStatus(user);
  }

  @Delete()
  @ApiOperation({ summary: 'Revoke all WhatsApp links for the current user' })
  unlink(@CurrentUser() user: RequestUser) {
    return this.links.unlink(user);
  }
}
