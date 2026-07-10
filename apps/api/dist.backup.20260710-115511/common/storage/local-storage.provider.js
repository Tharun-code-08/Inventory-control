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
exports.LocalStorageProvider = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const fs = require("fs/promises");
const path = require("path");
let LocalStorageProvider = class LocalStorageProvider {
    config;
    constructor(config) {
        this.config = config;
    }
    baseDir() {
        return path.resolve(this.config.get('UPLOAD_STORAGE_DIR', './storage/uploads'));
    }
    getStoragePath(assetKey) {
        return path.join(this.baseDir(), assetKey);
    }
    getBaseUrl() {
        const apiPort = this.config.get('API_PORT', '3001');
        return `http://localhost:${apiPort}/uploads`;
    }
    async writeBuffer(assetKey, buffer, _options) {
        const target = this.getStoragePath(assetKey);
        await fs.mkdir(path.dirname(target), { recursive: true });
        await fs.writeFile(target, buffer, { mode: 0o644 });
        const url = this.getPublicUrl(assetKey);
        return { assetKey, bytes: buffer.length, url };
    }
    async readBuffer(assetKey) {
        const target = this.getStoragePath(assetKey);
        return fs.readFile(target);
    }
    async deleteObject(assetKey) {
        const target = this.getStoragePath(assetKey);
        try {
            await fs.unlink(target);
        }
        catch (err) {
            if (err.code !== 'ENOENT')
                throw err;
        }
    }
    async exists(assetKey) {
        const target = this.getStoragePath(assetKey);
        try {
            await fs.access(target);
            return true;
        }
        catch {
            return false;
        }
    }
    getPublicUrl(assetKey, options) {
        const baseUrl = this.getBaseUrl();
        const url = `${baseUrl}/${assetKey}`.replace(/\\/g, '/');
        if (options?.version) {
            return `${url}?v=${options.version}`;
        }
        return url;
    }
    async getSignedUrl(assetKey, _expiresIn) {
        return this.getPublicUrl(assetKey);
    }
};
exports.LocalStorageProvider = LocalStorageProvider;
exports.LocalStorageProvider = LocalStorageProvider = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [config_1.ConfigService])
], LocalStorageProvider);
//# sourceMappingURL=local-storage.provider.js.map