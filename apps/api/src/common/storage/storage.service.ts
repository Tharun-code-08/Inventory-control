import { Injectable } from '@nestjs/common';
import type { StoragePublicUrlOptions, StorageProvider, StorageWriteOptions, StorageWriteResult } from './storage-provider';
import { LocalStorageProvider } from './local-storage.provider';

@Injectable()
export class StorageService {
  constructor(private readonly local: LocalStorageProvider) {}

  private provider(): StorageProvider {
    // Placeholder for future S3/R2/Azure/GCS selection.
    return this.local;
  }

  writeBuffer(assetKey: string, buffer: Buffer, options?: StorageWriteOptions): Promise<StorageWriteResult> {
    return this.provider().writeBuffer(assetKey, buffer, options);
  }

  deleteObject(assetKey: string): Promise<void> {
    return this.provider().deleteObject(assetKey);
  }

  getPublicUrl(assetKey: string, options?: StoragePublicUrlOptions): string {
    return this.provider().getPublicUrl(assetKey, options);
  }
}
