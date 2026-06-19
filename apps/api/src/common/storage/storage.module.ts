import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { LocalStorageProvider } from './local-storage.provider';
import { CloudflareR2Provider } from './cloudflare-r2.provider';
import { S3Provider } from './s3.provider';
import { StorageProviderFactory } from './storage-provider.factory';
import { StorageService } from './storage.service';

@Module({
  imports: [ConfigModule],
  providers: [
    LocalStorageProvider,
    {
      provide: CloudflareR2Provider,
      useClass: CloudflareR2Provider,
    },
    {
      provide: S3Provider,
      useClass: S3Provider,
    },
    StorageProviderFactory,
    StorageService,
  ],
  exports: [StorageService, StorageProviderFactory],
})
export class StorageModule {}
