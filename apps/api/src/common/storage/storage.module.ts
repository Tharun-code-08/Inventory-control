import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { LocalStorageProvider } from './local-storage.provider';
import { StorageService } from './storage.service';

@Module({
  imports: [ConfigModule],
  providers: [LocalStorageProvider, StorageService],
  exports: [StorageService],
})
export class StorageModule {}
