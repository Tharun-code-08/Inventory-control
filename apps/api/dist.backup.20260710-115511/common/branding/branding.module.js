"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.BrandingModule = void 0;
const common_1 = require("@nestjs/common");
const prisma_module_1 = require("../../prisma/prisma.module");
const storage_module_1 = require("../storage/storage.module");
const cache_module_1 = require("../cache/cache.module");
const branding_profile_service_1 = require("./branding-profile.service");
const branding_resolver_service_1 = require("./branding-resolver.service");
const branding_events_service_1 = require("./branding-events.service");
const media_asset_storage_service_1 = require("./media-asset-storage.service");
const branding_service_1 = require("./branding.service");
const document_branding_service_1 = require("./document-branding.service");
let BrandingModule = class BrandingModule {
};
exports.BrandingModule = BrandingModule;
exports.BrandingModule = BrandingModule = __decorate([
    (0, common_1.Module)({
        imports: [prisma_module_1.PrismaModule, storage_module_1.StorageModule, cache_module_1.CacheModule],
        providers: [
            branding_profile_service_1.BrandingProfileService,
            branding_resolver_service_1.BrandingResolverService,
            branding_events_service_1.BrandingEventsService,
            media_asset_storage_service_1.MediaAssetStorageService,
            branding_service_1.BrandingService,
            document_branding_service_1.DocumentBrandingService,
        ],
        exports: [
            branding_profile_service_1.BrandingProfileService,
            branding_resolver_service_1.BrandingResolverService,
            branding_events_service_1.BrandingEventsService,
            branding_service_1.BrandingService,
            document_branding_service_1.DocumentBrandingService,
        ],
    })
], BrandingModule);
//# sourceMappingURL=branding.module.js.map