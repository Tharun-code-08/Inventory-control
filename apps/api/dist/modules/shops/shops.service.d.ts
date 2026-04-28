import { PrismaService } from '../../prisma/prisma.service';
import type { RequestUser } from '../../common/types/request-user';
import { CreateShopDto } from './dto/create-shop.dto';
import { UpdateShopDto } from './dto/update-shop.dto';
export declare class ShopsService {
    private readonly prisma;
    constructor(prisma: PrismaService);
    list(user: RequestUser, query: {
        is_active?: boolean;
        cursor?: string;
        take?: number;
    }): Promise<{
        data: ({
            company: {
                id: string;
                isActive: boolean;
                createdAt: Date;
                updatedAt: Date;
                createdById: string | null;
                updatedById: string | null;
                address: string | null;
                companyCode: string;
                companyName: string;
            } | null;
        } & {
            email: string;
            shopName: string;
            id: string;
            isActive: boolean;
            createdAt: Date;
            updatedAt: Date;
            createdById: string | null;
            updatedById: string | null;
            shopNumber: string;
            taxId: string | null;
            address: string;
            contactPerson: string;
            mobile: string;
            companyId: string | null;
        })[];
        meta: {
            nextCursor: string | null;
            limit: number;
            hasMore: boolean;
        };
    }>;
    create(user: RequestUser, dto: CreateShopDto): Promise<{
        company: {
            id: string;
            isActive: boolean;
            createdAt: Date;
            updatedAt: Date;
            createdById: string | null;
            updatedById: string | null;
            address: string | null;
            companyCode: string;
            companyName: string;
        } | null;
    } & {
        email: string;
        shopName: string;
        id: string;
        isActive: boolean;
        createdAt: Date;
        updatedAt: Date;
        createdById: string | null;
        updatedById: string | null;
        shopNumber: string;
        taxId: string | null;
        address: string;
        contactPerson: string;
        mobile: string;
        companyId: string | null;
    }>;
    get(user: RequestUser, id: string): Promise<{
        company: {
            id: string;
            isActive: boolean;
            createdAt: Date;
            updatedAt: Date;
            createdById: string | null;
            updatedById: string | null;
            address: string | null;
            companyCode: string;
            companyName: string;
        } | null;
    } & {
        email: string;
        shopName: string;
        id: string;
        isActive: boolean;
        createdAt: Date;
        updatedAt: Date;
        createdById: string | null;
        updatedById: string | null;
        shopNumber: string;
        taxId: string | null;
        address: string;
        contactPerson: string;
        mobile: string;
        companyId: string | null;
    }>;
    update(user: RequestUser, id: string, dto: UpdateShopDto): Promise<{
        company: {
            id: string;
            isActive: boolean;
            createdAt: Date;
            updatedAt: Date;
            createdById: string | null;
            updatedById: string | null;
            address: string | null;
            companyCode: string;
            companyName: string;
        } | null;
    } & {
        email: string;
        shopName: string;
        id: string;
        isActive: boolean;
        createdAt: Date;
        updatedAt: Date;
        createdById: string | null;
        updatedById: string | null;
        shopNumber: string;
        taxId: string | null;
        address: string;
        contactPerson: string;
        mobile: string;
        companyId: string | null;
    }>;
    softDelete(user: RequestUser, id: string): Promise<{
        email: string;
        shopName: string;
        id: string;
        isActive: boolean;
        createdAt: Date;
        updatedAt: Date;
        createdById: string | null;
        updatedById: string | null;
        shopNumber: string;
        taxId: string | null;
        address: string;
        contactPerson: string;
        mobile: string;
        companyId: string | null;
    }>;
}
