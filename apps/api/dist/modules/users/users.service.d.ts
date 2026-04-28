import { PrismaService } from '../../prisma/prisma.service';
export declare class UsersService {
    private readonly prisma;
    constructor(prisma: PrismaService);
    private normalizeRoleName;
    private resolveRoleId;
    listRoles(): Promise<{
        permissions: import("@prisma/client/runtime/library").JsonValue;
        name: import(".prisma/client").$Enums.RoleName;
        id: string;
        createdAt: Date;
        updatedAt: Date;
        createdById: string | null;
        updatedById: string | null;
    }[]>;
    updateRolePermissions(roleName: string, permissions: string[]): Promise<{
        permissions: import("@prisma/client/runtime/library").JsonValue;
        name: import(".prisma/client").$Enums.RoleName;
        id: string;
        createdAt: Date;
        updatedAt: Date;
        createdById: string | null;
        updatedById: string | null;
    }>;
    list(): Promise<({
        role: {
            permissions: import("@prisma/client/runtime/library").JsonValue;
            name: import(".prisma/client").$Enums.RoleName;
            id: string;
            createdAt: Date;
            updatedAt: Date;
            createdById: string | null;
            updatedById: string | null;
        };
        shop: {
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
        } | null;
    } & {
        shopId: string | null;
        email: string;
        name: string;
        id: string;
        passwordHash: string;
        avatarUrl: string | null;
        roleId: string;
        isActive: boolean;
        lastLoginAt: Date | null;
        refreshTokenHash: string | null;
        createdAt: Date;
        updatedAt: Date;
        createdById: string | null;
        updatedById: string | null;
    })[]>;
    create(dto: {
        name: string;
        email: string;
        password: string;
        roleId: string;
        shopId?: string;
        isActive?: boolean;
    }): Promise<{
        role: {
            permissions: import("@prisma/client/runtime/library").JsonValue;
            name: import(".prisma/client").$Enums.RoleName;
            id: string;
            createdAt: Date;
            updatedAt: Date;
            createdById: string | null;
            updatedById: string | null;
        };
        shop: {
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
        } | null;
    } & {
        shopId: string | null;
        email: string;
        name: string;
        id: string;
        passwordHash: string;
        avatarUrl: string | null;
        roleId: string;
        isActive: boolean;
        lastLoginAt: Date | null;
        refreshTokenHash: string | null;
        createdAt: Date;
        updatedAt: Date;
        createdById: string | null;
        updatedById: string | null;
    }>;
    get(id: string): Promise<{
        role: {
            permissions: import("@prisma/client/runtime/library").JsonValue;
            name: import(".prisma/client").$Enums.RoleName;
            id: string;
            createdAt: Date;
            updatedAt: Date;
            createdById: string | null;
            updatedById: string | null;
        };
        shop: {
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
        } | null;
    } & {
        shopId: string | null;
        email: string;
        name: string;
        id: string;
        passwordHash: string;
        avatarUrl: string | null;
        roleId: string;
        isActive: boolean;
        lastLoginAt: Date | null;
        refreshTokenHash: string | null;
        createdAt: Date;
        updatedAt: Date;
        createdById: string | null;
        updatedById: string | null;
    }>;
    update(id: string, dto: Partial<{
        name: string;
        email: string;
        password: string;
        roleId: string;
        shopId: string | null;
        isActive: boolean;
    }>): Promise<{
        role: {
            permissions: import("@prisma/client/runtime/library").JsonValue;
            name: import(".prisma/client").$Enums.RoleName;
            id: string;
            createdAt: Date;
            updatedAt: Date;
            createdById: string | null;
            updatedById: string | null;
        };
        shop: {
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
        } | null;
    } & {
        shopId: string | null;
        email: string;
        name: string;
        id: string;
        passwordHash: string;
        avatarUrl: string | null;
        roleId: string;
        isActive: boolean;
        lastLoginAt: Date | null;
        refreshTokenHash: string | null;
        createdAt: Date;
        updatedAt: Date;
        createdById: string | null;
        updatedById: string | null;
    }>;
    remove(id: string): Promise<{
        ok: boolean;
    }>;
}
