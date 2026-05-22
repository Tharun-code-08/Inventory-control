import type { ConfigService } from '@nestjs/config';

/** Public SPA URL used in supplier-facing emails (portal link). */
export function resolvePublicWebOrigin(config: ConfigService): string {
  const explicit = config.get<string>('PUBLIC_WEB_URL')?.trim();
  if (explicit) return explicit.replace(/\/$/, '');

  const webOrigin = config.get<string>('WEB_ORIGIN')?.trim();
  if (webOrigin) {
    const first = webOrigin.split(',')[0]?.trim();
    if (first) return first.replace(/\/$/, '');
  }

  return 'http://localhost:5173';
}

export function buildSupplierPortalSubmitUrl(config: ConfigService, rfqId: string): string {
  const origin = resolvePublicWebOrigin(config);
  return `${origin}/supplier-portal/submit?rfq=${encodeURIComponent(rfqId)}`;
}

export function buildSupplierDeleteConfirmUrl(config: ConfigService, token: string): string {
  const origin = resolvePublicWebOrigin(config);
  return `${origin}/supplier-delete/confirm?token=${encodeURIComponent(token)}`;
}
