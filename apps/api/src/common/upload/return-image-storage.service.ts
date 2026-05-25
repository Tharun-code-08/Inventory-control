import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as fs from 'fs/promises';
import * as path from 'path';
import { randomUUID } from 'crypto';
import { RETURN_IMAGE_ALLOWED_MIME, RETURN_IMAGE_MAX_BYTES } from './return-image-multer.options';

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
export class ReturnImageStorageService {
  private readonly logger = new Logger(ReturnImageStorageService.name);

  constructor(private readonly config: ConfigService) {}

  private baseDir(): string {
    return path.resolve(this.config.get<string>('UPLOAD_STORAGE_DIR', './storage/uploads'));
  }

  private resolveDiskPath(storedPath: string): string {
    return path.join(this.baseDir(), storedPath);
  }

  async store(
    returnId: string,
    file: Express.Multer.File,
  ): Promise<{
    filePath: string;
    publicUrl: string;
    originalFilename: string;
    mimeType: string;
  }> {
    if (!file?.buffer?.length) {
      throw new BadRequestException('Return image upload was empty');
    }
    if (file.size > RETURN_IMAGE_MAX_BYTES) {
      throw new BadRequestException('Return image exceeds maximum size of 5MB');
    }
    if (!RETURN_IMAGE_ALLOWED_MIME.has(file.mimetype)) {
      throw new BadRequestException('Return image must be a PNG, JPEG, or WebP image');
    }

    const detected = detectKind(file.buffer);
    if (!detected) {
      throw new BadRequestException('Return image bytes do not match a supported image format');
    }
    const declared = file.mimetype.split('/')[1];
    if (declared === 'jpg' ? detected !== 'jpeg' : declared !== detected) {
      throw new BadRequestException('Return image declared MIME does not match its bytes');
    }

    const ext = detected === 'jpeg' ? 'jpg' : detected;
    const relativeDir = path.join('returns', returnId);
    const dirPath = this.resolveDiskPath(relativeDir);
    await fs.mkdir(dirPath, { recursive: true });

    const filename = `${Date.now()}-${randomUUID()}.${ext}`;
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

  async remove(storedPath: string): Promise<void> {
    if (!storedPath) return;
    try {
      await fs.unlink(this.resolveDiskPath(storedPath));
    } catch (err) {
      const code = (err as NodeJS.ErrnoException).code;
      if (code !== 'ENOENT') {
        this.logger.warn(`Failed to delete return image ${storedPath}: ${(err as Error).message}`);
      }
    }
  }

  async read(storedPath: string): Promise<Buffer> {
    return fs.readFile(this.resolveDiskPath(storedPath));
  }
}
