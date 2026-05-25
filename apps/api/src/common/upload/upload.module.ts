import { Global, Module } from '@nestjs/common';
import { AvatarStorageService } from './avatar-storage.service';
import { ReturnImageStorageService } from './return-image-storage.service';

@Global()
@Module({
  providers: [AvatarStorageService, ReturnImageStorageService],
  exports: [AvatarStorageService, ReturnImageStorageService],
})
export class UploadModule {}
