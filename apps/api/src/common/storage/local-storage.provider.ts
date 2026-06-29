import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as fs from 'fs/promises';
import * as path from 'path';
import type { StorageProvider, StoragePublicUrlOptions, StorageWriteResult, StorageWriteOptions } from './storage-provider';

@Injectable()
export class LocalStorageProvider implements StorageProvider {
  constructor(private readonly config: ConfigService) {}

  private baseDir(): string {
    return path.resolve(this.config.get<string>('UPLOAD_STORAGE_DIR', './storage/uploads'));
  }

  private getStoragePath(assetKey: string): string {
    return path.join(this.baseDir(), assetKey);
  }

  private getBaseUrl(): string {
    const apiPort = this.config.get<string>('API_PORT', '3001');
    return `http://localhost:${apiPort}/uploads`;
  }

  async writeBuffer(
    assetKey: string,
    buffer: Buffer,
    _options?: StorageWriteOptions,
  ): Promise<StorageWriteResult> {
    const target = this.getStoragePath(assetKey);
    await fs.mkdir(path.dirname(target), { recursive: true });
    await fs.writeFile(target, buffer, { mode: 0o644 });

    const url = this.getPublicUrl(assetKey);
    return { assetKey, bytes: buffer.length, url };
  }

  async readBuffer(assetKey: string): Promise<Buffer> {
    const target = this.getStoragePath(assetKey);
    return fs.readFile(target);
  }

  async deleteObject(assetKey: string): Promise<void> {
    const target = this.getStoragePath(assetKey);
    try {
      await fs.unlink(target);
    } catch (err) {
      if ((err as NodeJS.ErrnoException).code !== 'ENOENT') throw err;
    }
  }

  async exists(assetKey: string): Promise<boolean> {
    const target = this.getStoragePath(assetKey);
    try {
      await fs.access(target);
      return true;
    } catch {
      return false;
    }
  }

  getPublicUrl(assetKey: string, options?: StoragePublicUrlOptions): string {
    const baseUrl = this.getBaseUrl();
    const url = `${baseUrl}/${assetKey}`.replace(/\\/g, '/');
    if (options?.version) {
      return `${url}?v=${options.version}`;
    }
    return url;
  }

  async getSignedUrl(assetKey: string, _expiresIn?: number): Promise<string> {
    // For local storage, signed URLs are just regular public URLs
    // In production with R2/S3, this would generate actual signed URLs with expiration
    return this.getPublicUrl(assetKey);
  }
}
