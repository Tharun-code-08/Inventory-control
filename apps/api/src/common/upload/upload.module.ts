import { Global, Module } from '@nestjs/common';
import { AvatarStorageService } from './avatar-storage.service';

@Global()
@Module({
  providers: [AvatarStorageService],
  exports: [AvatarStorageService],
})
export class UploadModule {}
