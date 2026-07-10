import { ConfigService } from '@nestjs/config';
import { MailService } from '../../common/mail/mail.service';
import type { RequestUser } from '../../common/types/request-user';
import { PrismaService } from '../../prisma/prisma.service';
import { type ResolvedTenantSender } from './email-sender.constants';
import type { ConfigureSenderSmtpDto, CreateEmailSenderDto, UpdateEmailSenderDto } from './dto/email-sender.dto';
export declare class EmailSenderService {
    private readonly prisma;
    private readonly mail;
    private readonly config;
    constructor(prisma: PrismaService, mail: MailService, config: ConfigService);
    private assertOrgAdmin;
    private companyId;
    private hashOtp;
    private platformFromEmail;
    private buildDkimRecord;
    ensureDefaultSender(companyId: string): Promise<void>;
    listSenders(user: RequestUser): Promise<{
        platform: {
            configured: boolean;
            from: string;
            replyTo: string;
            bcc: string;
            guidance: string;
        };
        companyName: string;
        customDomains: {
            id: string;
            domain: string;
            status: import(".prisma/client").$Enums.EmailSenderStatus;
            verifiedAt: Date | null;
            dkimHost: string;
            dkimValue: string;
            senders: {
                id: string;
                displayName: string;
                email: string;
                senderType: import(".prisma/client").$Enums.EmailSenderType;
                isPrimary: boolean;
                status: import(".prisma/client").$Enums.EmailSenderStatus;
                verifiedAt: Date | null;
                domainId: string | null;
                smtpConfigured: boolean;
                smtpLastVerifiedAt: Date | null;
                smtpRequired: boolean;
                isPublicDomain: boolean;
            }[];
        }[];
        publicSenders: {
            id: string;
            displayName: string;
            email: string;
            senderType: import(".prisma/client").$Enums.EmailSenderType;
            isPrimary: boolean;
            status: import(".prisma/client").$Enums.EmailSenderStatus;
            verifiedAt: Date | null;
            domainId: string | null;
            smtpConfigured: boolean;
            smtpLastVerifiedAt: Date | null;
            smtpRequired: boolean;
            isPublicDomain: boolean;
        }[];
        primarySenderId: string | null;
    }>;
    private toSenderDto;
    private decryptSmtpPassword;
    private buildSmtpConfig;
    private assertSenderSmtpReady;
    createSender(user: RequestUser, dto: CreateEmailSenderDto): Promise<{
        id: string;
        displayName: string;
        email: string;
        senderType: import(".prisma/client").$Enums.EmailSenderType;
        isPrimary: boolean;
        status: import(".prisma/client").$Enums.EmailSenderStatus;
        verifiedAt: Date | null;
        domainId: string | null;
        smtpConfigured: boolean;
        smtpLastVerifiedAt: Date | null;
        smtpRequired: boolean;
        isPublicDomain: boolean;
    }>;
    updateSender(user: RequestUser, senderId: string, dto: UpdateEmailSenderDto): Promise<{
        id: string;
        displayName: string;
        email: string;
        senderType: import(".prisma/client").$Enums.EmailSenderType;
        isPrimary: boolean;
        status: import(".prisma/client").$Enums.EmailSenderStatus;
        verifiedAt: Date | null;
        domainId: string | null;
        smtpConfigured: boolean;
        smtpLastVerifiedAt: Date | null;
        smtpRequired: boolean;
        isPublicDomain: boolean;
    }>;
    deleteSender(user: RequestUser, senderId: string): Promise<{
        deleted: boolean;
    }>;
    getDomainDkim(user: RequestUser, domainName: string): Promise<{
        domain: string;
        status: import(".prisma/client").$Enums.EmailSenderStatus;
        dkimHost: string;
        dkimValue: string;
        guidance: string;
    }>;
    private txtRecordsMatch;
    validateDomain(user: RequestUser, domainName: string): Promise<{
        domain: string;
        status: "VERIFIED";
        verifiedAt: Date;
    }>;
    sendVerificationOtp(user: RequestUser, senderId: string): Promise<{
        sent: boolean;
        expiresAt: Date;
    }>;
    verifySenderOtp(user: RequestUser, senderId: string, otpCode: string): Promise<{
        id: string;
        displayName: string;
        email: string;
        senderType: import(".prisma/client").$Enums.EmailSenderType;
        isPrimary: boolean;
        status: import(".prisma/client").$Enums.EmailSenderStatus;
        verifiedAt: Date | null;
        domainId: string | null;
        smtpConfigured: boolean;
        smtpLastVerifiedAt: Date | null;
        smtpRequired: boolean;
        isPublicDomain: boolean;
    }>;
    configureSenderSmtp(user: RequestUser, senderId: string, dto: ConfigureSenderSmtpDto): Promise<{
        id: string;
        displayName: string;
        email: string;
        senderType: import(".prisma/client").$Enums.EmailSenderType;
        isPrimary: boolean;
        status: import(".prisma/client").$Enums.EmailSenderStatus;
        verifiedAt: Date | null;
        domainId: string | null;
        smtpConfigured: boolean;
        smtpLastVerifiedAt: Date | null;
        smtpRequired: boolean;
        isPublicDomain: boolean;
    }>;
    testSenderSmtp(user: RequestUser, senderId: string, dto?: ConfigureSenderSmtpDto): Promise<{
        ok: boolean;
        testedAt: Date;
        to: string;
    }>;
    resolveTenantSender(companyId: string): Promise<ResolvedTenantSender>;
    hasVerifiedPrimarySender(companyId: string): Promise<boolean>;
}
