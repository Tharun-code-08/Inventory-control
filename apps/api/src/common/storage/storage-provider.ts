export type StorageWriteOptions = {
  contentType?: string;
  cacheControl?: string;
};

export type StorageWriteResult = {
  assetKey: string;
  bytes: number;
};

export type StoragePublicUrlOptions = {
  version?: number;
};

export interface StorageProvider {
  writeBuffer(assetKey: string, buffer: Buffer, options?: StorageWriteOptions): Promise<StorageWriteResult>;
  deleteObject(assetKey: string): Promise<void>;
  getPublicUrl(assetKey: string, options?: StoragePublicUrlOptions): string;
}
