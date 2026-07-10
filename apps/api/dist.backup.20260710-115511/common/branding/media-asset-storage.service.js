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
exports.MediaAssetStorageService = void 0;
const common_1 = require("@nestjs/common");
const sharp = require("sharp");
const storage_service_1 = require("../storage/storage.service");
const ALLOWED_MIME = new Set(['image/png', 'image/jpeg', 'image/webp']);
const MAX_BYTES = 1 * 1024 * 1024;
const PNG_SIG = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
const JPEG_SIG = Buffer.from([0xff, 0xd8, 0xff]);
const WEBP_RIFF = Buffer.from('RIFF');
const WEBP_TAG = Buffer.from('WEBP');
function detectKind(buf) {
    if (buf.length >= PNG_SIG.length && buf.subarray(0, PNG_SIG.length).equals(PNG_SIG)) {
        return 'png';
    }
    if (buf.length >= JPEG_SIG.length && buf.subarray(0, JPEG_SIG.length).equals(JPEG_SIG)) {
        return 'jpeg';
    }
    if (buf.length >= 12 &&
        buf.subarray(0, 4).equals(WEBP_RIFF) &&
        buf.subarray(8, 12).equals(WEBP_TAG)) {
        return 'webp';
    }
    return null;
}
let MediaAssetStorageService = class MediaAssetStorageService {
    storage;
    constructor(storage) {
        this.storage = storage;
    }
    async storeAsset({ file, type, scope }) {
        if (!file || !file.buffer || file.buffer.length === 0) {
            throw new common_1.BadRequestException('Upload was empty');
        }
        if (file.size > MAX_BYTES) {
            throw new common_1.BadRequestException('Asset exceeds maximum size of 1MB');
        }
        if (!ALLOWED_MIME.has(file.mimetype)) {
            throw new common_1.BadRequestException('Asset must be a PNG, JPEG, or WebP image');
        }
        const detected = detectKind(file.buffer);
        if (!detected) {
            throw new common_1.BadRequestException('Asset bytes do not match a supported image format');
        }
        const basePath = scope.shopId
            ? `shop-logo/${scope.shopId}`
            : scope.companyId
                ? `company-logo/${scope.companyId}`
                : null;
        if (!basePath) {
            throw new common_1.BadRequestException('Asset scope is required');
        }
        const prefix = type.toLowerCase();
        const originalKey = `${basePath}/${prefix}-original.png`;
        const thumbKey = `${basePath}/${prefix}-thumb.webp`;
        const pdfKey = `${basePath}/${prefix}-pdf.png`;
        const baseImage = sharp(file.buffer).resize(512, 512, { fit: 'inside', withoutEnlargement: true });
        const original = await baseImage.png({ quality: 90 }).toBuffer();
        const pdf = await baseImage.png({ quality: 90 }).toBuffer();
        const thumb = await baseImage.resize(128, 128, { fit: 'inside', withoutEnlargement: true }).webp({ quality: 80 }).toBuffer();
        await this.storage.writeBuffer(originalKey, original, { contentType: 'image/png' });
        await this.storage.writeBuffer(pdfKey, pdf, { contentType: 'image/png' });
        await this.storage.writeBuffer(thumbKey, thumb, { contentType: 'image/webp' });
        return {
            assetKey: originalKey,
            fileName: file.originalname,
            metadata: {
                originalKey,
                pdfKey,
                thumbKey,
            },
        };
    }
};
exports.MediaAssetStorageService = MediaAssetStorageService;
exports.MediaAssetStorageService = MediaAssetStorageService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [storage_service_1.StorageService])
], MediaAssetStorageService);
//# sourceMappingURL=media-asset-storage.service.js.map