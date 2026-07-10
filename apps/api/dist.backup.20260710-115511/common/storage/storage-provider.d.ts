export type StorageWriteOptions = {
    contentType?: string;
    cacheControl?: string;
};
export type StorageWriteResult = {
    assetKey: string;
    bytes: number;
    url?: string;
};
export type StoragePublicUrlOptions = {
    version?: number;
    expiresIn?: number;
};
export interface StorageProvider {
    writeBuffer(assetKey: string, buffer: Buffer, options?: StorageWriteOptions): Promise<StorageWriteResult>;
    readBuffer(assetKey: string): Promise<Buffer>;
    deleteObject(assetKey: string): Promise<void>;
    getPublicUrl(assetKey: string, options?: StoragePublicUrlOptions): string;
    exists(assetKey: string): Promise<boolean>;
    getSignedUrl(assetKey: string, expiresIn?: number): Promise<string>;
}
