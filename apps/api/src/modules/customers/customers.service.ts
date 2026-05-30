import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import type { RequestUser } from '../../common/types/request-user';
import { assertShopScope, shopListWhere } from '../../common/utils/shop-scope';
import { repairOrphanShopsForUser, verifyShopInTenant } from '../../common/utils/shop-access';
import { buildMeta, clampTake } from '../../common/utils/pagination';
import { DocumentNumberService } from '../stock/document-number.service';
import { CreateCustomerDto } from './dto/create-customer.dto';
import { UpdateCustomerDto } from './dto/update-customer.dto';
import { runSerializableTxWithRetry } from '../../common/utils/serializable-tx';

@Injectable()
export class CustomersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly numbers: DocumentNumberService,
  ) {}

  async list(
    user: RequestUser,
    query: { search?: string; cursor?: string; take?: number } = {},
  ) {
    const take = clampTake(query.take);
    const search = query.search?.trim();
    const where: Prisma.CustomerWhereInput = {
      shop: shopListWhere(user),
      ...(search
        ? {
            OR: [
              { customerName: { contains: search, mode: 'insensitive' } },
              { customerCode: { contains: search, mode: 'insensitive' } },
            ],
          }
        : {}),
    };

    const rows = await this.prisma.customer.findMany({
      where,
      take: take + 1,
      ...(query.cursor ? { cursor: { id: query.cursor }, skip: 1 } : {}),
      orderBy: { id: 'asc' },
      select: {
        id: true,
        customerCode: true,
        customerName: true,
        email: true,
        phone: true,
        taxId: true,
        pan: true,
        city: true,
        country: true,
        isActive: true,
        shopId: true,
      },
    });
    const { items, meta } = buildMeta(rows, take);
    return { data: items, meta };
  }

  private duplicateCustomerMessage(
    existing: { customerName: string; customerCode: string },
    context: 'name' | 'code',
  ): string {
    const label = `"${existing.customerName}" (${existing.customerCode})`;
    if (context === 'name') {
      return `Customer ${label} already exists for this plant. Open the Customers list to view or edit it.`;
    }
    return `Customer ${label} already exists for this plant. It may have been created during an earlier attempt — refresh the Customers list.`;
  }

  async create(user: RequestUser, dto: CreateCustomerDto) {
    await repairOrphanShopsForUser(this.prisma, user);
    const shopId = dto.shopId ?? user.shopId;
    if (!shopId) throw new BadRequestException('shopId is required');
    await verifyShopInTenant(this.prisma, user, shopId);

    const shop = await this.prisma.shop.findUnique({
      where: { id: shopId },
      select: { companyId: true },
    });
    if (!shop?.companyId) {
      throw new BadRequestException(
        'This plant is not linked to your organisation yet. Refresh the Plants page and try again.',
      );
    }

    const customerName = dto.customerName.trim();
    const manualCode = dto.customerCode?.trim();

    const existingByName = await this.prisma.customer.findFirst({
      where: {
        shopId,
        customerName: { equals: customerName, mode: 'insensitive' },
      },
      select: { customerName: true, customerCode: true },
    });
    if (existingByName) {
      throw new ConflictException(this.duplicateCustomerMessage(existingByName, 'name'));
    }

    if (manualCode) {
      const existingByCode = await this.prisma.customer.findFirst({
        where: { shopId, customerCode: manualCode },
        select: { customerName: true, customerCode: true },
      });
      if (existingByCode) {
        throw new ConflictException(this.duplicateCustomerMessage(existingByCode, 'code'));
      }
    }

    let attemptedCode = manualCode ?? '';

    try {
      return await runSerializableTxWithRetry(this.prisma, async (tx) => {
        const customerCode =
          attemptedCode ||
          (await this.numbers.nextConfiguredShopScopedNumber(tx, {
            shopId,
            docType: 'CUS',
            date: new Date(),
          }));
        attemptedCode = customerCode;

        return tx.customer.create({
          data: {
            customerCode,
            customerName,
            email: dto.email?.toLowerCase?.() ?? null,
            phone: dto.phone ?? null,
            taxId: dto.taxId ?? null,
            pan: dto.pan?.toUpperCase?.() ?? null,
            street: dto.street ?? null,
            city: dto.city ?? null,
            state: dto.state ?? null,
            postalCode: dto.postalCode ?? null,
            country: dto.country ?? null,
            shopId,
            isActive: dto.isActive ?? true,
            createdById: user.id,
          },
          include: { shop: true },
        });
      });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002' &&
        attemptedCode
      ) {
        const existingByCode = await this.prisma.customer.findFirst({
          where: { shopId, customerCode: attemptedCode },
          select: { customerName: true, customerCode: true },
        });
        if (existingByCode) {
          throw new ConflictException(this.duplicateCustomerMessage(existingByCode, 'code'));
        }
      }
      throw error;
    }
  }

  async get(user: RequestUser, id: string) {
    const item = await this.prisma.customer.findUnique({ where: { id }, include: { shop: true } });
    if (!item) throw new NotFoundException('Customer not found');
    await verifyShopInTenant(this.prisma, user, item.shopId);
    return item;
  }

  async update(user: RequestUser, id: string, dto: UpdateCustomerDto) {
    const existing = await this.get(user, id);
    if (dto.shopId) await verifyShopInTenant(this.prisma, user, dto.shopId);
    return this.prisma.customer.update({
      where: { id },
      data: {
        customerName: dto.customerName,
        email: dto.email?.toLowerCase?.(),
        phone: dto.phone,
        taxId: dto.taxId,
        pan: dto.pan?.toUpperCase?.(),
        street: dto.street,
        city: dto.city,
        state: dto.state,
        postalCode: dto.postalCode,
        country: dto.country,
        shopId: dto.shopId ?? existing.shopId,
        isActive: dto.isActive,
        updatedById: user.id,
      },
      include: { shop: true },
    });
  }
}

