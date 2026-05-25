import { BadRequestException } from '@nestjs/common';
import { memoryStorage } from 'multer';
import type { MulterOptions } from '@nestjs/platform-express/multer/interfaces/multer-options.interface';

const ALLOWED_MIME = new Set(['image/png', 'image/jpeg', 'image/webp']);
const MAX_BYTES = 5 * 1024 * 1024;

export const returnImageMulterOptions: MulterOptions = {
  storage: memoryStorage(),
  limits: {
    fileSize: MAX_BYTES,
    files: 1,
  },
  fileFilter: (_req, file, cb) => {
    if (!ALLOWED_MIME.has(file.mimetype)) {
      cb(new BadRequestException('Return image must be a PNG, JPEG, or WebP image'), false);
      return;
    }
    cb(null, true);
  },
};

export const RETURN_IMAGE_ALLOWED_MIME = ALLOWED_MIME;
export const RETURN_IMAGE_MAX_BYTES = MAX_BYTES;
