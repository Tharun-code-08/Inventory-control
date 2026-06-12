import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as fs from 'fs/promises';
import * as path from 'path';
import sharp from 'sharp';

export const PRODUCT_IMAGE_MAX_BYTES = 8 * 1024 * 1024;
export const PRODUCT_IMAGE_ALLOWED_MIME = new Set([
  'image/png',
  'image/jpeg',
  'image/jpg',
  'image/webp',
]);

/** Longest edge of the stored display image / thumbnail, in pixels. */
const IMAGE_MAX_EDGE = 1024;
const THUMB_MAX_EDGE = 200;

@Injectable()
export class ProductImageStorageService {
  private readonly logger = new Logger(ProductImageStorageService.name);

  constructor(private readonly config: ConfigService) {}

  /**
   * Validate, compress, and persist a product image plus its thumbnail.
   * Everything is re-encoded to WebP via sharp, which both normalizes the
   * format (decode-reencode defuses crafted image payloads) and keeps files
   * small for mobile. Returns public URLs served from `/uploads/products/`.
   */
  async store(
    productId: string,
    file: Express.Multer.File,
  ): Promise<{ imageUrl: string; thumbnailUrl: string }> {
    if (!file || !file.buffer || file.buffer.length === 0) {
      throw new BadRequestException('Image upload was empty');
    }
    if (file.size > PRODUCT_IMAGE_MAX_BYTES) {
      throw new BadRequestException('Image exceeds maximum size of 8MB');
    }
    if (!PRODUCT_IMAGE_ALLOWED_MIME.has(file.mimetype)) {
      throw new BadRequestException('Image must be a PNG, JPEG, or WebP file');
    }

    let main: Buffer;
    let thumb: Buffer;
    try {
      const pipeline = sharp(file.buffer, { failOn: 'error' }).rotate();
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
    } catch {
      throw new BadRequestException('File could not be decoded as an image');
    }

    const baseDir = this.config.get<string>('UPLOAD_STORAGE_DIR', './storage/uploads');
    const dir = path.join(baseDir, 'products');
    await fs.mkdir(dir, { recursive: true });

    // Timestamped names bust SPA/app caches after a re-upload while keeping
    // the productId prefix so stale files can be found and removed.
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

  /** Best-effort removal of previously stored files for this product. */
  async remove(urls: Array<string | null | undefined>): Promise<void> {
    const baseDir = this.config.get<string>('UPLOAD_STORAGE_DIR', './storage/uploads');
    for (const url of urls) {
      if (!url || !url.startsWith('/uploads/products/')) continue;
      const name = path.basename(url);
      try {
        await fs.unlink(path.join(baseDir, 'products', name));
      } catch (err) {
        this.logger.warn(`Could not delete product image ${name}: ${String(err)}`);
      }
    }
  }
}
