import { EmailSenderStatus, EmailSenderType } from '@prisma/client';
import { EmailSenderService } from './email-sender.service';
import { isPublicEmailDomain, parseEmailDomain } from './email-sender.constants';

describe('email-sender.constants', () => {
  it('detects public email domains', () => {
    expect(isPublicEmailDomain('gmail.com')).toBe(true);
    expect(isPublicEmailDomain('softdigitconsulting.com')).toBe(false);
  });

  it('parses email domains', () => {
    expect(parseEmailDomain('Office@Softdigitconsulting.com')).toBe('softdigitconsulting.com');
  });
});

describe('EmailSenderService.resolveTenantSender', () => {
  const mail = {
    isConfigured: jest.fn().mockReturnValue(true),
    sendPlatformMail: jest.fn(),
    sendViaSmtp: jest.fn(),
  } as any;

  const prisma = {
    emailSenderIdentity: {
      count: jest.fn(),
      findFirst: jest.fn(),
    },
  } as any;

  const config = {
    get: jest.fn((key: string) => {
      if (key === 'MAIL_FROM') return 'office@softdigitconsulting.com';
      return undefined;
    }),
  } as any;

  const service = new EmailSenderService(prisma, mail, config);

  it('uses tenant SMTP for verified primary sender with configured SMTP', async () => {
    process.env.SMTP_CREDENTIALS_KEY = 'test-key-for-unit-tests-only';
    prisma.emailSenderIdentity.findFirst.mockResolvedValue({
      id: 's1',
      email: 'user@gmail.com',
      displayName: 'Tharun',
      senderType: EmailSenderType.PUBLIC_DOMAIN,
      status: EmailSenderStatus.VERIFIED,
      isPrimary: true,
      smtpHost: 'smtp.gmail.com',
      smtpPort: 587,
      smtpSecure: false,
      smtpUser: 'user@gmail.com',
      smtpPasswordEnc: require('../../common/crypto/secret-cipher').encryptSecret(
        'app-password',
        'test-key-for-unit-tests-only',
      ),
      smtpLastVerifiedAt: new Date(),
    });

    const resolved = await service.resolveTenantSender('company-1');
    expect(resolved.mode).toBe('tenant_smtp');
    expect(resolved.fromEmail).toBe('user@gmail.com');
    expect(resolved.replyTo).toBe('user@gmail.com');
    expect(resolved.smtp.host).toBe('smtp.gmail.com');
  });
});

describe('EmailSenderService.reencryptLegacySmtpPasswords', () => {
  const cipher = require('../../common/crypto/secret-cipher');
  const saved = { ...process.env };
  afterEach(() => {
    process.env = { ...saved };
  });

  it('re-encrypts passwords stored under the JWT secret with SMTP_CREDENTIALS_KEY', async () => {
    process.env.JWT_SECRET = 'jwt-secret';
    delete process.env.APP_SECRET;
    process.env.SMTP_CREDENTIALS_KEY = 'dedicated-key';
    const legacy = cipher.encryptSecret('pw', 'jwt-secret');
    const current = cipher.encryptSecret('pw2', 'dedicated-key');
    const prisma = {
      emailSenderIdentity: {
        findMany: jest.fn().mockResolvedValue([
          { id: 'a', smtpPasswordEnc: legacy },
          { id: 'b', smtpPasswordEnc: current },
          { id: 'c', smtpPasswordEnc: cipher.encryptSecret('x', 'unknown') },
        ]),
        updateMany: jest.fn().mockResolvedValue({ count: 1 }),
      },
    } as any;
    const service = new EmailSenderService(prisma, {} as any, { get: jest.fn() } as any);

    await expect(service.reencryptLegacySmtpPasswords()).resolves.toBe(1);
    expect(prisma.emailSenderIdentity.updateMany).toHaveBeenCalledTimes(1);
    const call = prisma.emailSenderIdentity.updateMany.mock.calls[0][0];
    expect(call.where).toEqual({ id: 'a', smtpPasswordEnc: legacy });
    expect(cipher.decryptSecret(call.data.smtpPasswordEnc, 'dedicated-key')).toBe('pw');
  });
});
