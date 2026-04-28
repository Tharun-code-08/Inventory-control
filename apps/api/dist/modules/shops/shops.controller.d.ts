import type { RequestUser } from '../../common/types/request-user';
import { CreateShopDto } from './dto/create-shop.dto';
import { UpdateShopDto } from './dto/update-shop.dto';
import { ShopsService } from './shops.service';
export declare class ShopsController {
    private readonly shops;
    constructor(shops: ShopsService);
    list(user: RequestUser, isActive?: string, cursor?: string, take?: string): Promise<{
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
    remove(user: RequestUser, id: string): Promise<{
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
