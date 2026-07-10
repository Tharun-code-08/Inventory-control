import type { ConfigService } from '@nestjs/config';
export declare function parsePlatformAdminEmails(raw?: string | null): Set<string>;
export declare function parsePlatformAdminEmailsFromConfig(config: ConfigService): Set<string>;
export declare function isPlatformAdminEmail(email: string | null | undefined, allowlist: Set<string>): boolean;
