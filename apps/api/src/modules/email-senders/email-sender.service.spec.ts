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

  it('uses relay headers for verified public-domain primary sender', async () => {
    prisma.emailSenderIdentity.findFirst.mockResolvedValue({
      id: 's1',
      email: 'user@gmail.com',
      displayName: 'Tharun',
      senderType: EmailSenderType.PUBLIC_DOMAIN,
      status: EmailSenderStatus.VERIFIED,
      isPrimary: true,
    });

    const resolved = await service.resolveTenantSender('company-1');
    expect(resolved.mode).toBe('tenant_relay');
    expect(resolved.fromEmail).toBe('office@softdigitconsulting.com');
    expect(resolved.replyTo).toBe('user@gmail.com');
  });

  it('uses direct from for verified custom-domain primary sender', async () => {
    prisma.emailSenderIdentity.findFirst.mockResolvedValue({
      id: 's2',
      email: 'office@softdigitconsulting.com',
      displayName: 'Office',
      senderType: EmailSenderType.CUSTOM_DOMAIN,
      status: EmailSenderStatus.VERIFIED,
      isPrimary: true,
    });

    const resolved = await service.resolveTenantSender('company-1');
    expect(resolved.mode).toBe('tenant_direct');
    expect(resolved.fromEmail).toBe('office@softdigitconsulting.com');
    expect(resolved.replyTo).toBe('office@softdigitconsulting.com');
  });
});
