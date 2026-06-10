import { createHash, randomInt } from 'crypto';
import { promises as dns } from 'dns';
import {
  BadRequestException,
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
  forwardRef,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { EmailSenderStatus, EmailSenderType, RoleName } from '@prisma/client';
import { MailService } from '../../common/mail/mail.service';
import {
  senderVerificationOtpHtml,
  senderVerificationOtpSubject,
  senderVerificationOtpText,
} from '../../common/mail/sender-verification-otp.template';
import {
  decryptSecret,
  encryptSecret,
  getSmtpCredentialsKey,
} from '../../common/crypto/secret-cipher';
import type { RequestUser } from '../../common/types/request-user';
import { PrismaService } from '../../prisma/prisma.service';
import {
  isPublicEmailDomain,
  normalizeSenderEmail,
  parseEmailDomain,
  SENDER_OTP_EXPIRY_MINUTES,
  SENDER_OTP_MAX_ATTEMPTS,
  type ResolvedTenantSender,
  type SenderSmtpConfig,
} from './email-sender.constants';
import type {
  ConfigureSenderSmtpDto,
  CreateEmailSenderDto,
  UpdateEmailSenderDto,
} from './dto/email-sender.dto';

@Injectable()
export class EmailSenderService {
  constructor(
    private readonly prisma: PrismaService,
    @Inject(forwardRef(() => MailService))
    private readonly mail: MailService,
    private readonly config: ConfigService,
  ) {}

  private assertOrgAdmin(user: RequestUser) {
    if (user.role !== RoleName.OWNER && user.role !== RoleName.ADMIN) {
      throw new ForbiddenException('Only organization admins can manage sender emails');
    }
    if (!user.companyId) {
      throw new BadRequestException('Company context is required');
    }
  }

  private companyId(user: RequestUser): string {
    this.assertOrgAdmin(user);
    return user.companyId!;
  }

  private hashOtp(code: string): string {
    return createHash('sha256').update(code).digest('hex');
  }

  private platformFromEmail(): string {
    return (
      this.config.get<string>('MAIL_FROM') ??
      process.env.MAIL_FROM ??
      this.config.get<string>('SMTP_USER') ??
      process.env.SMTP_USER ??
      'office@softdigitconsulting.com'
    );
  }

  private buildDkimRecord(companyCode: string, domain: string) {
    const selector = `retailims-${companyCode.toLowerCase().replace(/[^a-z0-9]/g, '')}`.slice(0, 40);
    const token = createHash('sha256')
      .update(`${companyCode}:${domain}:retailims-sender-v1`)
      .digest('hex')
      .slice(0, 32);
    return {
      dkimSelector: selector,
      dkimHost: `${selector}._domainkey.${domain}`,
      dkimValue: `retailims-verification=${token}`,
    };
  }

  async ensureDefaultSender(companyId: string) {
    const count = await this.prisma.emailSenderIdentity.count({ where: { companyId } });
    if (count > 0) return;

    const company = await this.prisma.company.findUnique({
      where: { id: companyId },
      select: { companyCode: true, companyName: true },
    });
    if (!company) return;

    const admin = await this.prisma.user.findFirst({
      where: {
        isActive: true,
        role: { name: { in: [RoleName.OWNER, RoleName.ADMIN] } },
        shop: { companyId },
      },
      select: { email: true, name: true },
      orderBy: { createdAt: 'asc' },
    });

    const email = normalizeSenderEmail(admin?.email ?? 'office@softdigitconsulting.com');
    const domain = parseEmailDomain(email);
    const senderType = isPublicEmailDomain(domain) ? EmailSenderType.PUBLIC_DOMAIN : EmailSenderType.CUSTOM_DOMAIN;

    let domainId: string | undefined;
    if (senderType === EmailSenderType.CUSTOM_DOMAIN && domain) {
      const dkim = this.buildDkimRecord(company.companyCode, domain);
      const row = await this.prisma.emailSenderDomain.upsert({
        where: { companyId_domain: { companyId, domain } },
        update: {},
        create: { companyId, domain, ...dkim },
      });
      domainId = row.id;
    }

    await this.prisma.emailSenderIdentity.create({
      data: {
        companyId,
        domainId,
        displayName: admin?.name ?? company.companyName,
        email,
        senderType,
        isPrimary: true,
        status: EmailSenderStatus.PENDING,
      },
    });
  }

  async listSenders(user: RequestUser) {
    const companyId = this.companyId(user);
    await this.ensureDefaultSender(companyId);

    const [company, domains, senders] = await Promise.all([
      this.prisma.company.findUnique({
        where: { id: companyId },
        select: { companyName: true, companyCode: true },
      }),
      this.prisma.emailSenderDomain.findMany({
        where: { companyId },
        orderBy: { domain: 'asc' },
      }),
      this.prisma.emailSenderIdentity.findMany({
        where: { companyId },
        orderBy: [{ isPrimary: 'desc' }, { email: 'asc' }],
      }),
    ]);

    const platformFrom = this.platformFromEmail();
    const replyTo =
      this.config.get<string>('MAIL_REPLY_TO') ?? process.env.MAIL_REPLY_TO ?? platformFrom;
    const bcc = this.config.get<string>('MAIL_BCC') ?? process.env.MAIL_BCC ?? '';

    const customDomainSenders = senders.filter((s) => s.senderType === EmailSenderType.CUSTOM_DOMAIN);
    const publicDomainSenders = senders.filter((s) => s.senderType === EmailSenderType.PUBLIC_DOMAIN);

    return {
      platform: {
        configured: this.mail.isConfigured(),
        from: platformFrom,
        replyTo,
        bcc,
        guidance:
          'Platform emails (signup, password reset) use this mailbox. Business emails send from your verified primary sender via its own SMTP settings.',
      },
      companyName: company?.companyName ?? 'Company',
      customDomains: domains.map((domain) => ({
        id: domain.id,
        domain: domain.domain,
        status: domain.status,
        verifiedAt: domain.verifiedAt,
        dkimHost: domain.dkimHost,
        dkimValue: domain.dkimValue,
        senders: customDomainSenders
          .filter((sender) => sender.domainId === domain.id)
          .map((sender) => this.toSenderDto(sender)),
      })),
      publicSenders: publicDomainSenders.map((sender) => this.toSenderDto(sender)),
      primarySenderId: senders.find((s) => s.isPrimary)?.id ?? null,
    };
  }

  private toSenderDto(sender: {
    id: string;
    displayName: string;
    email: string;
    senderType: EmailSenderType;
    isPrimary: boolean;
    status: EmailSenderStatus;
    verifiedAt: Date | null;
    domainId: string | null;
    smtpHost?: string | null;
    smtpLastVerifiedAt?: Date | null;
  }) {
    const smtpConfigured = Boolean(sender.smtpHost && sender.smtpLastVerifiedAt);
    return {
      id: sender.id,
      displayName: sender.displayName,
      email: sender.email,
      senderType: sender.senderType,
      isPrimary: sender.isPrimary,
      status: sender.status,
      verifiedAt: sender.verifiedAt,
      domainId: sender.domainId,
      smtpConfigured,
      smtpLastVerifiedAt: sender.smtpLastVerifiedAt ?? null,
      smtpRequired: sender.status === EmailSenderStatus.VERIFIED && !smtpConfigured,
      isPublicDomain: isPublicEmailDomain(parseEmailDomain(sender.email)),
    };
  }

  private decryptSmtpPassword(encrypted: string | null | undefined): string | null {
    if (!encrypted) return null;
    try {
      return decryptSecret(encrypted, getSmtpCredentialsKey());
    } catch {
      return null;
    }
  }

  private buildSmtpConfig(sender: {
    smtpHost: string | null;
    smtpPort: number | null;
    smtpSecure: boolean | null;
    smtpUser: string | null;
    smtpPasswordEnc: string | null;
  }): SenderSmtpConfig | null {
    const password = this.decryptSmtpPassword(sender.smtpPasswordEnc);
    if (!sender.smtpHost || !sender.smtpPort || !sender.smtpUser || !password) return null;
    return {
      host: sender.smtpHost,
      port: sender.smtpPort,
      secure: sender.smtpSecure ?? false,
      user: sender.smtpUser,
      password,
    };
  }

  private assertSenderSmtpReady(sender: {
    status: EmailSenderStatus;
    smtpHost: string | null;
    smtpPort: number | null;
    smtpSecure: boolean | null;
    smtpUser: string | null;
    smtpPasswordEnc: string | null;
    smtpLastVerifiedAt: Date | null;
  }) {
    if (sender.status !== EmailSenderStatus.VERIFIED) {
      throw new BadRequestException('Verify this sender before configuring SMTP.');
    }
    if (!this.buildSmtpConfig(sender) || !sender.smtpLastVerifiedAt) {
      throw new BadRequestException(
        'Configure and test SMTP for this sender in Settings > Email Notifications > Sender Email.',
      );
    }
  }

  async createSender(user: RequestUser, dto: CreateEmailSenderDto) {
    const companyId = this.companyId(user);
    const email = normalizeSenderEmail(dto.email);
    const domain = parseEmailDomain(email);
    if (!domain) throw new BadRequestException('Invalid email address');

    const company = await this.prisma.company.findUniqueOrThrow({
      where: { id: companyId },
      select: { companyCode: true },
    });

    const senderType = isPublicEmailDomain(domain)
      ? EmailSenderType.PUBLIC_DOMAIN
      : EmailSenderType.CUSTOM_DOMAIN;

    const existing = await this.prisma.emailSenderIdentity.findUnique({
      where: { companyId_email: { companyId, email } },
    });
    if (existing) throw new BadRequestException('Sender email already exists');

    let domainId: string | null = null;
    if (senderType === EmailSenderType.CUSTOM_DOMAIN) {
      const dkim = this.buildDkimRecord(company.companyCode, domain);
      const domainRow = await this.prisma.emailSenderDomain.upsert({
        where: { companyId_domain: { companyId, domain } },
        update: {},
        create: { companyId, domain, ...dkim },
      });
      domainId = domainRow.id;
    }

    const hasPrimary = await this.prisma.emailSenderIdentity.count({
      where: { companyId, isPrimary: true },
    });

    const sender = await this.prisma.emailSenderIdentity.create({
      data: {
        companyId,
        domainId,
        displayName: dto.displayName.trim(),
        email,
        senderType,
        isPrimary: hasPrimary === 0,
        status: EmailSenderStatus.PENDING,
      },
    });

    return this.toSenderDto(sender);
  }

  async updateSender(user: RequestUser, senderId: string, dto: UpdateEmailSenderDto) {
    const companyId = this.companyId(user);
    const sender = await this.prisma.emailSenderIdentity.findFirst({
      where: { id: senderId, companyId },
    });
    if (!sender) throw new NotFoundException('Sender not found');

    if (dto.isPrimary) {
      this.assertSenderSmtpReady(sender);
    }

    return this.prisma.$transaction(async (tx) => {
      if (dto.isPrimary) {
        await tx.emailSenderIdentity.updateMany({
          where: { companyId, isPrimary: true },
          data: { isPrimary: false },
        });
      }

      const updated = await tx.emailSenderIdentity.update({
        where: { id: senderId },
        data: {
          displayName: dto.displayName?.trim(),
          isPrimary: dto.isPrimary ?? undefined,
        },
      });
      return this.toSenderDto(updated);
    });
  }

  async deleteSender(user: RequestUser, senderId: string) {
    const companyId = this.companyId(user);
    const sender = await this.prisma.emailSenderIdentity.findFirst({
      where: { id: senderId, companyId },
    });
    if (!sender) throw new NotFoundException('Sender not found');

    const verifiedCount = await this.prisma.emailSenderIdentity.count({
      where: { companyId, status: EmailSenderStatus.VERIFIED },
    });
    if (sender.status === EmailSenderStatus.VERIFIED && verifiedCount <= 1) {
      throw new BadRequestException('Cannot delete the only verified sender');
    }

    await this.prisma.emailSenderIdentity.delete({ where: { id: senderId } });

    if (sender.isPrimary) {
      const next = await this.prisma.emailSenderIdentity.findFirst({
        where: { companyId },
        orderBy: [{ status: 'asc' }, { createdAt: 'asc' }],
      });
      if (next) {
        await this.prisma.emailSenderIdentity.update({
          where: { id: next.id },
          data: { isPrimary: true },
        });
      }
    }

    return { deleted: true };
  }

  async getDomainDkim(user: RequestUser, domainName: string) {
    const companyId = this.companyId(user);
    const domain = domainName.toLowerCase().trim();
    const company = await this.prisma.company.findUniqueOrThrow({
      where: { id: companyId },
      select: { companyCode: true },
    });

    const dkim = this.buildDkimRecord(company.companyCode, domain);
    const row = await this.prisma.emailSenderDomain.upsert({
      where: { companyId_domain: { companyId, domain } },
      update: dkim,
      create: { companyId, domain, ...dkim },
    });

    return {
      domain: row.domain,
      status: row.status,
      dkimHost: row.dkimHost,
      dkimValue: row.dkimValue,
      guidance:
        'Add this TXT record at your DNS provider, then click Validate. DNS changes can take up to 24 hours to propagate.',
    };
  }

  private async txtRecordsMatch(host: string, expectedValue: string): Promise<boolean> {
    try {
      const records = await dns.resolveTxt(host);
      const flat = records.map((chunks) => chunks.join('')).map((v) => v.trim());
      return flat.some((value) => value === expectedValue || value.includes(expectedValue));
    } catch {
      return false;
    }
  }

  async validateDomain(user: RequestUser, domainName: string) {
    const companyId = this.companyId(user);
    const domain = domainName.toLowerCase().trim();
    const row = await this.prisma.emailSenderDomain.findUnique({
      where: { companyId_domain: { companyId, domain } },
    });
    if (!row) throw new NotFoundException('Domain not found');

    const matched = await this.txtRecordsMatch(row.dkimHost, row.dkimValue);
    const now = new Date();

    if (!matched) {
      await this.prisma.emailSenderDomain.update({
        where: { id: row.id },
        data: { status: EmailSenderStatus.FAILED, lastCheckedAt: now },
      });
      throw new BadRequestException(
        'DNS TXT record not found yet. Add the record at your DNS provider and try again after propagation.',
      );
    }

    await this.prisma.$transaction([
      this.prisma.emailSenderDomain.update({
        where: { id: row.id },
        data: { status: EmailSenderStatus.VERIFIED, verifiedAt: now, lastCheckedAt: now },
      }),
      this.prisma.emailSenderIdentity.updateMany({
        where: { companyId, domainId: row.id, senderType: EmailSenderType.CUSTOM_DOMAIN },
        data: { status: EmailSenderStatus.VERIFIED, verifiedAt: now },
      }),
    ]);

    return { domain, status: EmailSenderStatus.VERIFIED, verifiedAt: now };
  }

  async sendVerificationOtp(user: RequestUser, senderId: string) {
    const companyId = this.companyId(user);
    const sender = await this.prisma.emailSenderIdentity.findFirst({
      where: { id: senderId, companyId },
      include: { company: { select: { companyName: true } } },
    });
    if (!sender) throw new NotFoundException('Sender not found');
    if (sender.senderType !== EmailSenderType.PUBLIC_DOMAIN) {
      throw new BadRequestException('OTP verification applies only to public-domain senders');
    }
    if (!this.mail.isConfigured()) {
      throw new BadRequestException('Platform SMTP is not configured for verification emails.');
    }

    const otpCode = String(randomInt(100000, 999999));
    const expiresAt = new Date(Date.now() + SENDER_OTP_EXPIRY_MINUTES * 60 * 1000);

    await this.prisma.emailSenderVerification.create({
      data: {
        senderId: sender.id,
        otpHash: this.hashOtp(otpCode),
        expiresAt,
      },
    });

    await this.mail.sendPlatformMail({
      to: sender.email,
      subject: senderVerificationOtpSubject(sender.company.companyName),
      text: senderVerificationOtpText({
        displayName: sender.displayName,
        email: sender.email,
        otpCode,
        expiresMinutes: SENDER_OTP_EXPIRY_MINUTES,
        companyName: sender.company.companyName,
      }),
      html: senderVerificationOtpHtml({
        displayName: sender.displayName,
        email: sender.email,
        otpCode,
        expiresMinutes: SENDER_OTP_EXPIRY_MINUTES,
        companyName: sender.company.companyName,
      }),
    });

    return { sent: true, expiresAt };
  }

  async verifySenderOtp(user: RequestUser, senderId: string, otpCode: string) {
    const companyId = this.companyId(user);
    const sender = await this.prisma.emailSenderIdentity.findFirst({
      where: { id: senderId, companyId },
    });
    if (!sender) throw new NotFoundException('Sender not found');
    if (sender.senderType !== EmailSenderType.PUBLIC_DOMAIN) {
      throw new BadRequestException('OTP verification applies only to public-domain senders');
    }

    const verification = await this.prisma.emailSenderVerification.findFirst({
      where: {
        senderId,
        consumedAt: null,
        expiresAt: { gt: new Date() },
      },
      orderBy: { createdAt: 'desc' },
    });
    if (!verification) throw new BadRequestException('Verification code expired. Resend email and try again.');
    if (verification.attemptCount >= SENDER_OTP_MAX_ATTEMPTS) {
      throw new BadRequestException('Too many attempts. Resend verification email.');
    }

    const valid = verification.otpHash === this.hashOtp(otpCode);
    if (!valid) {
      await this.prisma.emailSenderVerification.update({
        where: { id: verification.id },
        data: { attemptCount: { increment: 1 } },
      });
      throw new BadRequestException('Invalid verification code');
    }

    const now = new Date();
    await this.prisma.$transaction([
      this.prisma.emailSenderVerification.update({
        where: { id: verification.id },
        data: { consumedAt: now },
      }),
      this.prisma.emailSenderIdentity.update({
        where: { id: senderId },
        data: { status: EmailSenderStatus.VERIFIED, verifiedAt: now },
      }),
    ]);

    return this.toSenderDto({
      ...sender,
      status: EmailSenderStatus.VERIFIED,
      verifiedAt: now,
    });
  }

  async configureSenderSmtp(user: RequestUser, senderId: string, dto: ConfigureSenderSmtpDto) {
    const companyId = this.companyId(user);
    const sender = await this.prisma.emailSenderIdentity.findFirst({
      where: { id: senderId, companyId },
    });
    if (!sender) throw new NotFoundException('Sender not found');
    if (sender.status !== EmailSenderStatus.VERIFIED) {
      throw new BadRequestException('Verify this sender before configuring SMTP.');
    }

    const now = new Date();
    const encrypted = encryptSecret(dto.password, getSmtpCredentialsKey());
    const updated = await this.prisma.emailSenderIdentity.update({
      where: { id: senderId },
      data: {
        smtpHost: dto.host.trim(),
        smtpPort: dto.port,
        smtpSecure: dto.secure,
        smtpUser: dto.user.trim(),
        smtpPasswordEnc: encrypted,
        smtpConfiguredAt: now,
      },
    });

    return this.toSenderDto(updated);
  }

  async testSenderSmtp(user: RequestUser, senderId: string, dto?: ConfigureSenderSmtpDto) {
    const companyId = this.companyId(user);
    const sender = await this.prisma.emailSenderIdentity.findFirst({
      where: { id: senderId, companyId },
    });
    if (!sender) throw new NotFoundException('Sender not found');
    if (sender.status !== EmailSenderStatus.VERIFIED) {
      throw new BadRequestException('Verify this sender before testing SMTP.');
    }

    let smtp: SenderSmtpConfig;
    if (dto) {
      smtp = {
        host: dto.host.trim(),
        port: dto.port,
        secure: dto.secure,
        user: dto.user.trim(),
        password: dto.password,
      };
    } else {
      const built = this.buildSmtpConfig(sender);
      if (!built) {
        throw new BadRequestException('Save SMTP settings before running a test.');
      }
      smtp = built;
    }

    await this.mail.sendViaSmtp(smtp, {
      to: sender.email,
      subject: 'SoftdigitIMS — sender SMTP test',
      text: `This confirms SMTP for ${sender.email} is working.`,
      html: `<p>This confirms SMTP for <strong>${sender.email}</strong> is working.</p>`,
      fromName: sender.displayName,
      fromEmail: sender.email,
    });

    const now = new Date();
    if (dto) {
      const encrypted = encryptSecret(dto.password, getSmtpCredentialsKey());
      await this.prisma.emailSenderIdentity.update({
        where: { id: senderId },
        data: {
          smtpHost: dto.host.trim(),
          smtpPort: dto.port,
          smtpSecure: dto.secure,
          smtpUser: dto.user.trim(),
          smtpPasswordEnc: encrypted,
          smtpConfiguredAt: now,
          smtpLastVerifiedAt: now,
        },
      });
    } else {
      await this.prisma.emailSenderIdentity.update({
        where: { id: senderId },
        data: { smtpLastVerifiedAt: now },
      });
    }

    return { ok: true, testedAt: now, to: sender.email };
  }

  async resolveTenantSender(companyId: string): Promise<ResolvedTenantSender> {
    const sender = await this.prisma.emailSenderIdentity.findFirst({
      where: {
        companyId,
        isPrimary: true,
        status: EmailSenderStatus.VERIFIED,
      },
    });
    if (!sender) {
      throw new BadRequestException(
        'Configure and verify a sender email in Settings > Customization > Email Notifications.',
      );
    }

    this.assertSenderSmtpReady(sender);
    const smtp = this.buildSmtpConfig(sender);
    if (!smtp) {
      throw new BadRequestException(
        'Configure and test SMTP for your primary sender in Settings > Email Notifications.',
      );
    }

    return {
      senderId: sender.id,
      fromEmail: sender.email,
      fromName: sender.displayName,
      replyTo: sender.email,
      mode: 'tenant_smtp',
      senderEmail: sender.email,
      displayName: sender.displayName,
      smtp,
    };
  }

  async hasVerifiedPrimarySender(companyId: string): Promise<boolean> {
    const count = await this.prisma.emailSenderIdentity.count({
      where: { companyId, isPrimary: true, status: EmailSenderStatus.VERIFIED },
    });
    return count > 0;
  }
}
