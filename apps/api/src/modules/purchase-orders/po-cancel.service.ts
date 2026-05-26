import {
  BadRequestException,
  Injectable,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
import { PurchaseOrderStatus, Prisma } from '@prisma/client';
import { createHash, randomInt } from 'crypto';
import { MailService } from '../../common/mail/mail.service';
import { PrismaService } from '../../prisma/prisma.service';
import type { RequestUser } from '../../common/types/request-user';
import { PurchaseOrdersService } from './purchase-orders.service';

const OTP_TTL_MINUTES = 10;
const OTP_MAX_ATTEMPTS = 5;

@Injectable()
export class PoCancelService {
  private readonly logger = new Logger(PoCancelService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly mail: MailService,
    private readonly purchaseOrders: PurchaseOrdersService,
  ) {}

  private hashOtp(otp: string) {
    return createHash('sha256').update(otp).digest('hex');
  }

  private generateOtp() {
    return String(randomInt(100_000, 1_000_000));
  }

  async requestCancel(user: RequestUser, poId: string, reason: string) {
    const trimmedReason = reason?.trim();
    if (!trimmedReason) throw new BadRequestException('Cancellation reason is required');

    const po = await this.purchaseOrders.get(user, poId);
    if (po.status === PurchaseOrderStatus.CANCELLED) {
      throw new BadRequestException('Purchase order is already cancelled');
    }
    if (po.status !== PurchaseOrderStatus.DRAFT && po.status !== PurchaseOrderStatus.CONFIRMED) {
      throw new BadRequestException('Only DRAFT or CONFIRMED purchase orders can be cancelled');
    }

    const postedReceiptQty = (po.receiptProgress ?? []).some((line) => Number(line.receivedQty) > 0);
    if (postedReceiptQty) {
      throw new BadRequestException('Cannot cancel a purchase order with posted goods receipts');
    }

    const account = await this.prisma.user.findUnique({
      where: { id: user.id },
      select: { email: true, name: true },
    });
    if (!account?.email) {
      throw new BadRequestException('Your account has no email address for OTP delivery');
    }

    const otp = this.generateOtp();
    const expiresAt = new Date(Date.now() + OTP_TTL_MINUTES * 60_000);

    await this.prisma.poCancelVerification.create({
      data: {
        poId,
        userId: user.id,
        reason: trimmedReason,
        otpHash: this.hashOtp(otp),
        expiresAt,
      },
    });

    try {
      const bodyText = [
        `Hello${account.name ? ` ${account.name}` : ''},`,
        '',
        `Use this code to cancel purchase order ${po.poNumber}:`,
        '',
        otp,
        '',
        `Reason: ${trimmedReason}`,
        '',
        `This code expires in ${OTP_TTL_MINUTES} minutes.`,
      ].join('\n');
      await this.mail.sendMail({
        to: account.email,
        subject: `PO cancellation code — ${po.poNumber}`,
        text: bodyText,
        html: `<pre style="font-family: sans-serif; white-space: pre-wrap;">${bodyText}</pre>`,
      });
    } catch (err) {
      this.logger.warn(`Failed to send PO cancel OTP: ${String(err)}`);
      throw new BadRequestException('Could not send cancellation code email. Try again.');
    }

    return { ok: true, message: 'A cancellation code was sent to your email.' };
  }

  async confirmCancel(user: RequestUser, poId: string, reason: string, otp: string) {
    const trimmedReason = reason?.trim();
    const trimmedOtp = otp?.trim();
    if (!trimmedReason || !trimmedOtp) {
      throw new BadRequestException('Reason and OTP are required');
    }

    const verification = await this.prisma.poCancelVerification.findFirst({
      where: {
        poId,
        userId: user.id,
        consumedAt: null,
        expiresAt: { gt: new Date() },
      },
      orderBy: { createdAt: 'desc' },
    });
    if (!verification) {
      throw new UnauthorizedException('No active cancellation code. Request a new one.');
    }
    if (verification.reason !== trimmedReason) {
      throw new BadRequestException('Reason does not match the cancellation request');
    }
    if (verification.attemptCount >= OTP_MAX_ATTEMPTS) {
      throw new UnauthorizedException('Too many invalid attempts. Request a new code.');
    }

    if (verification.otpHash !== this.hashOtp(trimmedOtp)) {
      await this.prisma.poCancelVerification.update({
        where: { id: verification.id },
        data: { attemptCount: { increment: 1 } },
      });
      throw new UnauthorizedException('Invalid cancellation code');
    }

    await this.prisma.poCancelVerification.update({
      where: { id: verification.id },
      data: { consumedAt: new Date() },
    });

    return this.purchaseOrders.cancel(user, poId);
  }
}
