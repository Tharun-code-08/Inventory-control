import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import type { RequestUser } from '../../common/types/request-user';
import { requireCompanyId } from '../../common/utils/shop-scope';

@Injectable()
export class CompanySettingsService {
  constructor(private readonly prisma: PrismaService) {}

  async list(user: RequestUser) {
    const companyId = requireCompanyId(user);
    return this.prisma.companySetting.findMany({
      where: { companyId },
      orderBy: { key: 'asc' },
    });
  }

  async get(user: RequestUser, key: string) {
    const companyId = requireCompanyId(user);
    const setting = await this.prisma.companySetting.findUnique({
      where: { companyId_key: { companyId, key } },
    });
    if (!setting) {
      throw new NotFoundException(`Setting with key "${key}" not found`);
    }
    return setting;
  }

  async upsert(user: RequestUser, key: string, value: string) {
    const companyId = requireCompanyId(user);
    return this.prisma.companySetting.upsert({
      where: { companyId_key: { companyId, key } },
      create: { companyId, key, value },
      update: { value },
    });
  }

  async getSetting(companyId: string, key: string): Promise<string | null> {
    const setting = await this.prisma.companySetting.findUnique({
      where: { companyId_key: { companyId, key } },
    });
    return setting ? setting.value : null;
  }

  async getUnknownBarcodePolicy(companyId: string): Promise<'AUTO_CREATE' | 'ASK' | 'REJECT'> {
    const value = await this.getSetting(companyId, 'UNKNOWN_BARCODE_POLICY');
    if (value === 'AUTO_CREATE' || value === 'REJECT') {
      return value;
    }
    return 'ASK'; // Default policy
  }
}
