"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.brandingMulterOptions = void 0;
const common_1 = require("@nestjs/common");
const multer_1 = require("multer");
const ALLOWED_MIME = new Set(['image/png', 'image/jpeg', 'image/webp']);
const MAX_BYTES = 1 * 1024 * 1024;
exports.brandingMulterOptions = {
    storage: (0, multer_1.memoryStorage)(),
    limits: {
        fileSize: MAX_BYTES,
        files: 1,
    },
    fileFilter: (_req, file, cb) => {
        if (!ALLOWED_MIME.has(file.mimetype)) {
            cb(new common_1.BadRequestException('Logo must be a PNG, JPEG, or WebP image'), false);
            return;
        }
        cb(null, true);
    },
};
//# sourceMappingURL=branding-multer.options.js.map