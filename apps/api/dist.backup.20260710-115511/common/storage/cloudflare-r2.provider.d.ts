import { ConfigService } from '@nestjs/config';
import type { StorageProvider, StoragePublicUrlOptions, StorageWriteResult, StorageWriteOptions } from './storage-provider';
export declare class CloudflareR2Provider implements StorageProvider {
    private readonly config;
    private readonly logger;
    private s3Client?;
    private readonly bucket;
    private readonly accountId?;
    constructor(config: ConfigService);
    private getClient;
    writeBuffer(assetKey: string, buffer: Buffer, options?: StorageWriteOptions): Promise<StorageWriteResult>;
    readBuffer(assetKey: string): Promise<Buffer>;
    deleteObject(assetKey: string): Promise<void>;
    exists(assetKey: string): Promise<boolean>;
    getPublicUrl(assetKey: string, options?: StoragePublicUrlOptions): string;
    getSignedUrl(assetKey: string, expiresIn?: number): Promise<string>;
}
