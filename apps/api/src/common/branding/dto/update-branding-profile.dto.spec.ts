import 'reflect-metadata';
import { plainToInstance } from 'class-transformer';
import { validateSync } from 'class-validator';
import { UpdateBrandingProfileDto } from './update-branding-profile.dto';

// Mirrors the global ValidationPipe (transform + implicit conversion) on a
// multipart body, where every field arrives as a string.
function parse(body: Record<string, string>) {
  const dto = plainToInstance(UpdateBrandingProfileDto, body, { enableImplicitConversion: true });
  return { dto, errors: validateSync(dto, { whitelist: true, forbidNonWhitelisted: true }) };
}

describe('UpdateBrandingProfileDto (multipart)', () => {
  it('treats a blank email as not provided', () => {
    const { dto, errors } = parse({ companyName: 'Acme', email: '' });
    expect(errors).toEqual([]);
    expect(dto.email).toBeUndefined();
  });

  it('still rejects a malformed email', () => {
    expect(parse({ email: 'not-an-email' }).errors).toHaveLength(1);
  });

  it('reads removeLogo="false" as false and "true" as true', () => {
    expect(parse({ removeLogo: 'false' }).dto.removeLogo).toBe(false);
    expect(parse({ removeLogo: 'true' }).dto.removeLogo).toBe(true);
  });
});
