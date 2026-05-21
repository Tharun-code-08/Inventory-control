import { BadRequestException } from '@nestjs/common';
import { memoryStorage } from 'multer';
import type { MulterOptions } from '@nestjs/platform-express/multer/interfaces/multer-options.interface';

const ALLOWED_MIME = new Set(['image/png', 'image/jpeg', 'image/webp']);
const MAX_BYTES = 2 * 1024 * 1024;

/**
 * Multer config for avatar uploads. We use `memoryStorage` so the avatar
 * service can run a magic-byte check before persisting to disk; multer's
 * default behaviour spills to the OS temp dir which we don't want for
 * untrusted bytes. Hard limits + MIME allowlist are enforced here so the
 * controller never sees an oversized or wrong-typed file.
 */
export const avatarMulterOptions: MulterOptions = {
  storage: memoryStorage(),
  limits: {
    fileSize: MAX_BYTES,
    files: 1,
  },
  fileFilter: (_req, file, cb) => {
    if (!ALLOWED_MIME.has(file.mimetype)) {
      cb(new BadRequestException('Avatar must be a PNG, JPEG, or WebP image'), false);
      return;
    }
    cb(null, true);
  },
};

export const AVATAR_ALLOWED_MIME = ALLOWED_MIME;
export const AVATAR_MAX_BYTES = MAX_BYTES;
