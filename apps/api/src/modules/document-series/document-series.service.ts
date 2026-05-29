import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { DocumentSeriesRestart, Prisma, RoleName } from '@prisma/client';
import type { RequestUser } from '../../common/types/request-user';
import { PrismaService } from '../../prisma/prisma.service';
import {
  DOCUMENT_SERIES_MODULES,
  getBuiltInSeriesDefault,
  type DocumentSeriesModuleDef,
} from './document-series.constants';
import type { DocumentSeriesRowDto } from './dto/update-document-series.dto';

export type ResolvedDocumentSeriesConfig = {
  docType: string;
  moduleLabel: string;
  prefix: string;
  startingNumber: number;
  padWidth: number;
  restartPeriod: DocumentSeriesRestart;
  shopScoped: boolean;
  enabled: boolean;
  useCategoryPrefix: boolean;
  isOverride: boolean;
};

export type DocumentSeriesListRow = ResolvedDocumentSeriesConfig & {
  preview: string;
  currentSequence: number | null;
  sequenceBucket: string;
};

@Injectable()
export class DocumentSeriesService {
  constructor(private readonly prisma: PrismaService) {}

  private assertOrgAdmin(user: RequestUser) {
    if (user.role !== RoleName.OWNER && user.role !== RoleName.ADMIN) {
      throw new ForbiddenException('Only organization admins can manage document series');
    }
  }

  private requireCompanyId(user: RequestUser): string {
    if (!user.companyId) {
      throw new BadRequestException('Company context is required');
    }
    return user.companyId;
  }

  sequenceBucket(date: Date, restartPeriod: DocumentSeriesRestart): string {
    const y = date.getUTCFullYear();
    const m = String(date.getUTCMonth() + 1).padStart(2, '0');
    if (restartPeriod === DocumentSeriesRestart.MONTHLY) return `${y}${m}`;
    if (restartPeriod === DocumentSeriesRestart.YEARLY) return `${y}`;
    return '000000';
  }

  sanitizePrefix(prefix: string) {
    return prefix.trim().toUpperCase().replace(/[^A-Z0-9-]/g, '');
  }

  shopScopedPrefix(shopNumber: string, basePrefix: string) {
    const safe = shopNumber.replace(/[^a-zA-Z0-9]/g, '').toUpperCase() || 'GEN';
    return `${this.sanitizePrefix(basePrefix)}-${safe}`;
  }

  buildPreview(
    config: ResolvedDocumentSeriesConfig,
    shopNumber = 'HQ001',
    date = new Date(),
  ): string {
    const prefix = config.shopScoped
      ? this.shopScopedPrefix(shopNumber, config.prefix)
      : this.sanitizePrefix(config.prefix);
    const bucket = this.sequenceBucket(date, config.restartPeriod);
    const padded = String(config.startingNumber).padStart(config.padWidth, '0');
    if (config.restartPeriod === DocumentSeriesRestart.NONE) {
      return `${prefix}-${padded}`;
    }
    return `${prefix}-${bucket}-${padded}`;
  }

  private toResolved(
    moduleDef: DocumentSeriesModuleDef,
    row?: {
      prefix: string;
      startingNumber: number;
      padWidth: number;
      restartPeriod: DocumentSeriesRestart;
      shopScoped: boolean;
      enabled: boolean;
      useCategoryPrefix: boolean;
    } | null,
    isOverride = false,
  ): ResolvedDocumentSeriesConfig {
    return {
      docType: moduleDef.docType,
      moduleLabel: moduleDef.moduleLabel,
      prefix: row?.prefix ?? moduleDef.defaultPrefix,
      startingNumber: row?.startingNumber ?? moduleDef.defaultStartingNumber,
      padWidth: row?.padWidth ?? moduleDef.defaultPadWidth,
      restartPeriod: row?.restartPeriod ?? moduleDef.defaultRestartPeriod,
      shopScoped: row?.shopScoped ?? moduleDef.shopScoped,
      enabled: row?.enabled ?? true,
      useCategoryPrefix: row?.useCategoryPrefix ?? moduleDef.defaultUseCategoryPrefix ?? false,
      isOverride,
    };
  }

  async ensureCompanyDefaults(companyId: string, userId?: string) {
    const existing = await this.prisma.documentSeriesConfig.findMany({
      where: { companyId, shopId: null },
      select: { docType: true },
    });
    const existingTypes = new Set(existing.map((row) => row.docType));
    const missing = DOCUMENT_SERIES_MODULES.filter((module) => !existingTypes.has(module.docType));
    if (missing.length === 0) return;

    await this.prisma.documentSeriesConfig.createMany({
      data: missing.map((module) => ({
        companyId,
        shopId: null,
        docType: module.docType,
        moduleLabel: module.moduleLabel,
        prefix: module.defaultPrefix,
        startingNumber: module.defaultStartingNumber,
        padWidth: module.defaultPadWidth,
        restartPeriod: module.defaultRestartPeriod,
        shopScoped: module.shopScoped,
        enabled: true,
        useCategoryPrefix: module.defaultUseCategoryPrefix ?? false,
        createdById: userId ?? null,
        updatedById: userId ?? null,
      })),
    });
  }

  async resolveEffectiveConfig(
    companyId: string,
    shopId: string,
    docType: string,
  ): Promise<ResolvedDocumentSeriesConfig> {
    const moduleDef = getBuiltInSeriesDefault(docType);
    if (!moduleDef) {
      throw new BadRequestException(`Unsupported document type: ${docType}`);
    }

    await this.ensureCompanyDefaults(companyId);

    const [companyRow, shopRow] = await Promise.all([
      this.prisma.documentSeriesConfig.findFirst({
        where: { companyId, shopId: null, docType },
      }),
      this.prisma.documentSeriesConfig.findFirst({
        where: { companyId, shopId, docType },
      }),
    ]);

    if (shopRow) {
      return this.toResolved(moduleDef, shopRow, true);
    }
    return this.toResolved(moduleDef, companyRow, false);
  }

  async resolveEffectiveConfigInTx(
    tx: Prisma.TransactionClient,
    companyId: string,
    shopId: string,
    docType: string,
  ): Promise<ResolvedDocumentSeriesConfig> {
    const moduleDef = getBuiltInSeriesDefault(docType);
    if (!moduleDef) {
      throw new BadRequestException(`Unsupported document type: ${docType}`);
    }

    const existingCompany = await tx.documentSeriesConfig.findFirst({
      where: { companyId, shopId: null, docType },
    });
    if (!existingCompany) {
      await tx.documentSeriesConfig.create({
        data: {
          companyId,
          shopId: null,
          docType: moduleDef.docType,
          moduleLabel: moduleDef.moduleLabel,
          prefix: moduleDef.defaultPrefix,
          startingNumber: moduleDef.defaultStartingNumber,
          padWidth: moduleDef.defaultPadWidth,
          restartPeriod: moduleDef.defaultRestartPeriod,
          shopScoped: moduleDef.shopScoped,
          enabled: true,
          useCategoryPrefix: moduleDef.defaultUseCategoryPrefix ?? false,
        },
      });
    }

    const [companyRow, shopRow] = await Promise.all([
      tx.documentSeriesConfig.findFirst({
        where: { companyId, shopId: null, docType },
      }),
      tx.documentSeriesConfig.findFirst({
        where: { companyId, shopId, docType },
      }),
    ]);

    if (shopRow) {
      return this.toResolved(moduleDef, shopRow, true);
    }
    return this.toResolved(moduleDef, companyRow, false);
  }

  private async resolvePreviewShop(companyId: string, shopId?: string | null) {
    if (shopId) {
      const shop = await this.prisma.shop.findFirst({
        where: { id: shopId, companyId },
        select: { shopNumber: true },
      });
      if (shop) return shop.shopNumber;
    }
    const firstShop = await this.prisma.shop.findFirst({
      where: { companyId, isActive: true },
      orderBy: { shopNumber: 'asc' },
      select: { shopNumber: true },
    });
    return firstShop?.shopNumber ?? 'HQ001';
  }

  private async currentSequenceFor(
    shopId: string,
    docType: string,
    restartPeriod: DocumentSeriesRestart,
    date = new Date(),
  ): Promise<number | null> {
    const bucket = this.sequenceBucket(date, restartPeriod);
    const row = await this.prisma.documentSequence.findUnique({
      where: {
        docType_shopId_yearMonth: {
          docType,
          shopId,
          yearMonth: bucket,
        },
      },
      select: { lastSeq: true },
    });
    return row?.lastSeq ?? null;
  }

  async listEffective(user: RequestUser, shopId?: string | null): Promise<DocumentSeriesListRow[]> {
    this.assertOrgAdmin(user);
    const companyId = this.requireCompanyId(user);
    await this.ensureCompanyDefaults(companyId, user.id);

    if (shopId) {
      const shop = await this.prisma.shop.findFirst({
        where: { id: shopId, companyId },
        select: { id: true },
      });
      if (!shop) throw new NotFoundException('Shop not found');
    }

    const where: Prisma.DocumentSeriesConfigWhereInput = shopId
      ? { companyId, OR: [{ shopId: null }, { shopId }] }
      : { companyId, shopId: null };

    const rows = await this.prisma.documentSeriesConfig.findMany({ where });
    const companyByType = new Map(
      rows.filter((row) => row.shopId === null).map((row) => [row.docType, row]),
    );
    const shopByType = new Map(
      rows.filter((row) => row.shopId !== null).map((row) => [row.docType, row]),
    );

    const previewShopNumber = await this.resolvePreviewShop(companyId, shopId);
    const previewShopId =
      shopId ??
      (
        await this.prisma.shop.findFirst({
          where: { companyId, isActive: true },
          orderBy: { shopNumber: 'asc' },
          select: { id: true },
        })
      )?.id;

    const now = new Date();
    return Promise.all(
      DOCUMENT_SERIES_MODULES.map(async (moduleDef) => {
        const sourceRow = shopId
          ? shopByType.get(moduleDef.docType) ?? companyByType.get(moduleDef.docType)
          : companyByType.get(moduleDef.docType);
        const resolved = this.toResolved(
          moduleDef,
          sourceRow ?? null,
          Boolean(shopId && shopByType.has(moduleDef.docType)),
        );
        const bucket = this.sequenceBucket(now, resolved.restartPeriod);
        const currentSequence =
          previewShopId && resolved.docType !== 'PRD'
            ? await this.currentSequenceFor(previewShopId, resolved.docType, resolved.restartPeriod, now)
            : null;
        return {
          ...resolved,
          preview: this.buildPreview(resolved, previewShopNumber, now),
          currentSequence,
          sequenceBucket: bucket,
        };
      }),
    );
  }

  private normalizeRowInput(row: DocumentSeriesRowDto, moduleDef: DocumentSeriesModuleDef) {
    return {
      prefix: row.prefix ? this.sanitizePrefix(row.prefix) : moduleDef.defaultPrefix,
      startingNumber: row.startingNumber ?? moduleDef.defaultStartingNumber,
      padWidth: row.padWidth ?? moduleDef.defaultPadWidth,
      restartPeriod: DocumentSeriesRestart.NONE,
      shopScoped: false,
      enabled: row.enabled ?? true,
      useCategoryPrefix: row.useCategoryPrefix ?? moduleDef.defaultUseCategoryPrefix ?? false,
    };
  }

  private async upsertCompanyRow(
    companyId: string,
    userId: string,
    row: DocumentSeriesRowDto,
    moduleDef: DocumentSeriesModuleDef,
  ) {
    const data = this.normalizeRowInput(row, moduleDef);
    const existing = await this.prisma.documentSeriesConfig.findFirst({
      where: { companyId, shopId: null, docType: row.docType },
    });
    if (existing) {
      await this.prisma.documentSeriesConfig.update({
        where: { id: existing.id },
        data: {
          ...data,
          moduleLabel: moduleDef.moduleLabel,
          updatedById: userId,
        },
      });
      return;
    }
    await this.prisma.documentSeriesConfig.create({
      data: {
        companyId,
        shopId: null,
        docType: row.docType,
        moduleLabel: moduleDef.moduleLabel,
        ...data,
        createdById: userId,
        updatedById: userId,
      },
    });
  }

  async updateCompanyDefaults(user: RequestUser, rows: DocumentSeriesRowDto[]) {
    this.assertOrgAdmin(user);
    const companyId = this.requireCompanyId(user);
    await this.ensureCompanyDefaults(companyId, user.id);

    for (const row of rows) {
      const moduleDef = getBuiltInSeriesDefault(row.docType);
      if (!moduleDef) {
        throw new BadRequestException(`Unsupported document type: ${row.docType}`);
      }
      await this.upsertCompanyRow(companyId, user.id, row, moduleDef);
    }

    return this.listEffective(user, null);
  }

  async updateShopOverrides(user: RequestUser, shopId: string, rows: DocumentSeriesRowDto[]) {
    this.assertOrgAdmin(user);
    const companyId = this.requireCompanyId(user);
    const shop = await this.prisma.shop.findFirst({
      where: { id: shopId, companyId },
      select: { id: true },
    });
    if (!shop) throw new NotFoundException('Shop not found');
    await this.ensureCompanyDefaults(companyId, user.id);

    for (const row of rows) {
      const moduleDef = getBuiltInSeriesDefault(row.docType);
      if (!moduleDef) {
        throw new BadRequestException(`Unsupported document type: ${row.docType}`);
      }
      const data = this.normalizeRowInput(row, moduleDef);
      const existing = await this.prisma.documentSeriesConfig.findFirst({
        where: { companyId, shopId, docType: row.docType },
      });
      if (existing) {
        await this.prisma.documentSeriesConfig.update({
          where: { id: existing.id },
          data: {
            ...data,
            moduleLabel: moduleDef.moduleLabel,
            updatedById: user.id,
          },
        });
      } else {
        await this.prisma.documentSeriesConfig.create({
          data: {
            companyId,
            shopId,
            docType: row.docType,
            moduleLabel: moduleDef.moduleLabel,
            ...data,
            createdById: user.id,
            updatedById: user.id,
          },
        });
      }
    }

    return this.listEffective(user, shopId);
  }

  async deleteShopOverride(user: RequestUser, shopId: string, docType: string) {
    this.assertOrgAdmin(user);
    const companyId = this.requireCompanyId(user);
    const existing = await this.prisma.documentSeriesConfig.findFirst({
      where: { companyId, shopId, docType },
    });
    if (!existing) throw new NotFoundException('Shop override not found');
    await this.prisma.documentSeriesConfig.delete({ where: { id: existing.id } });
    return this.listEffective(user, shopId);
  }
}
