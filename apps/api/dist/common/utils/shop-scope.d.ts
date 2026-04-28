import type { RequestUser } from '../types/request-user';
export declare function assertShopScope(user: RequestUser, shopId: string | null | undefined): void;
export declare function defaultShopFilter(user: RequestUser): string | undefined;
