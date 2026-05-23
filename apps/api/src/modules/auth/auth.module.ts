import { Module } from '@nestjs/common';
import { PassportModule } from '@nestjs/passport';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { InviteService } from './invite.service';
import { SignupService } from './signup.service';
import { JwtStrategy } from './strategies/jwt.strategy';

@Module({
  imports: [PassportModule],
  controllers: [AuthController],
  providers: [AuthService, SignupService, InviteService, JwtStrategy],
  exports: [AuthService, SignupService, InviteService],
})
export class AuthModule {}
