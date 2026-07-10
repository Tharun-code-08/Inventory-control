export type BrandingEventName = 'COMPANY_LOGO_UPDATED' | 'COMPANY_ADDRESS_UPDATED' | 'COMPANY_BRANDING_UPDATED' | 'SHOP_BRANDING_UPDATED';
export declare class BrandingEventsService {
    private readonly emitter;
    emit(event: BrandingEventName, payload: Record<string, unknown>): void;
    on(event: BrandingEventName, handler: (payload: Record<string, unknown>) => void): void;
}
