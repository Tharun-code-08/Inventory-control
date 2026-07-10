import type { RequestUser } from '../../common/types/request-user';
import { ConfigureSenderSmtpDto, CreateEmailSenderDto, UpdateEmailSenderDto, VerifySenderOtpDto } from './dto/email-sender.dto';
import { EmailSenderService } from './email-sender.service';
export declare class EmailSenderController {
    private readonly emailSenders;
    constructor(emailSenders: EmailSenderService);
    list(user: RequestUser): Promise<{
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
    create(user: RequestUser, dto: CreateEmailSenderDto): Promise<{
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
    update(user: RequestUser, id: string, dto: UpdateEmailSenderDto): Promise<{
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
    remove(user: RequestUser, id: string): Promise<{
        deleted: boolean;
    }>;
    getDkim(user: RequestUser, domain: string): Promise<{
        domain: string;
        status: import(".prisma/client").$Enums.EmailSenderStatus;
        dkimHost: string;
        dkimValue: string;
        guidance: string;
    }>;
    validateDomain(user: RequestUser, domain: string): Promise<{
        domain: string;
        status: "VERIFIED";
        verifiedAt: Date;
    }>;
    sendVerification(user: RequestUser, id: string): Promise<{
        sent: boolean;
        expiresAt: Date;
    }>;
    verifyOtp(user: RequestUser, id: string, dto: VerifySenderOtpDto): Promise<{
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
    configureSmtp(user: RequestUser, id: string, dto: ConfigureSenderSmtpDto): Promise<{
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
    testSmtp(user: RequestUser, id: string, dto: ConfigureSenderSmtpDto): Promise<{
        ok: boolean;
        testedAt: Date;
        to: string;
    }>;
    verifySavedSmtp(user: RequestUser, id: string): Promise<{
        ok: boolean;
        testedAt: Date;
        to: string;
    }>;
}
