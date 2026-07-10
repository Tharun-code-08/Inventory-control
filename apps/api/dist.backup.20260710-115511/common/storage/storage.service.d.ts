import type { StoragePublicUrlOptions, StorageWriteOptions, StorageWriteResult } from './storage-provider';
import { StorageProviderFactory } from './storage-provider.factory';
export declare class StorageService {
    private readonly factory;
    constructor(factory: StorageProviderFactory);
    private provider;
    writeBuffer(assetKey: string, buffer: Buffer, options?: StorageWriteOptions): Promise<StorageWriteResult>;
    readBuffer(assetKey: string): Promise<Buffer>;
    deleteObject(assetKey: string): Promise<void>;
    exists(assetKey: string): Promise<boolean>;
    getPublicUrl(assetKey: string, options?: StoragePublicUrlOptions): string;
    getSignedUrl(assetKey: string, expiresIn?: number): Promise<string>;
}
