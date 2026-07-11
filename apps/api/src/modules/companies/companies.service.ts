import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import type { RequestUser } from '../../common/types/request-user';
import {
  assertCompanyInTenant,
  companyIdForUser,
  companyListWhere,
  requireCompanyId,
} from '../../common/utils/shop-scope';
import { CreateCompanyDto } from './dto/create-company.dto';
import { UpdateCompanyDto } from './dto/update-company.dto';

@Injectable()
export class CompaniesService {
  constructor(private readonly prisma: PrismaService) {}

  async list(user: RequestUser) {
    return this.prisma.company.findMany({
      where: companyListWhere(user),
      orderBy: { companyCode: 'asc' },
    });
  }

  async create(user: RequestUser, _dto: CreateCompanyDto) {
    if (companyIdForUser(user)) {
      throw new BadRequestException(
        'Your organisation already exists. Update your company profile instead of creating another.',
      );
    }
    throw new BadRequestException(
      'New organisations are created during sign-up. Sign out and use Create account if you need a separate organisation.',
    );
  }

  async get(user: RequestUser, id: string) {
    const item = await this.prisma.company.findUnique({ where: { id } });
    if (!item) throw new NotFoundException('Company not found');
    assertCompanyInTenant(user, item.id);
    return item;
  }

  async update(user: RequestUser, id: string, dto: UpdateCompanyDto) {
    await this.get(user, id);
    return this.prisma.company.update({
      where: { id },
      data: {
        companyCode: dto.companyCode,
        companyName: dto.companyName,
        address: dto.address,
        isActive: dto.isActive,
        updatedById: user.id,
      },
    });
  }

  async remove(user: RequestUser, id: string) {
    await this.get(user, id);
    const companyId = requireCompanyId(user);
    const shopCount = await this.prisma.shop.count({ where: { companyId } });
    if (shopCount > 0) {
      throw new BadRequestException(
        'Cannot deactivate this company while plants are still linked. Deactivate plants first.',
      );
    }
    return this.prisma.company.update({
      where: { id },
      data: { isActive: false, updatedById: user.id },
    });
  }
}
