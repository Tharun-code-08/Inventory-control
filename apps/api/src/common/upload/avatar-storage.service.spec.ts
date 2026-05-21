import { BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as fs from 'fs/promises';
import * as os from 'os';
import * as path from 'path';
import { AvatarStorageService } from './avatar-storage.service';

const PNG_SIG = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
const JPEG_SIG = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10]);
const WEBP_BUF = Buffer.concat([
  Buffer.from('RIFF'),
  Buffer.from([0x00, 0x00, 0x00, 0x00]),
  Buffer.from('WEBP'),
]);

function configWith(dir: string): ConfigService {
  return {
    get: (key: string, def?: string) => (key === 'UPLOAD_STORAGE_DIR' ? dir : def),
  } as unknown as ConfigService;
}

function file(buffer: Buffer, mimetype: string): Express.Multer.File {
  return {
    fieldname: 'avatar',
    originalname: 'avatar',
    encoding: '7bit',
    mimetype,
    buffer,
    size: buffer.length,
    destination: '',
    filename: '',
    path: '',
    stream: undefined as never,
  } as unknown as Express.Multer.File;
}

describe('AvatarStorageService', () => {
  let dir: string;
  let svc: AvatarStorageService;

  beforeEach(async () => {
    dir = await fs.mkdtemp(path.join(os.tmpdir(), 'avatar-store-'));
    svc = new AvatarStorageService(configWith(dir));
  });

  afterEach(async () => {
    await fs.rm(dir, { recursive: true, force: true });
  });

  it('writes a PNG file under <dir>/avatars and returns a public URL', async () => {
    const url = await svc.store('user-1', file(Buffer.concat([PNG_SIG, Buffer.from('rest')]), 'image/png'));
    expect(url).toMatch(/^\/uploads\/avatars\/user-1-\d+\.png$/);
    const written = await fs.readdir(path.join(dir, 'avatars'));
    expect(written).toHaveLength(1);
  });

  it('accepts JPEG with image/jpeg mime', async () => {
    const url = await svc.store('user-1', file(Buffer.concat([JPEG_SIG, Buffer.from('x')]), 'image/jpeg'));
    expect(url).toMatch(/\.jpg$/);
  });

  it('rejects empty buffer', async () => {
    await expect(svc.store('user-1', file(Buffer.alloc(0), 'image/png'))).rejects.toBeInstanceOf(
      BadRequestException,
    );
  });

  it('rejects MIME/byte mismatch (PDF disguised as PNG)', async () => {
    const fake = Buffer.from('%PDF-1.7\n');
    await expect(svc.store('user-1', file(fake, 'image/png'))).rejects.toBeInstanceOf(
      BadRequestException,
    );
  });

  it('rejects unsupported MIME', async () => {
    await expect(
      svc.store('user-1', file(Buffer.concat([PNG_SIG, Buffer.from('!')]), 'image/gif')),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('accepts WebP', async () => {
    const url = await svc.store('user-1', file(WEBP_BUF, 'image/webp'));
    expect(url).toMatch(/\.webp$/);
  });
});
