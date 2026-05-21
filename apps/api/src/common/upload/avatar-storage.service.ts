import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as fs from 'fs/promises';
import * as path from 'path';
import { AVATAR_ALLOWED_MIME, AVATAR_MAX_BYTES } from './avatar-multer.options';

const PNG_SIG = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
const JPEG_SIG = Buffer.from([0xff, 0xd8, 0xff]);
const WEBP_RIFF = Buffer.from('RIFF');
const WEBP_TAG = Buffer.from('WEBP');

function detectKind(buf: Buffer): 'png' | 'jpeg' | 'webp' | null {
  if (buf.length >= PNG_SIG.length && buf.subarray(0, PNG_SIG.length).equals(PNG_SIG)) {
    return 'png';
  }
  if (buf.length >= JPEG_SIG.length && buf.subarray(0, JPEG_SIG.length).equals(JPEG_SIG)) {
    return 'jpeg';
  }
  if (
    buf.length >= 12 &&
    buf.subarray(0, 4).equals(WEBP_RIFF) &&
    buf.subarray(8, 12).equals(WEBP_TAG)
  ) {
    return 'webp';
  }
  return null;
}

@Injectable()
export class AvatarStorageService {
  private readonly logger = new Logger(AvatarStorageService.name);

  constructor(private readonly config: ConfigService) {}

  /**
   * Validate magic bytes, write the avatar to disk under `UPLOAD_STORAGE_DIR`,
   * and return the public URL the SPA should embed in the user record.
   */
  async store(userId: string, file: Express.Multer.File): Promise<string> {
    if (!file || !file.buffer || file.buffer.length === 0) {
      throw new BadRequestException('Avatar upload was empty');
    }
    if (file.size > AVATAR_MAX_BYTES) {
      throw new BadRequestException('Avatar exceeds maximum size of 2MB');
    }
    if (!AVATAR_ALLOWED_MIME.has(file.mimetype)) {
      throw new BadRequestException('Avatar must be a PNG, JPEG, or WebP image');
    }
    const detected = detectKind(file.buffer);
    if (!detected) {
      throw new BadRequestException('Avatar bytes do not match a supported image format');
    }
    const declared = file.mimetype.split('/')[1];
    // Reject MIME/byte mismatches (e.g. .png renamed from .pdf).
    if (declared === 'jpg' ? detected !== 'jpeg' : declared !== detected) {
      throw new BadRequestException('Avatar declared MIME does not match its bytes');
    }

    const baseDir = this.config.get<string>('UPLOAD_STORAGE_DIR', './storage/uploads');
    const avatarsDir = path.join(baseDir, 'avatars');
    await fs.mkdir(avatarsDir, { recursive: true });

    const ext = detected === 'jpeg' ? 'jpg' : detected;
    // Stamp file name with timestamp so SPA caches don't show a stale avatar
    // after a re-upload, but keep the userId prefix so old files can be
    // located/deleted by ops.
    const fileName = `${userId}-${Date.now()}.${ext}`;
    const fullPath = path.join(avatarsDir, fileName);
    await fs.writeFile(fullPath, file.buffer, { mode: 0o644 });

    return `/uploads/avatars/${fileName}`;
  }
}
