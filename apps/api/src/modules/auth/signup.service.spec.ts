import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
import { SignupService } from './signup.service';

jest.mock('bcrypt');

type Mock = jest.Mock;

function makeConfig(overrides: Record<string, unknown> = {}): ConfigService {
  const values: Record<string, unknown> = {
    SIGNUP_ENABLED: true,
    SIGNUP_OTP_TTL_MIN: 15,
    SIGNUP_OTP_MAX_ATTEMPTS: 5,
    BCRYPT_ROUNDS: 10,
    ...overrides,
  };
  return {
    get: jest.fn((key: string, def?: unknown) => values[key] ?? def),
  } as unknown as ConfigService;
}

function makePrisma() {
  const tx = {
    user: {
      findUnique: jest.fn(),
      create: jest.fn(),
    },
    company: {
      create: jest.fn(),
    },
    shop: {
      create: jest.fn(),
    },
    userBackupCode: {
      createMany: jest.fn(),
    },
    signupVerification: {
      update: jest.fn(),
    },
    subscriptionPayment: {
      findUnique: jest.fn(),
      update: jest.fn(),
    },
  };

  return {
    user: {
      findUnique: jest.fn(),
    },
    role: {
      findFirst: jest.fn(),
    },
    company: {
      findUnique: jest.fn(),
    },
    shop: {
      findUnique: jest.fn(),
    },
    signupVerification: {
      findFirst: jest.fn(),
      update: jest.fn(),
      create: jest.fn(),
      delete: jest.fn(),
      deleteMany: jest.fn(),
    },
    subscriptionPayment: {
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    $transaction: jest.fn(async (callback: unknown) => {
      if (typeof callback === 'function') {
        return (callback as (client: typeof tx) => Promise<unknown>)(tx);
      }
      return callback;
    }),
    __tx: tx,
  } as unknown as {
    user: {
      findUnique: Mock;
    };
    role: {
      findFirst: Mock;
    };
    company: {
      findUnique: Mock;
    };
    shop: {
      findUnique: Mock;
    };
    signupVerification: {
      findFirst: Mock;
      update: Mock;
      create: Mock;
      delete: Mock;
      deleteMany: Mock;
    };
    subscriptionPayment: {
      findUnique: Mock;
      update: Mock;
    };
    $transaction: Mock;
    __tx: typeof tx;
  };
}

function makeMail() {
  return {
    isConfigured: jest.fn().mockReturnValue(true),
    sendSignupOtp: jest.fn(),
  };
}

function makeAuth() {
  return {
    issueSessionForUser: jest.fn().mockResolvedValue({
      accessToken: 'access-token',
      refreshCookieValue: 'refresh-cookie',
      user: { id: 'user-1', email: 'owner@example.com' },
    }),
  };
}

function makeRazorpay() {
  return {
    verifyPaymentSignature: jest.fn().mockReturnValue(true),
  };
}

function makeLifecycle() {
  return {
    onTrialStarted: jest.fn(),
    onSubscriptionActivated: jest.fn(),
  };
}

describe('SignupService staged signup flow', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (bcrypt.hash as Mock).mockImplementation(async (value: string) => `hash:${value}`);
    (bcrypt.compare as Mock).mockImplementation(async (value: string, hash: string) => hash === `hash:${value}`);
  });

  it('keeps a trial signup staged after OTP verification without creating user records', async () => {
    const prisma = makePrisma();
    const auth = makeAuth();
    const svc = new SignupService(
      prisma as never,
      makeConfig(),
      makeMail() as never,
      auth as never,
      makeRazorpay() as never,
      makeLifecycle() as never,
      { isConfigured: () => false, sendTemplate: jest.fn() } as never,
    );

    prisma.user.findUnique.mockResolvedValue(null);
    prisma.signupVerification.findFirst.mockResolvedValue({
      id: 'pending-trial',
      email: 'owner@example.com',
      payload: {
        companyName: 'Acme Retail',
        plantName: 'Head Office',
        plantAddress: 'Mumbai',
        contactPerson: 'Priya',
        mobile: '+919876543210',
        adminName: 'Priya',
        passwordHash: 'hash:SecurePass123!',
        plan: 'trial',
        billing: 'monthly',
      },
      otpHash: 'hash:654321',
      attemptCount: 0,
      expiresAt: new Date('2099-05-25T10:15:00.000Z'),
      consumedAt: null,
      createdAt: new Date('2099-05-25T10:00:00.000Z'),
    });

    const result = await svc.verifySignup(
      { email: 'owner@example.com', otp: '654321' },
      {},
    );

    expect(result).toEqual(
      expect.objectContaining({
        mfaSetupRequired: true,
        challengeToken: expect.any(String),
        email: 'owner@example.com',
      }),
    );
    expect(prisma.signupVerification.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'pending-trial' },
        data: expect.objectContaining({
          sessionTokenHash: expect.any(String),
          attemptCount: 0,
        }),
      }),
    );
    expect(prisma.$transaction).not.toHaveBeenCalled();
    expect(auth.issueSessionForUser).not.toHaveBeenCalled();
  });

  it('keeps a paid signup staged after payment verification without creating user records', async () => {
    const prisma = makePrisma();
    const auth = makeAuth();
    const razorpay = makeRazorpay();
    const svc = new SignupService(
      prisma as never,
      makeConfig(),
      makeMail() as never,
      auth as never,
      razorpay as never,
      makeLifecycle() as never,
      { isConfigured: () => false, sendTemplate: jest.fn() } as never,
    );

    prisma.signupVerification.findFirst.mockResolvedValue({
      id: 'pending-paid',
      email: 'owner@example.com',
      payload: {
        companyName: 'Acme Retail',
        plantName: 'Head Office',
        plantAddress: 'Mumbai',
        contactPerson: 'Priya',
        mobile: '+919876543210',
        adminName: 'Priya',
        passwordHash: 'hash:SecurePass123!',
        plan: 'pro',
        billing: 'monthly',
        otpVerifiedAt: '2099-05-25T10:00:00.000Z',
      },
      otpHash: 'hash:654321',
      sessionTokenHash: 'hash:token',
      attemptCount: 0,
      expiresAt: new Date('2099-05-25T11:00:00.000Z'),
      consumedAt: null,
      createdAt: new Date('2099-05-25T10:00:00.000Z'),
    });
    prisma.subscriptionPayment.findUnique.mockResolvedValue({
      id: 'payment-1',
      razorpayOrderId: 'order-1',
      plan: 'PRO',
      billingCycle: 'monthly',
      status: 'paid',
      consumedAt: null,
    });

    const result = await svc.completePaidSignup(
      {
        token: 'signup-token',
        razorpay_order_id: 'order-1',
        razorpay_payment_id: 'pay-1',
        razorpay_signature: 'signature-1',
      },
      {},
    );

    expect(razorpay.verifyPaymentSignature).toHaveBeenCalled();
    expect(result).toEqual(
      expect.objectContaining({
        mfaSetupRequired: true,
        challengeToken: expect.any(String),
        email: 'owner@example.com',
      }),
    );
    expect(prisma.signupVerification.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'pending-paid' },
        data: expect.objectContaining({
          sessionTokenHash: expect.any(String),
          payload: expect.objectContaining({
            paymentOrderId: 'order-1',
            paymentPaymentId: 'pay-1',
          }),
        }),
      }),
    );
    expect(prisma.$transaction).not.toHaveBeenCalled();
    expect(auth.issueSessionForUser).not.toHaveBeenCalled();
  });

  it('creates the real company, shop, user, and session only during final signup completion', async () => {
    const prisma = makePrisma();
    const auth = makeAuth();
    const svc = new SignupService(
      prisma as never,
      makeConfig(),
      makeMail() as never,
      auth as never,
      makeRazorpay() as never,
      makeLifecycle() as never,
      { isConfigured: () => false, sendTemplate: jest.fn() } as never,
    );

    prisma.user.findUnique.mockResolvedValue(null);
    prisma.role.findFirst.mockResolvedValue({ id: 'role-owner', name: 'OWNER' });
    prisma.company.findUnique.mockResolvedValue(null);
    prisma.shop.findUnique.mockResolvedValue(null);
    prisma.signupVerification.findFirst.mockResolvedValue({
      id: 'pending-finalize',
      email: 'owner@example.com',
      payload: {
        companyName: 'Acme Retail',
        plantName: 'Head Office',
        plantAddress: 'Mumbai',
        contactPerson: 'Priya',
        mobile: '+919876543210',
        adminName: 'Priya',
        passwordHash: 'hash:SecurePass123!',
        plan: 'trial',
        billing: 'monthly',
        otpVerifiedAt: '2099-05-25T10:00:00.000Z',
        mfaMethod: 'totp',
        mfaVerifiedAt: '2099-05-25T10:10:00.000Z',
        backupCodeHashes: ['hash:CODE-1', 'hash:CODE-2'],
      },
      otpHash: 'hash:654321',
      sessionTokenHash: 'hash:token',
      totpSecretEncrypted: 'encrypted-secret',
      attemptCount: 0,
      expiresAt: new Date('2099-05-25T11:00:00.000Z'),
      consumedAt: null,
      createdAt: new Date('2099-05-25T10:00:00.000Z'),
    });

    prisma.__tx.user.findUnique.mockResolvedValue(null);
    prisma.__tx.company.create.mockResolvedValue({ id: 'company-1' });
    prisma.__tx.shop.create.mockResolvedValue({ id: 'shop-1' });
    prisma.__tx.user.create.mockResolvedValue({
      id: 'user-1',
      email: 'owner@example.com',
      role: { id: 'role-owner', name: 'OWNER' },
      shop: { id: 'shop-1' },
    });

    const result = await svc.finalizeSignup({ token: 'signup-token' }, {});

    expect(prisma.$transaction).toHaveBeenCalled();
    expect(prisma.__tx.company.create).toHaveBeenCalled();
    expect(prisma.__tx.shop.create).toHaveBeenCalled();
    expect(prisma.__tx.user.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          email: 'owner@example.com',
          mfaEnabled: true,
          mfaMethod: 'TOTP',
          mfaSecretEncrypted: 'encrypted-secret',
        }),
      }),
    );
    expect(prisma.__tx.userBackupCode.createMany).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.arrayContaining([
          expect.objectContaining({ codeHash: 'hash:CODE-1' }),
          expect.objectContaining({ codeHash: 'hash:CODE-2' }),
        ]),
      }),
    );
    expect(prisma.__tx.signupVerification.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'pending-finalize' },
        data: expect.objectContaining({
          consumedAt: expect.any(Date),
        }),
      }),
    );
    expect(auth.issueSessionForUser).toHaveBeenCalledWith('user-1', {});
    expect(result).toEqual(
      expect.objectContaining({
        accessToken: 'access-token',
        user: expect.objectContaining({ id: 'user-1' }),
      }),
    );
  });

  it('allows final signup completion with MFA skipped for now', async () => {
    const prisma = makePrisma();
    const auth = makeAuth();
    const svc = new SignupService(
      prisma as never,
      makeConfig(),
      makeMail() as never,
      auth as never,
      makeRazorpay() as never,
      makeLifecycle() as never,
      { isConfigured: () => false, sendTemplate: jest.fn() } as never,
    );

    prisma.user.findUnique.mockResolvedValue(null);
    prisma.role.findFirst.mockResolvedValue({ id: 'role-owner', name: 'OWNER' });
    prisma.company.findUnique.mockResolvedValue(null);
    prisma.shop.findUnique.mockResolvedValue(null);
    prisma.signupVerification.findFirst.mockResolvedValue({
      id: 'pending-skip',
      email: 'owner@example.com',
      payload: {
        companyName: 'Acme Retail',
        plantName: 'Head Office',
        plantAddress: 'Mumbai',
        contactPerson: 'Priya',
        mobile: '+919876543210',
        adminName: 'Priya',
        passwordHash: 'hash:SecurePass123!',
        plan: 'trial',
        billing: 'monthly',
        otpVerifiedAt: '2099-05-25T10:00:00.000Z',
      },
      otpHash: 'hash:654321',
      sessionTokenHash: 'hash:token',
      totpSecretEncrypted: null,
      attemptCount: 0,
      expiresAt: new Date('2099-05-25T11:00:00.000Z'),
      consumedAt: null,
      createdAt: new Date('2099-05-25T10:00:00.000Z'),
    });

    prisma.__tx.user.findUnique.mockResolvedValue(null);
    prisma.__tx.company.create.mockResolvedValue({ id: 'company-1' });
    prisma.__tx.shop.create.mockResolvedValue({ id: 'shop-1' });
    prisma.__tx.user.create.mockResolvedValue({
      id: 'user-1',
      email: 'owner@example.com',
      role: { id: 'role-owner', name: 'OWNER' },
      shop: { id: 'shop-1' },
    });

    const result = await svc.finalizeSignup({ token: 'signup-token', skipMfa: true }, {});

    expect(prisma.__tx.user.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          email: 'owner@example.com',
          mfaEnabled: false,
          mfaMethod: null,
          mfaEnrolledAt: null,
          mfaSecretEncrypted: null,
        }),
      }),
    );
    expect(prisma.__tx.userBackupCode.createMany).not.toHaveBeenCalled();
    expect(auth.issueSessionForUser).toHaveBeenCalledWith('user-1', {});
    expect(result).toEqual(
      expect.objectContaining({
        accessToken: 'access-token',
        user: expect.objectContaining({ id: 'user-1' }),
      }),
    );
  });
});
