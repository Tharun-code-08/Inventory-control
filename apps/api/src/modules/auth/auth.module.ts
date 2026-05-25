import { Module } from '@nestjs/common';
import { PassportModule } from '@nestjs/passport';
import { BillingModule } from '../billing/billing.module';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { InviteService } from './invite.service';
import { PasswordResetService } from './password-reset.service';
import { SignupService } from './signup.service';
import { JwtStrategy } from './strategies/jwt.strategy';

@Module({
  imports: [PassportModule, BillingModule],
  controllers: [AuthController],
  providers: [AuthService, SignupService, InviteService, PasswordResetService, JwtStrategy],
  exports: [AuthService, SignupService, InviteService, PasswordResetService],
})
export class AuthModule {}
