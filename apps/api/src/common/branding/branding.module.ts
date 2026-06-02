import { Module } from '@nestjs/common';
import { PrismaModule } from '../../prisma/prisma.module';
import { StorageModule } from '../storage/storage.module';
import { BrandingProfileService } from './branding-profile.service';
import { BrandingResolverService } from './branding-resolver.service';
import { BrandingEventsService } from './branding-events.service';
import { MediaAssetStorageService } from './media-asset-storage.service';

@Module({
  imports: [PrismaModule, StorageModule],
  providers: [BrandingProfileService, BrandingResolverService, BrandingEventsService, MediaAssetStorageService],
  exports: [BrandingProfileService, BrandingResolverService, BrandingEventsService],
})
export class BrandingModule {}
