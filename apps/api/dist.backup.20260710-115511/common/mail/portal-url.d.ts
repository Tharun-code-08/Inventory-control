import type { ConfigService } from '@nestjs/config';
export declare function resolvePublicWebOrigin(config: ConfigService): string;
export declare function buildSupplierPortalSubmitUrl(config: ConfigService, rfqId: string): string;
export declare function buildSupplierDeleteConfirmUrl(config: ConfigService, token: string): string;
export declare function buildSupplierReturnAckUrl(config: ConfigService, token: string): string;
export declare function buildQuotationPortalReviewUrl(config: ConfigService, portalToken: string): string;
export declare function buildUserInviteAcceptUrl(config: ConfigService, token: string): string;
export declare function buildPasswordResetUrl(config: ConfigService, token: string): string;
