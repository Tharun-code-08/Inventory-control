import type { RequestUser } from '../../common/types/request-user';
import { CreateStorageLocationDto } from './dto/create-storage-location.dto';
import { UpdateStorageLocationDto } from './dto/update-storage-location.dto';
import { StorageLocationsService } from './storage-locations.service';
export declare class StorageLocationsController {
    private readonly storageLocations;
    constructor(storageLocations: StorageLocationsService);
    list(user: RequestUser, shopId?: string): Promise<({
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
        name: string;
        code: string;
        description: string | null;
    })[]>;
    create(user: RequestUser, dto: CreateStorageLocationDto): Promise<{
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
        name: string;
        code: string;
        description: string | null;
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
        name: string;
        code: string;
        description: string | null;
    }>;
    update(user: RequestUser, id: string, dto: UpdateStorageLocationDto): Promise<{
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
        name: string;
        code: string;
        description: string | null;
    }>;
    remove(user: RequestUser, id: string): Promise<{
        shopId: string;
        id: string;
        isActive: boolean;
        createdAt: Date;
        updatedAt: Date;
        createdById: string | null;
        updatedById: string | null;
        name: string;
        code: string;
        description: string | null;
    }>;
}
