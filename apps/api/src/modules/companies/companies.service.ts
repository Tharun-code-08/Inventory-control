import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import type { RequestUser } from '../../common/types/request-user';
import { CreateCompanyDto } from './dto/create-company.dto';
import { UpdateCompanyDto } from './dto/update-company.dto';

@Injectable()
export class CompaniesService {
  constructor(private readonly prisma: PrismaService) {}

  async list() {
    return this.prisma.company.findMany({ orderBy: { companyCode: 'asc' } });
  }

  async create(user: RequestUser, dto: CreateCompanyDto) {
    const count = await this.prisma.company.count();
    const code = dto.companyCode?.trim() || `COMP-${String(count + 1).padStart(3, '0')}`;
    return this.prisma.company.create({
      data: {
        companyCode: code,
        companyName: dto.companyName,
        address: dto.address ?? null,
        isActive: dto.isActive ?? true,
        createdById: user.id,
      },
    });
  }

  async get(id: string) {
    const item = await this.prisma.company.findUnique({ where: { id } });
    if (!item) throw new NotFoundException('Company not found');
    return item;
  }

  async update(user: RequestUser, id: string, dto: UpdateCompanyDto) {
    await this.get(id);
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
    await this.get(id);
    return this.prisma.company.update({
      where: { id },
      data: { isActive: false, updatedById: user.id },
    });
  }
}

