import { ConfigService } from '@nestjs/config';
import type { StorageProvider, StoragePublicUrlOptions, StorageWriteResult, StorageWriteOptions } from './storage-provider';
export declare class LocalStorageProvider implements StorageProvider {
    private readonly config;
    constructor(config: ConfigService);
    private baseDir;
    private getStoragePath;
    private getBaseUrl;
    writeBuffer(assetKey: string, buffer: Buffer, _options?: StorageWriteOptions): Promise<StorageWriteResult>;
    readBuffer(assetKey: string): Promise<Buffer>;
    deleteObject(assetKey: string): Promise<void>;
    exists(assetKey: string): Promise<boolean>;
    getPublicUrl(assetKey: string, options?: StoragePublicUrlOptions): string;
    getSignedUrl(assetKey: string, _expiresIn?: number): Promise<string>;
}
