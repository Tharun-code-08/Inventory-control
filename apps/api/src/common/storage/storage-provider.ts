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
  expiresIn?: number; // Seconds for signed URLs
};

export interface StorageProvider {
  // Write buffer to storage
  writeBuffer(assetKey: string, buffer: Buffer, options?: StorageWriteOptions): Promise<StorageWriteResult>;

  // Read buffer from storage
  readBuffer(assetKey: string): Promise<Buffer>;

  // Delete object from storage
  deleteObject(assetKey: string): Promise<void>;

  // Get public URL (unsigned, synchronous)
  getPublicUrl(assetKey: string, options?: StoragePublicUrlOptions): string;

  // Check if object exists
  exists(assetKey: string): Promise<boolean>;

  // Get signed URL (with expiration for secure access)
  getSignedUrl(assetKey: string, expiresIn?: number): Promise<string>;
}
