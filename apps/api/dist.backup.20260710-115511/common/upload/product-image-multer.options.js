"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.productImageMulterOptions = void 0;
const common_1 = require("@nestjs/common");
const multer_1 = require("multer");
const product_image_storage_service_1 = require("./product-image-storage.service");
exports.productImageMulterOptions = {
    storage: (0, multer_1.memoryStorage)(),
    limits: {
        fileSize: product_image_storage_service_1.PRODUCT_IMAGE_MAX_BYTES,
        files: 1,
    },
    fileFilter: (_req, file, cb) => {
        if (!product_image_storage_service_1.PRODUCT_IMAGE_ALLOWED_MIME.has(file.mimetype)) {
            cb(new common_1.BadRequestException('Image must be a PNG, JPEG, or WebP file'), false);
            return;
        }
        cb(null, true);
    },
};
//# sourceMappingURL=product-image-multer.options.js.map