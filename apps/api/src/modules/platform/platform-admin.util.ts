import type { ConfigService } from '@nestjs/config';

export function parsePlatformAdminEmails(raw?: string | null): Set<string> {
  const value =
    raw ??
    process.env.PLATFORM_ADMIN_EMAILS ??
    '';
  return new Set(
    value
      .split(',')
      .map((e) => e.trim().toLowerCase())
      .filter(Boolean),
  );
}

export function parsePlatformAdminEmailsFromConfig(config: ConfigService): Set<string> {
  return parsePlatformAdminEmails(config.get<string>('PLATFORM_ADMIN_EMAILS'));
}

export function isPlatformAdminEmail(
  email: string | null | undefined,
  allowlist: Set<string>,
): boolean {
  if (!email?.trim()) return false;
  return allowlist.has(email.trim().toLowerCase());
}
