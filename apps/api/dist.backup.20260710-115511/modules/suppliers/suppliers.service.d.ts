import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { MailService } from '../../common/mail/mail.service';
import { PrismaService } from '../../prisma/prisma.service';
import type { RequestUser } from '../../common/types/request-user';
import { CreateSupplierDto } from './dto/create-supplier.dto';
import { UpdateSupplierDto } from './dto/update-supplier.dto';
export declare class SuppliersService {
    private readonly prisma;
    private readonly mail;
    private readonly jwt;
    private readonly config;
    constructor(prisma: PrismaService, mail: MailService, jwt: JwtService, config: ConfigService);
    list(user: RequestUser, query: {
        search?: string;
        is_active?: boolean;
        cursor?: string;
        take?: number;
    }): Promise<{
        data: {
            id: string;
            isActive: boolean;
            email: string | null;
            phone: string | null;
            companyId: string | null;
            taxId: string | null;
            contactPerson: string | null;
            supplierCode: string;
            supplierName: string;
            vatNumber: string | null;
            rating: number;
            categories: string[];
            street: string | null;
            city: string | null;
            state: string | null;
            postalCode: string | null;
            country: string | null;
            paymentTerms: string | null;
            bankName: string | null;
            accountNumber: string | null;
            routingNumber: string | null;
            iban: string | null;
        }[];
        meta: {
            nextCursor: string | null;
            limit: number;
            hasMore: boolean;
        };
    }>;
    create(user: RequestUser, dto: CreateSupplierDto): Promise<{
        company: {
            id: string;
            companyCode: string;
            companyName: string;
            address: string | null;
            brandingProfileId: string | null;
            isActive: boolean;
            subscriptionPlan: import(".prisma/client").$Enums.SubscriptionPlan;
            billingCycle: import(".prisma/client").$Enums.BillingCycle | null;
            subscriptionStatus: import(".prisma/client").$Enums.SubscriptionStatus;
            trialStartsAt: Date | null;
            trialEndsAt: Date | null;
            subscriptionEndsAt: Date | null;
            platformMarketingOptOut: boolean;
            razorpaySubscriptionId: string | null;
            paidActivatedAt: Date | null;
            createdAt: Date;
            updatedAt: Date;
            createdById: string | null;
            updatedById: string | null;
        } | null;
    } & {
        deletedAt: Date | null;
        id: string;
        isActive: boolean;
        createdAt: Date;
        updatedAt: Date;
        createdById: string | null;
        updatedById: string | null;
        email: string | null;
        phone: string | null;
        companyId: string | null;
        taxId: string | null;
        contactPerson: string | null;
        supplierCode: string;
        supplierName: string;
        vatNumber: string | null;
        rating: number;
        categories: string[];
        street: string | null;
        city: string | null;
        state: string | null;
        postalCode: string | null;
        country: string | null;
        paymentTerms: string | null;
        bankName: string | null;
        accountNumber: string | null;
        routingNumber: string | null;
        iban: string | null;
    }>;
    get(user: RequestUser, id: string): Promise<{
        company: {
            id: string;
            companyCode: string;
            companyName: string;
            address: string | null;
            brandingProfileId: string | null;
            isActive: boolean;
            subscriptionPlan: import(".prisma/client").$Enums.SubscriptionPlan;
            billingCycle: import(".prisma/client").$Enums.BillingCycle | null;
            subscriptionStatus: import(".prisma/client").$Enums.SubscriptionStatus;
            trialStartsAt: Date | null;
            trialEndsAt: Date | null;
            subscriptionEndsAt: Date | null;
            platformMarketingOptOut: boolean;
            razorpaySubscriptionId: string | null;
            paidActivatedAt: Date | null;
            createdAt: Date;
            updatedAt: Date;
            createdById: string | null;
            updatedById: string | null;
        } | null;
    } & {
        deletedAt: Date | null;
        id: string;
        isActive: boolean;
        createdAt: Date;
        updatedAt: Date;
        createdById: string | null;
        updatedById: string | null;
        email: string | null;
        phone: string | null;
        companyId: string | null;
        taxId: string | null;
        contactPerson: string | null;
        supplierCode: string;
        supplierName: string;
        vatNumber: string | null;
        rating: number;
        categories: string[];
        street: string | null;
        city: string | null;
        state: string | null;
        postalCode: string | null;
        country: string | null;
        paymentTerms: string | null;
        bankName: string | null;
        accountNumber: string | null;
        routingNumber: string | null;
        iban: string | null;
    }>;
    update(user: RequestUser, id: string, dto: UpdateSupplierDto): Promise<{
        company: {
            id: string;
            companyCode: string;
            companyName: string;
            address: string | null;
            brandingProfileId: string | null;
            isActive: boolean;
            subscriptionPlan: import(".prisma/client").$Enums.SubscriptionPlan;
            billingCycle: import(".prisma/client").$Enums.BillingCycle | null;
            subscriptionStatus: import(".prisma/client").$Enums.SubscriptionStatus;
            trialStartsAt: Date | null;
            trialEndsAt: Date | null;
            subscriptionEndsAt: Date | null;
            platformMarketingOptOut: boolean;
            razorpaySubscriptionId: string | null;
            paidActivatedAt: Date | null;
            createdAt: Date;
            updatedAt: Date;
            createdById: string | null;
            updatedById: string | null;
        } | null;
    } & {
        deletedAt: Date | null;
        id: string;
        isActive: boolean;
        createdAt: Date;
        updatedAt: Date;
        createdById: string | null;
        updatedById: string | null;
        email: string | null;
        phone: string | null;
        companyId: string | null;
        taxId: string | null;
        contactPerson: string | null;
        supplierCode: string;
        supplierName: string;
        vatNumber: string | null;
        rating: number;
        categories: string[];
        street: string | null;
        city: string | null;
        state: string | null;
        postalCode: string | null;
        country: string | null;
        paymentTerms: string | null;
        bankName: string | null;
        accountNumber: string | null;
        routingNumber: string | null;
        iban: string | null;
    }>;
    getDeletionImpact(user: RequestUser, id: string): Promise<{
        supplier: {
            id: string;
            supplierName: string;
            supplierCode: string;
        };
        counts: {
            rfqInvitations: number;
            quotations: number;
            contracts: number;
            purchaseOrders: number;
        };
        linkedRfqs: {
            id: string;
            rfqNumber: string;
            title: string;
            status: import(".prisma/client").$Enums.DocumentStatus;
        }[];
        note: string;
    }>;
    private adminNotificationEmail;
    private createDeletionToken;
    private verifyDeletionToken;
    requestDeletion(user: RequestUser, id: string): Promise<{
        pending: boolean;
        adminEmail: string;
        impact: {
            supplier: {
                id: string;
                supplierName: string;
                supplierCode: string;
            };
            counts: {
                rfqInvitations: number;
                quotations: number;
                contracts: number;
                purchaseOrders: number;
            };
            linkedRfqs: {
                id: string;
                rfqNumber: string;
                title: string;
                status: import(".prisma/client").$Enums.DocumentStatus;
            }[];
            note: string;
        };
        message: string;
    }>;
    confirmDeletion(token: string): Promise<{
        success: boolean;
        alreadyDeleted: boolean;
        supplierName: string;
        supplierCode: string;
        message: string;
    }>;
    remove(user: RequestUser, id: string): Promise<{
        pending: boolean;
        adminEmail: string;
        impact: {
            supplier: {
                id: string;
                supplierName: string;
                supplierCode: string;
            };
            counts: {
                rfqInvitations: number;
                quotations: number;
                contracts: number;
                purchaseOrders: number;
            };
            linkedRfqs: {
                id: string;
                rfqNumber: string;
                title: string;
                status: import(".prisma/client").$Enums.DocumentStatus;
            }[];
            note: string;
        };
        message: string;
    }>;
}
