"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.RETURN_IMAGE_MAX_BYTES = exports.RETURN_IMAGE_ALLOWED_MIME = exports.returnImageMulterOptions = void 0;
const common_1 = require("@nestjs/common");
const multer_1 = require("multer");
const ALLOWED_MIME = new Set(['image/png', 'image/jpeg', 'image/webp']);
const MAX_BYTES = 5 * 1024 * 1024;
exports.returnImageMulterOptions = {
    storage: (0, multer_1.memoryStorage)(),
    limits: {
        fileSize: MAX_BYTES,
        files: 1,
    },
    fileFilter: (_req, file, cb) => {
        if (!ALLOWED_MIME.has(file.mimetype)) {
            cb(new common_1.BadRequestException('Return image must be a PNG, JPEG, or WebP image'), false);
            return;
        }
        cb(null, true);
    },
};
exports.RETURN_IMAGE_ALLOWED_MIME = ALLOWED_MIME;
exports.RETURN_IMAGE_MAX_BYTES = MAX_BYTES;
//# sourceMappingURL=return-image-multer.options.js.map