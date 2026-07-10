import { ConfigService } from '@nestjs/config';
import { LocalStorageProvider } from './local-storage.provider';
import { CloudflareR2Provider } from './cloudflare-r2.provider';
import { S3Provider } from './s3.provider';
import type { StorageProvider } from './storage-provider';
export type StorageType = 'local' | 'r2' | 's3';
export declare class StorageProviderFactory {
    private readonly config;
    private readonly localStorage;
    private readonly r2Storage;
    private readonly s3Storage;
    constructor(config: ConfigService, localStorage: LocalStorageProvider, r2Storage: CloudflareR2Provider, s3Storage: S3Provider);
    getProvider(): StorageProvider;
}
