import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../../prisma/prisma.service';
import { LoginDto } from './dto/login.dto';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { UpdatePasswordDto } from './dto/update-password.dto';
export declare class AuthService {
    private readonly prisma;
    private readonly jwt;
    private readonly config;
    constructor(prisma: PrismaService, jwt: JwtService, config: ConfigService);
    private toSessionUser;
    login(dto: LoginDto): Promise<{
        accessToken: string;
        refreshCookieValue: string;
        user: {
            id: string;
            name: string;
            email: string;
            role: string;
            shopId: string | null;
            permissions: string[];
            avatarUrl: string | null;
            shop: {
                id: string;
                shopNumber: string;
                shopName: string;
                address: string;
                contactPerson: string;
                mobile: string;
                email: string;
                isActive: boolean;
            } | null;
        };
    }>;
    refreshFromToken(refreshToken: string | undefined): Promise<{
        accessToken: string;
        refreshCookieValue: string;
        user: {
            id: string;
            name: string;
            email: string;
            role: string;
            shopId: string | null;
            permissions: string[];
            avatarUrl: string | null;
            shop: {
                id: string;
                shopNumber: string;
                shopName: string;
                address: string;
                contactPerson: string;
                mobile: string;
                email: string;
                isActive: boolean;
            } | null;
        };
    }>;
    logout(userId: string): Promise<void>;
    me(userId: string): Promise<{
        id: string;
        name: string;
        email: string;
        role: string;
        shopId: string | null;
        permissions: string[];
        avatarUrl: string | null;
        shop: {
            id: string;
            shopNumber: string;
            shopName: string;
            address: string;
            contactPerson: string;
            mobile: string;
            email: string;
            isActive: boolean;
        } | null;
    }>;
    updateProfile(userId: string, dto: UpdateProfileDto, avatar?: Express.Multer.File): Promise<{
        id: string;
        name: string;
        email: string;
        role: string;
        shopId: string | null;
        permissions: string[];
        avatarUrl: string | null;
        shop: {
            id: string;
            shopNumber: string;
            shopName: string;
            address: string;
            contactPerson: string;
            mobile: string;
            email: string;
            isActive: boolean;
        } | null;
    }>;
    updatePassword(userId: string, dto: UpdatePasswordDto): Promise<{
        ok: boolean;
    }>;
}
