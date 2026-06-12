import { BadRequestException } from '@nestjs/common';
import type { MulterOptions } from '@nestjs/platform-express/multer/interfaces/multer-options.interface';
import { memoryStorage } from 'multer';
import {
  PRODUCT_IMAGE_ALLOWED_MIME,
  PRODUCT_IMAGE_MAX_BYTES,
} from './product-image-storage.service';

export const productImageMulterOptions: MulterOptions = {
  storage: memoryStorage(),
  limits: {
    fileSize: PRODUCT_IMAGE_MAX_BYTES,
    files: 1,
  },
  fileFilter: (_req, file, cb) => {
    if (!PRODUCT_IMAGE_ALLOWED_MIME.has(file.mimetype)) {
      cb(new BadRequestException('Image must be a PNG, JPEG, or WebP file'), false);
      return;
    }
    cb(null, true);
  },
};
