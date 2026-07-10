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
exports.StorageService = void 0;
const common_1 = require("@nestjs/common");
const storage_provider_factory_1 = require("./storage-provider.factory");
let StorageService = class StorageService {
    factory;
    constructor(factory) {
        this.factory = factory;
    }
    provider() {
        return this.factory.getProvider();
    }
    async writeBuffer(assetKey, buffer, options) {
        return this.provider().writeBuffer(assetKey, buffer, options);
    }
    async readBuffer(assetKey) {
        return this.provider().readBuffer(assetKey);
    }
    async deleteObject(assetKey) {
        return this.provider().deleteObject(assetKey);
    }
    async exists(assetKey) {
        return this.provider().exists(assetKey);
    }
    getPublicUrl(assetKey, options) {
        return this.provider().getPublicUrl(assetKey, options);
    }
    async getSignedUrl(assetKey, expiresIn) {
        return this.provider().getSignedUrl(assetKey, expiresIn);
    }
};
exports.StorageService = StorageService;
exports.StorageService = StorageService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [storage_provider_factory_1.StorageProviderFactory])
], StorageService);
//# sourceMappingURL=storage.service.js.map