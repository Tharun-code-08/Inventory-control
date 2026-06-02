import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as fs from 'fs/promises';
import * as path from 'path';
import type { StorageProvider, StoragePublicUrlOptions, StorageWriteOptions, StorageWriteResult } from './storage-provider';

@Injectable()
export class LocalStorageProvider implements StorageProvider {
  constructor(private readonly config: ConfigService) {}

  private baseDir(): string {
    return path.resolve(this.config.get<string>('UPLOAD_STORAGE_DIR', './storage/uploads'));
  }

  private brandingDir(): string {
    return path.join(this.baseDir(), 'branding');
  }

  async writeBuffer(assetKey: string, buffer: Buffer): Promise<StorageWriteResult> {
    const target = path.join(this.brandingDir(), assetKey);
    await fs.mkdir(path.dirname(target), { recursive: true });
    await fs.writeFile(target, buffer, { mode: 0o644 });
    return { assetKey, bytes: buffer.length };
  }

  async deleteObject(assetKey: string): Promise<void> {
    const target = path.join(this.brandingDir(), assetKey);
    try {
      await fs.unlink(target);
    } catch (err) {
      if ((err as NodeJS.ErrnoException).code !== 'ENOENT') throw err;
    }
  }

  getPublicUrl(assetKey: string, options?: StoragePublicUrlOptions): string {
    const baseUrl = '/uploads/branding';
    const url = `${baseUrl}/${assetKey}`.replace(/\\/g, '/');
    if (options?.version) {
      return `${url}?v=${options.version}`;
    }
    return url;
  }
}
