import { ConfigService } from '@nestjs/config';
import { Response, Request } from 'express';
import type { RequestUser } from '../../common/types/request-user';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { UpdatePasswordDto } from './dto/update-password.dto';
export declare class AuthController {
    private readonly auth;
    private readonly config;
    constructor(auth: AuthService, config: ConfigService);
    private cookieName;
    private refreshCookieOptions;
    login(dto: LoginDto, res: Response): Promise<{
        accessToken: string;
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
    refresh(req: Request, res: Response): Promise<{
        accessToken: string;
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
    logout(user: RequestUser, res: Response): Promise<{
        ok: boolean;
    }>;
    me(user: RequestUser): Promise<{
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
    updateProfile(user: RequestUser, dto: UpdateProfileDto, avatar?: Express.Multer.File): Promise<{
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
    updatePassword(user: RequestUser, dto: UpdatePasswordDto): Promise<{
        ok: boolean;
    }>;
}
