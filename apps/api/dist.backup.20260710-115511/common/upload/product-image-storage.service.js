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
var ProductImageStorageService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.ProductImageStorageService = exports.PRODUCT_IMAGE_ALLOWED_MIME = exports.PRODUCT_IMAGE_MAX_BYTES = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const fs = require("fs/promises");
const path = require("path");
const sharp_1 = require("sharp");
exports.PRODUCT_IMAGE_MAX_BYTES = 8 * 1024 * 1024;
exports.PRODUCT_IMAGE_ALLOWED_MIME = new Set([
    'image/png',
    'image/jpeg',
    'image/jpg',
    'image/webp',
]);
const IMAGE_MAX_EDGE = 1024;
const THUMB_MAX_EDGE = 200;
let ProductImageStorageService = ProductImageStorageService_1 = class ProductImageStorageService {
    config;
    logger = new common_1.Logger(ProductImageStorageService_1.name);
    constructor(config) {
        this.config = config;
    }
    async store(productId, file) {
        if (!file || !file.buffer || file.buffer.length === 0) {
            throw new common_1.BadRequestException('Image upload was empty');
        }
        if (file.size > exports.PRODUCT_IMAGE_MAX_BYTES) {
            throw new common_1.BadRequestException('Image exceeds maximum size of 8MB');
        }
        if (!exports.PRODUCT_IMAGE_ALLOWED_MIME.has(file.mimetype)) {
            throw new common_1.BadRequestException('Image must be a PNG, JPEG, or WebP file');
        }
        let main;
        let thumb;
        try {
            const pipeline = (0, sharp_1.default)(file.buffer, { failOn: 'error' }).rotate();
            main = await pipeline
                .clone()
                .resize(IMAGE_MAX_EDGE, IMAGE_MAX_EDGE, { fit: 'inside', withoutEnlargement: true })
                .webp({ quality: 80 })
                .toBuffer();
            thumb = await pipeline
                .clone()
                .resize(THUMB_MAX_EDGE, THUMB_MAX_EDGE, { fit: 'inside', withoutEnlargement: true })
                .webp({ quality: 70 })
                .toBuffer();
        }
        catch {
            throw new common_1.BadRequestException('File could not be decoded as an image');
        }
        const baseDir = this.config.get('UPLOAD_STORAGE_DIR', './storage/uploads');
        const dir = path.join(baseDir, 'products');
        await fs.mkdir(dir, { recursive: true });
        const stamp = Date.now();
        const imageName = `${productId}-${stamp}.webp`;
        const thumbName = `${productId}-${stamp}-thumb.webp`;
        await fs.writeFile(path.join(dir, imageName), main, { mode: 0o644 });
        await fs.writeFile(path.join(dir, thumbName), thumb, { mode: 0o644 });
        return {
            imageUrl: `/uploads/products/${imageName}`,
            thumbnailUrl: `/uploads/products/${thumbName}`,
        };
    }
    async remove(urls) {
        const baseDir = this.config.get('UPLOAD_STORAGE_DIR', './storage/uploads');
        for (const url of urls) {
            if (!url || !url.startsWith('/uploads/products/'))
                continue;
            const name = path.basename(url);
            try {
                await fs.unlink(path.join(baseDir, 'products', name));
            }
            catch (err) {
                this.logger.warn(`Could not delete product image ${name}: ${String(err)}`);
            }
        }
    }
};
exports.ProductImageStorageService = ProductImageStorageService;
exports.ProductImageStorageService = ProductImageStorageService = ProductImageStorageService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [config_1.ConfigService])
], ProductImageStorageService);
//# sourceMappingURL=product-image-storage.service.js.map