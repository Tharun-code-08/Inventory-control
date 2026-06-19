import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { LocalStorageProvider } from './local-storage.provider';
import { CloudflareR2Provider } from './cloudflare-r2.provider';
import { S3Provider } from './s3.provider';
import type { StorageProvider } from './storage-provider';

export type StorageType = 'local' | 'r2' | 's3';

@Injectable()
export class StorageProviderFactory {
  constructor(
    private readonly config: ConfigService,
    private readonly localStorage: LocalStorageProvider,
    private readonly r2Storage: CloudflareR2Provider,
    private readonly s3Storage: S3Provider,
  ) {}

  getProvider(): StorageProvider {
    const storageType = this.config.get<StorageType>('STORAGE_TYPE', 'local');

    switch (storageType) {
      case 'r2':
        return this.r2Storage;
      case 's3':
        return this.s3Storage;
      case 'local':
      default:
        return this.localStorage;
    }
  }
}
