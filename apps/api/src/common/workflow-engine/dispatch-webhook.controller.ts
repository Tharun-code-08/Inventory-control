import {
  Body,
  Controller,
  Headers,
  Post,
  RawBodyRequest,
  Req,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ApiExcludeController } from '@nestjs/swagger';
import type { Request } from 'express';
import { verifyMetaSignature } from '@/modules/agent-platform/channels/whatsapp/whatsapp-signature.util';
import { DeliveryStatusService } from './dispatch/delivery-status.service';

/**
 * Public provider callback for delivery status (Plan §11 "Status Update").
 * Unauthenticated by JWT (providers can't hold a session) but **HMAC-signed**:
 * the `x-signature-256: sha256=<hex>` header must verify against the raw body
 * with `DISPATCH_WEBHOOK_SECRET`. Reuses the same constant-time verifier as the
 * Meta WhatsApp webhook. Requests without a valid signature are rejected.
 */
@ApiExcludeController()
@Controller('workflow-engine/webhooks')
export class DispatchWebhookController {
  constructor(
    private readonly config: ConfigService,
    private readonly status: DeliveryStatusService,
  ) {}

  @Post('delivery-status')
  async deliveryStatus(
    @Req() req: RawBodyRequest<Request>,
    @Headers('x-signature-256') signature: string | undefined,
    @Body() body: { providerMessageId?: string; status?: string; companyId?: string },
  ) {
    const secret = this.config.get<string>('DISPATCH_WEBHOOK_SECRET') ?? '';
    if (!req.rawBody || !verifyMetaSignature(req.rawBody, signature, secret)) {
      throw new UnauthorizedException('Invalid webhook signature');
    }
    if (!body.providerMessageId || !body.status) return { updated: false };
    const updated = await this.status.apply(body.providerMessageId, body.status, body.companyId);
    return { updated };
  }
}
