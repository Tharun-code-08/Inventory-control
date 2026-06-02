import { Injectable } from '@nestjs/common';
import { EventEmitter } from 'events';

export type BrandingEventName =
  | 'COMPANY_LOGO_UPDATED'
  | 'COMPANY_ADDRESS_UPDATED'
  | 'COMPANY_BRANDING_UPDATED'
  | 'SHOP_BRANDING_UPDATED';

@Injectable()
export class BrandingEventsService {
  private readonly emitter = new EventEmitter();

  emit(event: BrandingEventName, payload: Record<string, unknown>) {
    this.emitter.emit(event, payload);
  }

  on(event: BrandingEventName, handler: (payload: Record<string, unknown>) => void) {
    this.emitter.on(event, handler);
  }
}
