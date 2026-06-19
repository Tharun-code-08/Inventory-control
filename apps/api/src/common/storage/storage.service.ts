import { Injectable } from '@nestjs/common';
import type { StoragePublicUrlOptions, StorageProvider, StorageWriteOptions, StorageWriteResult } from './storage-provider';
import { StorageProviderFactory } from './storage-provider.factory';

@Injectable()
export class StorageService {
  constructor(private readonly factory: StorageProviderFactory) {}

  private provider(): StorageProvider {
    return this.factory.getProvider();
  }

  async writeBuffer(assetKey: string, buffer: Buffer, options?: StorageWriteOptions): Promise<StorageWriteResult> {
    return this.provider().writeBuffer(assetKey, buffer, options);
  }

  async readBuffer(assetKey: string): Promise<Buffer> {
    return this.provider().readBuffer(assetKey);
  }

  async deleteObject(assetKey: string): Promise<void> {
    return this.provider().deleteObject(assetKey);
  }

  async exists(assetKey: string): Promise<boolean> {
    return this.provider().exists(assetKey);
  }

  getPublicUrl(assetKey: string, options?: StoragePublicUrlOptions): string {
    return this.provider().getPublicUrl(assetKey, options);
  }

  async getSignedUrl(assetKey: string, expiresIn?: number): Promise<string> {
    return this.provider().getSignedUrl(assetKey, expiresIn);
  }
}
