import { Reflector } from '@nestjs/core';
import { firstValueFrom, of } from 'rxjs';
import { DEPRECATED_KEY } from '../decorators/deprecated.decorator';
import { DeprecationInterceptor } from './deprecation.interceptor';

function buildContext(meta: unknown) {
  const headers: Record<string, string> = {};
  const handler = () => undefined;
  const cls = class FakeController {};
  const ctx = {
    getHandler: () => handler,
    getClass: () => cls,
    switchToHttp: () => ({
      getResponse: () => ({
        setHeader: (name: string, value: string) => {
          headers[name] = value;
        },
      }),
    }),
  } as any;

  const reflector = {
    getAllAndOverride: jest.fn().mockReturnValue(meta),
  } as unknown as Reflector;

  return { ctx, reflector, headers };
}

describe('DeprecationInterceptor', () => {
  it('is a no-op for non-deprecated routes', async () => {
    const { ctx, reflector, headers } = buildContext(null);
    const interceptor = new DeprecationInterceptor(reflector);
    const result = await firstValueFrom(
      interceptor.intercept(ctx, { handle: () => of('ok') }),
    );
    expect(result).toBe('ok');
    expect(headers).toEqual({});
  });

  it('sets Deprecation, Sunset and Link headers when meta present', async () => {
    const { ctx, reflector, headers } = buildContext({
      sunsetAt: '2026-12-31T00:00:00Z',
      link: 'https://docs/api/v2',
    });
    const interceptor = new DeprecationInterceptor(reflector);
    await firstValueFrom(interceptor.intercept(ctx, { handle: () => of(null) }));

    expect(headers.Deprecation).toBe('true');
    // RFC 1123 / UTCString
    expect(new Date(headers.Sunset).toISOString()).toBe('2026-12-31T00:00:00.000Z');
    expect(headers.Link).toBe('<https://docs/api/v2>; rel="deprecation"');
    expect(reflector.getAllAndOverride).toHaveBeenCalledWith(
      DEPRECATED_KEY,
      expect.any(Array),
    );
  });

  it('falls back to raw sunsetAt string when not parseable as Date', async () => {
    const { ctx, reflector, headers } = buildContext({ sunsetAt: 'not-a-date' });
    const interceptor = new DeprecationInterceptor(reflector);
    await firstValueFrom(interceptor.intercept(ctx, { handle: () => of(null) }));
    expect(headers.Deprecation).toBe('true');
    expect(headers.Sunset).toBe('not-a-date');
    expect(headers.Link).toBeUndefined();
  });
});
