import { BadRequestException } from '@nestjs/common';
import { avatarMulterOptions, AVATAR_MAX_BYTES } from './avatar-multer.options';

describe('avatarMulterOptions', () => {
  const fileFilter = avatarMulterOptions.fileFilter!;

  function callFilter(mimetype: string): { err: unknown; accepted: boolean } {
    let err: unknown = null;
    let accepted = false;
    fileFilter(
      // multer typing — `req` is the Express request, irrelevant for the filter.
      {} as never,
      // We only inspect mimetype, so fudge the rest of Multer.File.
      { mimetype, originalname: 'a', fieldname: 'avatar', encoding: '7bit' } as never,
      (e, ok) => {
        err = e;
        accepted = !!ok;
      },
    );
    return { err, accepted };
  }

  it('accepts PNG, JPEG, and WebP', () => {
    for (const mime of ['image/png', 'image/jpeg', 'image/webp']) {
      const { err, accepted } = callFilter(mime);
      expect(err).toBeNull();
      expect(accepted).toBe(true);
    }
  });

  it('rejects unsupported mime types', () => {
    const { err, accepted } = callFilter('image/gif');
    expect(err).toBeInstanceOf(BadRequestException);
    expect(accepted).toBe(false);
  });

  it('rejects non-image mime types', () => {
    const { err, accepted } = callFilter('application/pdf');
    expect(err).toBeInstanceOf(BadRequestException);
    expect(accepted).toBe(false);
  });

  it('hard caps fileSize at 2MB and limits to 1 file', () => {
    expect(avatarMulterOptions.limits?.fileSize).toBe(AVATAR_MAX_BYTES);
    expect(avatarMulterOptions.limits?.files).toBe(1);
  });
});
