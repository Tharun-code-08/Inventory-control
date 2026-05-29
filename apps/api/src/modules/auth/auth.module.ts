import { Module } from '@nestjs/common';
import { PassportModule } from '@nestjs/passport';
import { BillingModule } from '../billing/billing.module';
import { SubscriptionLifecycleModule } from '../subscription-lifecycle/subscription-lifecycle.module';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { InviteService } from './invite.service';
import { MfaService } from './mfa.service';
import { PasswordResetService } from './password-reset.service';
import { SignupService } from './signup.service';
import { JwtStrategy } from './strategies/jwt.strategy';

@Module({
  imports: [PassportModule, BillingModule, SubscriptionLifecycleModule],
  controllers: [AuthController],
  providers: [AuthService, SignupService, InviteService, MfaService, PasswordResetService, JwtStrategy],
  exports: [AuthService, SignupService, InviteService, MfaService, PasswordResetService],
})
export class AuthModule {}
