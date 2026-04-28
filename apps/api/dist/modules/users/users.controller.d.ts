import { CreateUserDto } from './dto/create-user.dto';
import { UpdateRolePermissionsDto } from './dto/update-role-permissions.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { UsersService } from './users.service';
export declare class UsersController {
    private readonly users;
    constructor(users: UsersService);
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
    listRoles(): Promise<{
        permissions: import("@prisma/client/runtime/library").JsonValue;
        name: import(".prisma/client").$Enums.RoleName;
        id: string;
        createdAt: Date;
        updatedAt: Date;
        createdById: string | null;
        updatedById: string | null;
    }[]>;
    updateRolePermissions(roleName: string, dto: UpdateRolePermissionsDto): Promise<{
        permissions: import("@prisma/client/runtime/library").JsonValue;
        name: import(".prisma/client").$Enums.RoleName;
        id: string;
        createdAt: Date;
        updatedAt: Date;
        createdById: string | null;
        updatedById: string | null;
    }>;
    create(dto: CreateUserDto): Promise<{
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
    update(id: string, dto: UpdateUserDto): Promise<{
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
