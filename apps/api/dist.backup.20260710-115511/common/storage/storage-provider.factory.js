"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.StorageProviderFactory = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const local_storage_provider_1 = require("./local-storage.provider");
const cloudflare_r2_provider_1 = require("./cloudflare-r2.provider");
const s3_provider_1 = require("./s3.provider");
let StorageProviderFactory = class StorageProviderFactory {
    config;
    localStorage;
    r2Storage;
    s3Storage;
    constructor(config, localStorage, r2Storage, s3Storage) {
        this.config = config;
        this.localStorage = localStorage;
        this.r2Storage = r2Storage;
        this.s3Storage = s3Storage;
    }
    getProvider() {
        const storageType = this.config.get('STORAGE_TYPE', 'local');
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
};
exports.StorageProviderFactory = StorageProviderFactory;
exports.StorageProviderFactory = StorageProviderFactory = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [config_1.ConfigService,
        local_storage_provider_1.LocalStorageProvider,
        cloudflare_r2_provider_1.CloudflareR2Provider,
        s3_provider_1.S3Provider])
], StorageProviderFactory);
//# sourceMappingURL=storage-provider.factory.js.map