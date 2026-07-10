import { PrismaService } from '../../prisma/prisma.service';
import type { RequestUser } from '../../common/types/request-user';
import { DocumentNumberService } from '../stock/document-number.service';
import { CreateCustomerDto } from './dto/create-customer.dto';
import { UpdateCustomerDto } from './dto/update-customer.dto';
export declare class CustomersService {
    private readonly prisma;
    private readonly numbers;
    constructor(prisma: PrismaService, numbers: DocumentNumberService);
    list(user: RequestUser, query?: {
        search?: string;
        cursor?: string;
        take?: number;
    }): Promise<{
        data: {
            shopId: string;
            id: string;
            isActive: boolean;
            email: string | null;
            phone: string | null;
            taxId: string | null;
            street: string | null;
            city: string | null;
            state: string | null;
            postalCode: string | null;
            country: string | null;
            customerCode: string;
            customerName: string;
            pan: string | null;
        }[];
        meta: {
            nextCursor: string | null;
            limit: number;
            hasMore: boolean;
        };
    }>;
    private throwCustomerDuplicate;
    create(user: RequestUser, dto: CreateCustomerDto): Promise<{
        shop: {
            id: string;
            address: string;
            brandingProfileId: string | null;
            isActive: boolean;
            createdAt: Date;
            updatedAt: Date;
            createdById: string | null;
            updatedById: string | null;
            email: string;
            companyId: string | null;
            shopNumber: string;
            shopName: string;
            taxId: string | null;
            contactPerson: string;
            mobile: string;
            costingMethod: import(".prisma/client").$Enums.CostingMethod;
            functionalCurrency: string;
        };
    } & {
        shopId: string;
        id: string;
        isActive: boolean;
        createdAt: Date;
        updatedAt: Date;
        createdById: string | null;
        updatedById: string | null;
        email: string | null;
        phone: string | null;
        taxId: string | null;
        street: string | null;
        city: string | null;
        state: string | null;
        postalCode: string | null;
        country: string | null;
        customerCode: string;
        customerName: string;
        pan: string | null;
    }>;
    get(user: RequestUser, id: string): Promise<{
        shop: {
            id: string;
            address: string;
            brandingProfileId: string | null;
            isActive: boolean;
            createdAt: Date;
            updatedAt: Date;
            createdById: string | null;
            updatedById: string | null;
            email: string;
            companyId: string | null;
            shopNumber: string;
            shopName: string;
            taxId: string | null;
            contactPerson: string;
            mobile: string;
            costingMethod: import(".prisma/client").$Enums.CostingMethod;
            functionalCurrency: string;
        };
    } & {
        shopId: string;
        id: string;
        isActive: boolean;
        createdAt: Date;
        updatedAt: Date;
        createdById: string | null;
        updatedById: string | null;
        email: string | null;
        phone: string | null;
        taxId: string | null;
        street: string | null;
        city: string | null;
        state: string | null;
        postalCode: string | null;
        country: string | null;
        customerCode: string;
        customerName: string;
        pan: string | null;
    }>;
    update(user: RequestUser, id: string, dto: UpdateCustomerDto): Promise<{
        shop: {
            id: string;
            address: string;
            brandingProfileId: string | null;
            isActive: boolean;
            createdAt: Date;
            updatedAt: Date;
            createdById: string | null;
            updatedById: string | null;
            email: string;
            companyId: string | null;
            shopNumber: string;
            shopName: string;
            taxId: string | null;
            contactPerson: string;
            mobile: string;
            costingMethod: import(".prisma/client").$Enums.CostingMethod;
            functionalCurrency: string;
        };
    } & {
        shopId: string;
        id: string;
        isActive: boolean;
        createdAt: Date;
        updatedAt: Date;
        createdById: string | null;
        updatedById: string | null;
        email: string | null;
        phone: string | null;
        taxId: string | null;
        street: string | null;
        city: string | null;
        state: string | null;
        postalCode: string | null;
        country: string | null;
        customerCode: string;
        customerName: string;
        pan: string | null;
    }>;
}
