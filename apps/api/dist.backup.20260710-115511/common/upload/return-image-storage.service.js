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
var ReturnImageStorageService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.ReturnImageStorageService = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const fs = require("fs/promises");
const path = require("path");
const crypto_1 = require("crypto");
const return_image_multer_options_1 = require("./return-image-multer.options");
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
let ReturnImageStorageService = ReturnImageStorageService_1 = class ReturnImageStorageService {
    config;
    logger = new common_1.Logger(ReturnImageStorageService_1.name);
    constructor(config) {
        this.config = config;
    }
    baseDir() {
        return path.resolve(this.config.get('UPLOAD_STORAGE_DIR', './storage/uploads'));
    }
    resolveDiskPath(storedPath) {
        return path.join(this.baseDir(), storedPath);
    }
    async store(returnId, file) {
        if (!file?.buffer?.length) {
            throw new common_1.BadRequestException('Return image upload was empty');
        }
        if (file.size > return_image_multer_options_1.RETURN_IMAGE_MAX_BYTES) {
            throw new common_1.BadRequestException('Return image exceeds maximum size of 5MB');
        }
        if (!return_image_multer_options_1.RETURN_IMAGE_ALLOWED_MIME.has(file.mimetype)) {
            throw new common_1.BadRequestException('Return image must be a PNG, JPEG, or WebP image');
        }
        const detected = detectKind(file.buffer);
        if (!detected) {
            throw new common_1.BadRequestException('Return image bytes do not match a supported image format');
        }
        const declared = file.mimetype.split('/')[1];
        if (declared === 'jpg' ? detected !== 'jpeg' : declared !== detected) {
            throw new common_1.BadRequestException('Return image declared MIME does not match its bytes');
        }
        const ext = detected === 'jpeg' ? 'jpg' : detected;
        const relativeDir = path.join('returns', returnId);
        const dirPath = this.resolveDiskPath(relativeDir);
        await fs.mkdir(dirPath, { recursive: true });
        const filename = `${Date.now()}-${(0, crypto_1.randomUUID)()}.${ext}`;
        const relativePath = path.join(relativeDir, filename);
        const fullPath = this.resolveDiskPath(relativePath);
        await fs.writeFile(fullPath, file.buffer, { mode: 0o644 });
        return {
            filePath: relativePath.replace(/\\/g, '/'),
            publicUrl: `/uploads/${relativePath.replace(/\\/g, '/')}`,
            originalFilename: file.originalname,
            mimeType: file.mimetype,
        };
    }
    async remove(storedPath) {
        if (!storedPath)
            return;
        try {
            await fs.unlink(this.resolveDiskPath(storedPath));
        }
        catch (err) {
            const code = err.code;
            if (code !== 'ENOENT') {
                this.logger.warn(`Failed to delete return image ${storedPath}: ${err.message}`);
            }
        }
    }
    async read(storedPath) {
        return fs.readFile(this.resolveDiskPath(storedPath));
    }
};
exports.ReturnImageStorageService = ReturnImageStorageService;
exports.ReturnImageStorageService = ReturnImageStorageService = ReturnImageStorageService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [config_1.ConfigService])
], ReturnImageStorageService);
//# sourceMappingURL=return-image-storage.service.js.map