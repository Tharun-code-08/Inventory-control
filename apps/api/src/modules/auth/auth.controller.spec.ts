import { ConfigService } from '@nestjs/config';
import { AuthController } from './auth.controller';

jest.mock('otplib', () => ({
  generateSecret: jest.fn(),
  generateURI: jest.fn(),
  verifySync: jest.fn(),
}));
jest.mock('qrcode', () => ({
  toDataURL: jest.fn(),
}));

function makeConfig(): ConfigService {
  return {
    get: jest.fn((key: string, def?: unknown) => {
      if (key === 'REFRESH_COOKIE_NAME') return 'session_id';
      if (key === 'AUTH_COOKIE_SAME_SITE') return 'lax';
      return def;
    }),
  } as unknown as ConfigService;
}

describe('AuthController login MFA flow', () => {
  it('returns an MFA challenge instead of issuing a session when MFA is enabled', async () => {
    const auth = {
      validateCredentials: jest.fn().mockResolvedValue({
        id: 'user-1',
        email: 'owner@example.com',
        mfaEnabled: true,
      }),
      issueSessionForUser: jest.fn(),
      refreshFromToken: jest.fn(),
      me: jest.fn(),
      logout: jest.fn(),
      getSessionIdFromRefreshToken: jest.fn(),
      listSessions: jest.fn(),
      revokeSession: jest.fn(),
      revokeAllForUser: jest.fn(),
      updateProfile: jest.fn(),
      updatePassword: jest.fn(),
    };
    const signup = {
      requestSignup: jest.fn(),
      resendOtp: jest.fn(),
      verifySignup: jest.fn(),
      completePaidSignup: jest.fn(),
      finalizeSignup: jest.fn(),
    };
    const invite = {
      preview: jest.fn(),
      accept: jest.fn(),
    };
    const mfa = {
      verifyTrustedDevice: jest.fn().mockResolvedValue(false),
      createLoginChallenge: jest.fn().mockResolvedValue({
        mfaRequired: true,
        challengeToken: 'challenge-token',
        email: 'owner@example.com',
        availableMethods: ['totp', 'backup_code'],
        expiresAt: '2026-05-25T10:15:00.000Z',
      }),
      startEnrollment: jest.fn(),
      verifyEnrollment: jest.fn(),
      verifyLogin: jest.fn(),
    };
    const passwordReset = {
      requestReset: jest.fn(),
      previewMagicLink: jest.fn(),
      completeMagicLink: jest.fn(),
      completeOtp: jest.fn(),
    };

    const controller = new AuthController(
      auth as never,
      signup as never,
      invite as never,
      mfa as never,
      passwordReset as never,
      makeConfig(),
    );

    const req = {
      ip: '127.0.0.1',
      headers: { 'user-agent': 'jest' },
      cookies: {},
      signedCookies: {},
    } as never;
    const res = {
      cookie: jest.fn(),
      clearCookie: jest.fn(),
    } as never;

    const result = await controller.login(req, { email: 'owner@example.com', password: 'pw' } as never, res);

    expect(result).toEqual(
      expect.objectContaining({
        mfaRequired: true,
        challengeToken: 'challenge-token',
      }),
    );
    expect(mfa.createLoginChallenge).toHaveBeenCalledWith(
      'user-1',
      'owner@example.com',
      expect.objectContaining({
        ip: '127.0.0.1',
        userAgent: 'jest',
      }),
    );
    expect(auth.issueSessionForUser).not.toHaveBeenCalled();
    expect((res as { cookie: jest.Mock }).cookie).not.toHaveBeenCalled();
  });

  it('skips the MFA challenge when a trusted device cookie is valid', async () => {
    const auth = {
      validateCredentials: jest.fn().mockResolvedValue({
        id: 'user-1',
        email: 'owner@example.com',
        mfaEnabled: true,
      }),
      issueSessionForUser: jest.fn().mockResolvedValue({
        accessToken: 'access-token',
        refreshCookieValue: 'refresh-token',
        user: { id: 'user-1' },
      }),
      refreshFromToken: jest.fn(),
      me: jest.fn(),
      logout: jest.fn(),
      getSessionIdFromRefreshToken: jest.fn(),
      listSessions: jest.fn(),
      revokeSession: jest.fn(),
      revokeAllForUser: jest.fn(),
      updateProfile: jest.fn(),
      updatePassword: jest.fn(),
    };
    const signup = {
      requestSignup: jest.fn(),
      resendOtp: jest.fn(),
      verifySignup: jest.fn(),
      completePaidSignup: jest.fn(),
      finalizeSignup: jest.fn(),
    };
    const invite = {
      preview: jest.fn(),
      accept: jest.fn(),
    };
    const mfa = {
      verifyTrustedDevice: jest.fn().mockResolvedValue(true),
      createLoginChallenge: jest.fn(),
      startEnrollment: jest.fn(),
      verifyEnrollment: jest.fn(),
      verifyLogin: jest.fn(),
    };
    const passwordReset = {
      requestReset: jest.fn(),
      previewMagicLink: jest.fn(),
      completeMagicLink: jest.fn(),
      completeOtp: jest.fn(),
    };

    const controller = new AuthController(
      auth as never,
      signup as never,
      invite as never,
      mfa as never,
      passwordReset as never,
      makeConfig(),
    );

    const req = {
      ip: '127.0.0.1',
      headers: { 'user-agent': 'jest' },
      cookies: {
        remember_me: 'trusted-token',
        cookie_consent: JSON.stringify({ functional: true, decided: true }),
      },
      signedCookies: {},
    } as never;
    const res = {
      cookie: jest.fn(),
      clearCookie: jest.fn(),
    } as never;

    const result = await controller.login(req, { email: 'owner@example.com', password: 'pw' } as never, res);

    expect(mfa.verifyTrustedDevice).toHaveBeenCalledWith(
      'user-1',
      'trusted-token',
      expect.objectContaining({ ip: '127.0.0.1', userAgent: 'jest' }),
    );
    expect(auth.issueSessionForUser).toHaveBeenCalledWith(
      'user-1',
      expect.objectContaining({ ip: '127.0.0.1', userAgent: 'jest' }),
    );
    expect(mfa.createLoginChallenge).not.toHaveBeenCalled();
    expect(result).toEqual({ accessToken: 'access-token', user: { id: 'user-1' } });
  });

  it('ignores and clears remember_me when functional consent is not granted', async () => {
    const auth = {
      validateCredentials: jest.fn().mockResolvedValue({
        id: 'user-1',
        email: 'owner@example.com',
        mfaEnabled: true,
      }),
      issueSessionForUser: jest.fn(),
      refreshFromToken: jest.fn(),
      me: jest.fn(),
      logout: jest.fn(),
      getSessionIdFromRefreshToken: jest.fn(),
      listSessions: jest.fn(),
      revokeSession: jest.fn(),
      revokeAllForUser: jest.fn(),
      updateProfile: jest.fn(),
      updatePassword: jest.fn(),
    };
    const signup = {
      requestSignup: jest.fn(),
      resendOtp: jest.fn(),
      verifySignup: jest.fn(),
      completePaidSignup: jest.fn(),
      finalizeSignup: jest.fn(),
    };
    const invite = {
      preview: jest.fn(),
      accept: jest.fn(),
    };
    const mfa = {
      verifyTrustedDevice: jest.fn().mockResolvedValue(false),
      createLoginChallenge: jest.fn().mockResolvedValue({
        mfaRequired: true,
        challengeToken: 'challenge-token',
      }),
      startEnrollment: jest.fn(),
      verifyEnrollment: jest.fn(),
      verifyLogin: jest.fn(),
    };
    const passwordReset = {
      requestReset: jest.fn(),
      previewMagicLink: jest.fn(),
      completeMagicLink: jest.fn(),
      completeOtp: jest.fn(),
    };

    const controller = new AuthController(
      auth as never,
      signup as never,
      invite as never,
      mfa as never,
      passwordReset as never,
      makeConfig(),
    );

    const req = {
      ip: '127.0.0.1',
      headers: { 'user-agent': 'jest' },
      cookies: { remember_me: 'trusted-token' },
      signedCookies: {},
    } as never;
    const res = {
      cookie: jest.fn(),
      clearCookie: jest.fn(),
    } as never;

    await controller.login(req, { email: 'owner@example.com', password: 'pw' } as never, res);

    expect(mfa.verifyTrustedDevice).toHaveBeenCalledWith(
      'user-1',
      undefined,
      expect.objectContaining({ ip: '127.0.0.1', userAgent: 'jest' }),
    );
    expect((res as { clearCookie: jest.Mock }).clearCookie).toHaveBeenCalled();
  });
});
