import type { BrandingSnapshotV1 } from './branding.types';
import type { Prisma } from '@prisma/client';
export declare function asBrandingSnapshot(value: Prisma.JsonValue | null | undefined): BrandingSnapshotV1;
export declare function asBrandingSnapshotOrNull(value: Prisma.JsonValue | null | undefined): BrandingSnapshotV1 | null;
