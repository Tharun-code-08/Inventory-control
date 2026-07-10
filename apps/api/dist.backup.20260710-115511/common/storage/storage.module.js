"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.StorageModule = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const local_storage_provider_1 = require("./local-storage.provider");
const cloudflare_r2_provider_1 = require("./cloudflare-r2.provider");
const s3_provider_1 = require("./s3.provider");
const storage_provider_factory_1 = require("./storage-provider.factory");
const storage_service_1 = require("./storage.service");
let StorageModule = class StorageModule {
};
exports.StorageModule = StorageModule;
exports.StorageModule = StorageModule = __decorate([
    (0, common_1.Module)({
        imports: [config_1.ConfigModule],
        providers: [
            local_storage_provider_1.LocalStorageProvider,
            {
                provide: cloudflare_r2_provider_1.CloudflareR2Provider,
                useClass: cloudflare_r2_provider_1.CloudflareR2Provider,
            },
            {
                provide: s3_provider_1.S3Provider,
                useClass: s3_provider_1.S3Provider,
            },
            storage_provider_factory_1.StorageProviderFactory,
            storage_service_1.StorageService,
        ],
        exports: [storage_service_1.StorageService, storage_provider_factory_1.StorageProviderFactory],
    })
], StorageModule);
//# sourceMappingURL=storage.module.js.map