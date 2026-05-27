import { Body, Controller, Delete, Get, Param, Patch, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import type { RequestUser } from '../../common/types/request-user';
import {
  CreateEmailSenderDto,
  UpdateEmailSenderDto,
  VerifySenderOtpDto,
} from './dto/email-sender.dto';
import { EmailSenderService } from './email-sender.service';

@ApiTags('settings')
@ApiBearerAuth()
@Controller('settings/email-notifications/senders')
export class EmailSenderController {
  constructor(private readonly emailSenders: EmailSenderService) {}

  @Get()
  list(@CurrentUser() user: RequestUser) {
    return this.emailSenders.listSenders(user);
  }

  @Post()
  create(@CurrentUser() user: RequestUser, @Body() dto: CreateEmailSenderDto) {
    return this.emailSenders.createSender(user, dto);
  }

  @Patch(':id')
  update(
    @CurrentUser() user: RequestUser,
    @Param('id') id: string,
    @Body() dto: UpdateEmailSenderDto,
  ) {
    return this.emailSenders.updateSender(user, id, dto);
  }

  @Delete(':id')
  remove(@CurrentUser() user: RequestUser, @Param('id') id: string) {
    return this.emailSenders.deleteSender(user, id);
  }

  @Get('domains/:domain/dkim')
  getDkim(@CurrentUser() user: RequestUser, @Param('domain') domain: string) {
    return this.emailSenders.getDomainDkim(user, decodeURIComponent(domain));
  }

  @Post('domains/:domain/validate')
  validateDomain(@CurrentUser() user: RequestUser, @Param('domain') domain: string) {
    return this.emailSenders.validateDomain(user, decodeURIComponent(domain));
  }

  @Post(':id/send-verification')
  sendVerification(@CurrentUser() user: RequestUser, @Param('id') id: string) {
    return this.emailSenders.sendVerificationOtp(user, id);
  }

  @Post(':id/verify-otp')
  verifyOtp(
    @CurrentUser() user: RequestUser,
    @Param('id') id: string,
    @Body() dto: VerifySenderOtpDto,
  ) {
    return this.emailSenders.verifySenderOtp(user, id, dto.otpCode);
  }
}
