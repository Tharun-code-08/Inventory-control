import { Module } from '@nestjs/common';
import { PrismaModule } from '../../prisma/prisma.module';
import { StorageModule } from '../storage/storage.module';
import { BrandingProfileService } from './branding-profile.service';
import { BrandingResolverService } from './branding-resolver.service';
import { BrandingEventsService } from './branding-events.service';
import { MediaAssetStorageService } from './media-asset-storage.service';
import { BrandingService } from './branding.service';
import { DocumentBrandingService } from './document-branding.service';

@Module({
  imports: [PrismaModule, StorageModule],
  providers: [
    BrandingProfileService,
    BrandingResolverService,
    BrandingEventsService,
    MediaAssetStorageService,
    BrandingService,
    DocumentBrandingService,
  ],
  exports: [
    BrandingProfileService,
    BrandingResolverService,
    BrandingEventsService,
    BrandingService,
    DocumentBrandingService,
  ],
})
export class BrandingModule {}
