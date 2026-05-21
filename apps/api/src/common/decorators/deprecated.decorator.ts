import { SetMetadata, applyDecorators } from '@nestjs/common';
import { ApiOperation } from '@nestjs/swagger';

export const DEPRECATED_KEY = 'http:deprecated';

export type DeprecatedMeta = {
  /** RFC 1123 / ISO date string at which support is removed. */
  sunsetAt: string;
  /** Optional URL pointing at migration docs / replacement endpoint. */
  link?: string;
  /** Optional human-readable note shown in Swagger summary. */
  note?: string;
};

/**
 * Mark a controller route as deprecated. The DeprecationInterceptor reads this
 * metadata and emits the `Deprecation: true` and `Sunset: <date>` response
 * headers (RFC 8594). Also flips `@ApiOperation({ deprecated: true })` so the
 * Swagger UI renders a strikethrough on the path.
 *
 * Example:
 *   @Deprecated({ sunsetAt: '2026-12-31', link: 'https://docs/api/v2/orders' })
 *   @Get('legacy-orders')
 *   listLegacy(...) { ... }
 */
export function Deprecated(meta: DeprecatedMeta): ClassDecorator & MethodDecorator {
  const summarySuffix = meta.link ? ` (see ${meta.link})` : '';
  return applyDecorators(
    SetMetadata(DEPRECATED_KEY, meta),
    ApiOperation({
      deprecated: true,
      description: `Deprecated. Sunset on ${meta.sunsetAt}.${meta.note ? ` ${meta.note}` : ''}${summarySuffix}`,
    }),
  );
}
