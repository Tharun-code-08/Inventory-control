import { useEffect, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import {
  ArrowLeft,
  Building2,
  Eye,
  EyeOff,
  Factory,
  Lock,
  Mail,
  MapPin,
  Phone,
  ShieldCheck,
  Sparkles,
  User,
  Zap,
} from 'lucide-react';
import { toast } from 'sonner';
import { api } from '@/api/client';
import { AuthStepIndicator } from '@/components/auth/AuthStepIndicator';
import { Reveal } from '@/components/motion';
import { BackupCodesCard } from '@/components/auth/BackupCodesCard';
import { OtpCodeInput } from '@/components/auth/OtpCodeInput';
import { PasswordStrengthBar } from '@/components/auth/PasswordStrengthBar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { getApiErrorMessage } from '@/lib/api-error';
import { initializeSessionFromAuthResponse } from '@/lib/session';
import { useAuthStore } from '@/store/authStore';
import { dashboardHomePath } from '@/lib/roles';
import { PLAN_CATALOG, type BillingInterval, type PlanId } from '@/lib/plans';
import { useRazorpayCheckout } from '@/hooks/use-razorpay-checkout';

type Step = 'details' | 'verify' | 'method' | 'mfa' | 'backup' | 'complete';

type SignupVerifyPayload =
  | {
      requiresPayment: true;
      email: string;
      plan: 'pro' | 'plus';
      billing: BillingInterval;
      signupToken: string;
      expiresAt: string;
    }
  | {
      mfaSetupRequired: true;
      challengeToken: string;
      email: string;
      expiresAt: string;
    }
  | {
      accessToken: string;
      user: unknown;
    };

type MfaStartPayload = {
  email: string;
  manualCode: string;
  qrCodeDataUrl: string | null;
  attemptsRemaining: number;
  expiresAt: string;
};

type SignupMfaChallengePayload = {
  mfaSetupRequired: true;
  challengeToken: string;
  email: string;
  expiresAt: string;
};

type MfaVerifyPayload = {
  backupCodes: string[];
};

export function SignupPage() {
  const nav = useNavigate();
  const [searchParams] = useSearchParams();
  const queryClient = useQueryClient();
  const selectedPlanParam = searchParams.get('plan');
  const selectedPlan: PlanId =
    selectedPlanParam === 'pro' || selectedPlanParam === 'plus' ? selectedPlanParam : 'trial';
  const billing: BillingInterval = searchParams.get('billing') === 'yearly' ? 'yearly' : 'monthly';
  const isPaidPlan = selectedPlan === 'pro' || selectedPlan === 'plus';
  const paidPlanLabel = isPaidPlan ? PLAN_CATALOG[selectedPlan].name : null;
  const { checkout, loading: paying } = useRazorpayCheckout();

  const [step, setStep] = useState<Step>('details');
  const [err, setErr] = useState('');
  const [info, setInfo] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showAvatarSplash, setShowAvatarSplash] = useState(false);

  const [companyName, setCompanyName] = useState('');
  const [companyAddress, setCompanyAddress] = useState('');
  const [plantName, setPlantName] = useState('Head Office');
  const [plantAddress, setPlantAddress] = useState('');
  const [contactPerson, setContactPerson] = useState('');
  const [mobile, setMobile] = useState('');
  const [adminName, setAdminName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [otp, setOtp] = useState('');
  const [totpCode, setTotpCode] = useState('');
  const [signupChallengeToken, setSignupChallengeToken] = useState('');
  const [mfaSetup, setMfaSetup] = useState<MfaStartPayload | null>(null);
  const [backupCodes, setBackupCodes] = useState<string[]>([]);
  const [pendingAuthPayload, setPendingAuthPayload] = useState<unknown>(null);
  const [mfaSkipped, setMfaSkipped] = useState(false);

  const steps = [
    { id: 'details', label: 'Account' },
    { id: 'verify', label: 'Verify' },
    { id: 'method', label: 'Method' },
    { id: 'mfa', label: 'Authenticator' },
    { id: 'backup', label: 'Backup Codes' },
    { id: 'complete', label: 'Complete' },
  ];

  useEffect(() => {
    if (!showAvatarSplash) return;
    const timer = window.setTimeout(() => {
      const user = useAuthStore.getState().user;
      nav(dashboardHomePath(user?.role));
    }, 900);
    return () => window.clearTimeout(timer);
  }, [showAvatarSplash, nav]);

  async function loadMfaSetup(challengeToken: string) {
    const res = await api.post('/auth/mfa/enroll/start', { token: challengeToken });
    const payload = (res.data?.data ?? res.data) as MfaStartPayload;
    setSignupChallengeToken(challengeToken);
    setMfaSetup(payload);
    setTotpCode('');
    setErr('');
    setStep('mfa');
  }

  async function refreshMfaChallenge(challengeToken: string) {
    const res = await api.post('/auth/mfa/enroll/restart', { token: challengeToken });
    const payload = (res.data?.data ?? res.data) as SignupMfaChallengePayload;
    setSignupChallengeToken(payload.challengeToken);
    return payload.challengeToken;
  }

  async function beginMfaSetup(challengeToken: string, allowAutoRefresh = true) {
    if (!challengeToken.trim()) {
      setErr('Your MFA setup session is missing. Go back and verify your email again.');
      return;
    }

    setIsSubmitting(true);
    setErr('');
    setInfo('');

    try {
      await loadMfaSetup(challengeToken);
    } catch (error) {
      const rawMessage = getApiErrorMessage(error, 'Could not start authenticator setup.');
      const message =
        /request failed with status code 500|unexpected/i.test(rawMessage)
          ? 'Could not start authenticator setup. Make sure the API server and database are running, then try again.'
          : rawMessage;
      const challengeExpired = /expired|invalid/i.test(message);

      if (allowAutoRefresh && challengeExpired) {
        try {
          const freshToken = await refreshMfaChallenge(challengeToken);
          await loadMfaSetup(freshToken);
          setInfo('Authenticator setup was refreshed. Please scan the new QR code.');
          return;
        } catch (refreshError) {
          setErr(getApiErrorMessage(refreshError, 'Could not refresh authenticator setup.'));
          return;
        }
      }

      setErr(message);
    } finally {
      setIsSubmitting(false);
    }
  }

  function goToMethodSelection(challengeToken: string) {
    setSignupChallengeToken(challengeToken);
    setMfaSetup(null);
    setTotpCode('');
    setErr('');
    setInfo('');
    setStep('method');
  }

  async function restartMfaSetup() {
    if (isSubmitting || !signupChallengeToken) return;
    const freshToken = await refreshMfaChallenge(signupChallengeToken).catch((error: unknown) => {
      setErr(getApiErrorMessage(error, 'Could not restart authenticator setup.'));
      return null;
    });
    if (!freshToken) return;
    await beginMfaSetup(freshToken, false);
  }

  async function finalizeSignIn(payload: unknown) {
    await initializeSessionFromAuthResponse(payload, queryClient);
    setShowAvatarSplash(true);
  }

  async function requestOtp(e: React.FormEvent) {
    e.preventDefault();
    if (isSubmitting) return;
    setIsSubmitting(true);
    setErr('');
    setInfo('');
    setPendingAuthPayload(null);
    setSignupChallengeToken('');
    setMfaSetup(null);
    setBackupCodes([]);
    setMfaSkipped(false);
    try {
      await api.post('/auth/signup/request', {
        companyName,
        companyAddress: companyAddress || undefined,
        plantName,
        plantAddress: plantAddress || companyAddress,
        contactPerson,
        mobile,
        adminName,
        email,
        password,
        confirmPassword,
        plan: selectedPlan,
        billing: isPaidPlan ? billing : undefined,
      });
      setInfo(`We sent a 6-digit verification code to ${email}.`);
      setStep('verify');
    } catch (error) {
      setErr(getApiErrorMessage(error, 'Could not start registration.'));
    } finally {
      setIsSubmitting(false);
    }
  }

  async function verifyOtp(e: React.FormEvent) {
    e.preventDefault();
    if (isSubmitting) return;
    setIsSubmitting(true);
    setErr('');
    setInfo('');

    try {
      const verifyRes = await api.post('/auth/signup/verify', {
        email,
        otp: otp.trim(),
      });
      const verifyData = (verifyRes.data?.data ?? verifyRes.data) as SignupVerifyPayload;

      if ('requiresPayment' in verifyData && verifyData.requiresPayment && isPaidPlan) {
        const paidPlan: Exclude<PlanId, 'trial'> = selectedPlan === 'pro' ? 'pro' : 'plus';
        setInfo('Email verified. Complete payment to continue to MFA setup.');
        try {
          await checkout({
            plan: paidPlan,
            billing,
            prefill: {
              name: adminName,
              email,
              contact: mobile || undefined,
            },
            onSuccess: async (response) => {
              const completeRes = await api.post('/auth/signup/complete-paid', {
                token: verifyData.signupToken,
                razorpay_order_id: response.razorpay_order_id,
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_signature: response.razorpay_signature,
              });
              const completeData = (completeRes.data?.data ?? completeRes.data) as SignupVerifyPayload;
              if ('mfaSetupRequired' in completeData && completeData.mfaSetupRequired) {
                goToMethodSelection(completeData.challengeToken);
                return;
              }
              setErr('Payment was verified, but signup could not continue to MFA setup. Please try again.');
            },
            onDismiss: () => {
              toast.message('Payment cancelled. Your account was not created.');
            },
          });
          return;
        } catch (paymentError) {
          const raw = paymentError instanceof Error ? paymentError.message : '';
          if (raw === 'Payment cancelled') {
            setErr('Payment was cancelled. No account was created.');
          } else {
            setErr(getApiErrorMessage(paymentError, raw || 'Payment could not be completed.'));
          }
          return;
        }
      }

      if ('mfaSetupRequired' in verifyData && verifyData.mfaSetupRequired) {
        goToMethodSelection(verifyData.challengeToken);
        return;
      }

      setErr('Email was verified, but signup could not continue to MFA setup. Please try again.');
    } catch (error) {
      setErr(getApiErrorMessage(error, 'Verification failed.'));
    } finally {
      setIsSubmitting(false);
    }
  }

  async function resendOtp() {
    if (isSubmitting) return;
    setIsSubmitting(true);
    setErr('');
    try {
      await api.post('/auth/signup/resend', { email });
      setInfo('A new verification code has been sent.');
    } catch (error) {
      setErr(getApiErrorMessage(error, 'Could not resend code.'));
    } finally {
      setIsSubmitting(false);
    }
  }

  async function verifyTotp(e: React.FormEvent) {
    e.preventDefault();
    if (isSubmitting || !signupChallengeToken) return;
    setIsSubmitting(true);
    setErr('');
    try {
      const res = await api.post('/auth/mfa/enroll/verify', {
        token: signupChallengeToken,
        code: totpCode.trim(),
      });
      const payload = (res.data?.data ?? res.data) as MfaVerifyPayload;
      setMfaSkipped(false);
      setBackupCodes(payload.backupCodes);
      setStep('backup');
    } catch (error) {
      setErr(getApiErrorMessage(error, 'Could not verify your authenticator code.'));
    } finally {
      setIsSubmitting(false);
    }
  }

  async function completeSignup(skipMfa = false) {
    if (isSubmitting || !signupChallengeToken) return;
    setIsSubmitting(true);
    setErr('');
    setInfo('');
    try {
      const res = await api.post('/auth/signup/finalize', {
        token: signupChallengeToken,
        skipMfa,
      });
      setMfaSkipped(skipMfa);
      setPendingAuthPayload(res.data);
      setStep('complete');
    } catch (error) {
      setErr(getApiErrorMessage(error, 'Could not finish account creation.'));
    } finally {
      setIsSubmitting(false);
    }
  }

  const heroTitle =
    step === 'verify'
      ? 'Verify your email address.'
      : step === 'method'
        ? 'Choose your MFA method.'
      : step === 'mfa'
        ? 'Protect every sign-in with TOTP.'
        : step === 'backup'
          ? 'Save your recovery codes.'
          : step === 'complete'
            ? 'Your workspace is ready.'
            : 'Create a secure Retail IMS workspace.';

  const heroDescription =
    step === 'verify'
      ? 'Email verification confirms the admin account before we continue to MFA setup.'
      : step === 'method'
        ? 'Choose how you want to protect this account. You can use an authenticator app now or skip MFA and set it up later.'
      : step === 'mfa'
        ? 'Scan the QR code in your authenticator app and confirm with a real TOTP code.'
        : step === 'backup'
          ? 'Backup codes keep you in control if you lose your authenticator device.'
          : step === 'complete'
            ? mfaSkipped
              ? 'Email verification is complete and your workspace is ready. You can enable MFA later.'
              : 'Email verification, authenticator setup, and backup protection are all complete.'
            : 'Set up your company, admin account, and secure sign-in flow in one guided experience.';

  return (
    <div className="relative min-h-screen overflow-hidden bg-[radial-gradient(circle_at_18%_18%,rgba(99,102,241,0.2),transparent_36%),radial-gradient(circle_at_84%_4%,rgba(56,189,248,0.16),transparent_35%),linear-gradient(180deg,#eef2ff_0%,#f8fafc_50%,#f1f5f9_100%)]">
      <Link
        to="/"
        className="group absolute left-4 top-4 z-50 inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-800 shadow-md ring-1 ring-slate-900/5 transition hover:-translate-x-0.5 hover:bg-slate-50 hover:shadow-lg focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-500 sm:left-6 sm:top-6"
        aria-label="Back to home page"
      >
        <ArrowLeft className="h-4 w-4 text-slate-600 transition group-hover:text-slate-900" />
        Back to home
      </Link>

      {showAvatarSplash ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/90">
          <div className="flex flex-col items-center gap-4 text-center text-white">
            <ShieldCheck className="h-10 w-10 text-indigo-300" />
            <p className="text-lg font-semibold">Opening your secure workspace</p>
          </div>
        </div>
      ) : null}

      <div className="mx-auto flex min-h-screen w-full max-w-7xl items-center px-4 py-10 sm:px-6 lg:px-8">
        <div className="grid w-full gap-8 lg:grid-cols-[1.1fr_0.9fr]">
          <section className="relative hidden overflow-hidden rounded-[2rem] border border-indigo-200/70 bg-gradient-to-br from-indigo-950 via-slate-900 to-violet-900 p-10 text-white shadow-[0_30px_70px_rgba(15,23,42,0.38)] lg:block">
            <div className="pointer-events-none absolute -right-12 -top-12 h-44 w-44 rounded-full bg-indigo-400/30 blur-2xl" />
            <div className="pointer-events-none absolute -left-8 bottom-8 h-36 w-36 rounded-full bg-cyan-300/25 blur-2xl" />
            <p className="inline-flex items-center gap-2 rounded-full border border-white/35 bg-white/10 px-4 py-1 text-xs font-semibold uppercase tracking-[0.2em]">
              <Sparkles className="h-3.5 w-3.5" />
              Retail IMS
            </p>
            <h1 className="mt-7 text-4xl font-semibold leading-tight">{heroTitle}</h1>
            <p className="mt-4 max-w-md text-sm text-white/80">{heroDescription}</p>
            <div className="mt-10 grid max-w-md gap-3 text-sm">
              <div className="rounded-xl border border-white/20 bg-white/10 px-4 py-3 backdrop-blur-sm">
                Verified admin email before access
              </div>
              <div className="rounded-xl border border-white/20 bg-white/10 px-4 py-3 backdrop-blur-sm">
                {mfaSkipped ? 'MFA can be enabled later in settings' : 'Authenticator app required for sign-in'}
              </div>
              <div className="rounded-xl border border-white/20 bg-white/10 px-4 py-3 backdrop-blur-sm">
                {mfaSkipped ? 'Workspace can be entered without MFA for now' : 'Backup codes generated and stored securely'}
              </div>
            </div>
          </section>

          <Reveal as="section" className="relative overflow-hidden rounded-[2rem] border border-slate-200/90 bg-white/95 p-6 shadow-[0_24px_56px_rgba(15,23,42,0.16)] backdrop-blur sm:p-8">
            <div className="pointer-events-none absolute -right-12 -top-14 h-36 w-36 rounded-full bg-indigo-100 blur-2xl" aria-hidden="true" />
            <div className="pointer-events-none absolute -left-8 bottom-10 h-24 w-24 rounded-full bg-cyan-100 blur-2xl" aria-hidden="true" />

            <AuthStepIndicator steps={steps} current={step} />

            <div className="mb-6">
              {paidPlanLabel ? (
                <div className="mb-4 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900">
                  You selected the <strong>{paidPlanLabel}</strong>{' '}
                  {billing === 'yearly' ? '(Yearly)' : '(Monthly)'} plan. Payment will run after
                  email verification and before MFA setup.
                </div>
              ) : (
                <div className="mb-4 rounded-xl border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-900">
                  You are starting a <strong>7-day free trial</strong>. MFA setup is still required.
                </div>
              )}
              <p className="inline-flex items-center gap-2 rounded-full border border-indigo-200 bg-indigo-50 px-3 py-1 text-[11px] font-semibold uppercase tracking-wider text-indigo-700">
                {step === 'details' ? <Zap className="h-3.5 w-3.5" /> : <ShieldCheck className="h-3.5 w-3.5" />}
                {step === 'details'
                  ? 'Create your workspace'
                  : step === 'verify'
                    ? 'Verify email'
                    : step === 'method'
                      ? 'Choose MFA'
                    : step === 'mfa'
                      ? 'Setup authenticator'
                      : step === 'backup'
                        ? 'Recovery codes'
                        : 'Ready to enter'}
              </p>
              <h2 className="mt-3 text-3xl font-semibold tracking-tight text-slate-900">
                {step === 'details'
                  ? 'Create your account'
                  : step === 'verify'
                    ? 'Check your inbox'
                    : step === 'method'
                      ? 'Choose your security method'
                    : step === 'mfa'
                      ? 'Connect your authenticator app'
                      : step === 'backup'
                        ? 'Save your backup codes'
                        : 'Everything is secure'}
              </h2>
              <p className="mt-2 text-sm text-slate-500">
                {step === 'details'
                  ? 'Enter your organisation details and create the admin account.'
                  : step === 'verify'
                    ? `Enter the 6-digit verification code we sent to ${email}.`
                    : step === 'method'
                      ? 'Select your MFA method before you continue to enrollment. SMS is shown for the future version and is not available yet.'
                    : step === 'mfa'
                      ? 'Scan the QR code and enter the live 6-digit code from your authenticator app.'
                      : step === 'backup'
                        ? 'These one-time codes let you sign in if your authenticator device is unavailable.'
                        : 'Your Retail IMS account is verified, protected, and ready to use.'}
              </p>
            </div>

            {info ? (
              <div className="mb-4 rounded-xl border border-indigo-200 bg-indigo-50 px-4 py-3 text-sm text-indigo-900">
                {info}
              </div>
            ) : null}
            {err ? (
              <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
                {err}
              </div>
            ) : null}

            {step === 'details' ? (
              <form className="space-y-4" onSubmit={requestOtp}>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="companyName">Company name</Label>
                    <div className="relative">
                      <Building2 className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                      <Input
                        id="companyName"
                        value={companyName}
                        onChange={(event) => setCompanyName(event.target.value)}
                        className="h-12 rounded-xl bg-slate-50 pl-10"
                        placeholder="Acme Retail Pvt Ltd"
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="plantName">Plant name</Label>
                    <div className="relative">
                      <Factory className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                      <Input
                        id="plantName"
                        value={plantName}
                        onChange={(event) => setPlantName(event.target.value)}
                        className="h-12 rounded-xl bg-slate-50 pl-10"
                        placeholder="Head Office"
                      />
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="companyAddress">Company address</Label>
                  <div className="relative">
                    <MapPin className="pointer-events-none absolute left-3 top-3 h-4 w-4 text-slate-400" />
                    <textarea
                      id="companyAddress"
                      value={companyAddress}
                      onChange={(event) => setCompanyAddress(event.target.value)}
                      className="min-h-[92px] w-full rounded-xl border border-slate-200 bg-slate-50 px-10 py-3 text-sm text-slate-700 outline-none transition focus:border-indigo-300 focus:bg-white focus:ring-4 focus:ring-indigo-500/10"
                      placeholder="12 Industrial Estate, Mumbai"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="plantAddress">Plant address</Label>
                  <div className="relative">
                    <MapPin className="pointer-events-none absolute left-3 top-3 h-4 w-4 text-slate-400" />
                    <textarea
                      id="plantAddress"
                      value={plantAddress}
                      onChange={(event) => setPlantAddress(event.target.value)}
                      className="min-h-[92px] w-full rounded-xl border border-slate-200 bg-slate-50 px-10 py-3 text-sm text-slate-700 outline-none transition focus:border-indigo-300 focus:bg-white focus:ring-4 focus:ring-indigo-500/10"
                      placeholder="Main warehouse or head office address"
                    />
                  </div>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="contactPerson">Contact person</Label>
                    <div className="relative">
                      <User className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                      <Input
                        id="contactPerson"
                        value={contactPerson}
                        onChange={(event) => setContactPerson(event.target.value)}
                        className="h-12 rounded-xl bg-slate-50 pl-10"
                        placeholder="Priya Sharma"
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="mobile">Mobile</Label>
                    <div className="relative">
                      <Phone className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                      <Input
                        id="mobile"
                        value={mobile}
                        onChange={(event) => setMobile(event.target.value)}
                        className="h-12 rounded-xl bg-slate-50 pl-10"
                        placeholder="+91 9876543210"
                      />
                    </div>
                  </div>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="adminName">Admin name</Label>
                    <div className="relative">
                      <User className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                      <Input
                        id="adminName"
                        value={adminName}
                        onChange={(event) => setAdminName(event.target.value)}
                        className="h-12 rounded-xl bg-slate-50 pl-10"
                        placeholder="Alex Johnson"
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="email">Work email</Label>
                    <div className="relative">
                      <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                      <Input
                        id="email"
                        value={email}
                        onChange={(event) => setEmail(event.target.value)}
                        className="h-12 rounded-xl bg-slate-50 pl-10"
                        placeholder="alex@company.com"
                      />
                    </div>
                  </div>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="password">Password</Label>
                    <div className="relative">
                      <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                      <Input
                        id="password"
                        type={showPassword ? 'text' : 'password'}
                        value={password}
                        onChange={(event) => setPassword(event.target.value)}
                        className="h-12 rounded-xl bg-slate-50 pl-10 pr-10"
                        placeholder="SecurePass123!"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword((visible) => !visible)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 transition hover:text-slate-700"
                        aria-label={showPassword ? 'Hide password' : 'Show password'}
                      >
                        {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                    <PasswordStrengthBar password={password} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="confirmPassword">Confirm password</Label>
                    <div className="relative">
                      <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                      <Input
                        id="confirmPassword"
                        type={showPassword ? 'text' : 'password'}
                        value={confirmPassword}
                        onChange={(event) => setConfirmPassword(event.target.value)}
                        className="h-12 rounded-xl bg-slate-50 pl-10"
                        placeholder="Repeat password"
                      />
                    </div>
                  </div>
                </div>

                <Button className="h-12 w-full rounded-xl bg-slate-900 text-white hover:bg-slate-950" type="submit" disabled={isSubmitting || paying}>
                  {isSubmitting ? 'Sending verification code...' : 'Create account and verify email'}
                </Button>

                <p className="text-center text-sm text-slate-500">
                  Already registered?{' '}
                  <Link to="/login" className="font-medium text-indigo-600 hover:underline">
                    Sign in
                  </Link>
                </p>
              </form>
            ) : null}

            {step === 'verify' ? (
              <form className="space-y-5" onSubmit={verifyOtp}>
                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
                  <div className="mb-4 text-center">
                    <p className="text-sm font-medium text-slate-700">Verification code</p>
                    <p className="mt-1 text-xs text-slate-500">Enter the 6-digit code from your email.</p>
                  </div>
                  <OtpCodeInput value={otp} onChange={setOtp} autoFocus />
                </div>

                <Button className="h-12 w-full rounded-xl bg-indigo-600 text-white hover:bg-indigo-700" type="submit" disabled={isSubmitting || paying}>
                  {isSubmitting ? 'Verifying email...' : 'Verify email and continue'}
                </Button>

                <div className="flex items-center justify-between text-sm">
                  <button type="button" onClick={() => setStep('details')} className="font-medium text-slate-500 hover:text-slate-700">
                    Back
                  </button>
                  <button type="button" onClick={resendOtp} className="font-medium text-indigo-600 hover:text-indigo-700" disabled={isSubmitting}>
                    Resend code
                  </button>
                </div>
              </form>
            ) : null}

            {step === 'method' ? (
              <div className="space-y-5">
                <div className="grid gap-4 sm:grid-cols-2">
                  <button
                    type="button"
                    onClick={() => void beginMfaSetup(signupChallengeToken)}
                    disabled={isSubmitting}
                    className="rounded-2xl border border-indigo-300 bg-indigo-50 p-5 text-left shadow-sm transition hover:border-indigo-400 hover:bg-indigo-100 disabled:cursor-not-allowed disabled:opacity-70"
                  >
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-indigo-600 text-white">
                        <ShieldCheck className="h-5 w-5" />
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-slate-900">Authenticator app</p>
                        <p className="text-xs text-slate-600">Recommended for this release</p>
                      </div>
                    </div>
                    <p className="mt-4 text-sm text-slate-600">
                      Scan a QR code with Google Authenticator, Authy, 1Password, or another TOTP app.
                    </p>
                    <p className="mt-4 text-xs font-medium text-indigo-700">
                      {isSubmitting ? 'Opening authenticator setup...' : 'Choose this method'}
                    </p>
                  </button>

                  <button
                    type="button"
                    disabled
                    className="rounded-2xl border border-slate-200 bg-slate-50 p-5 text-left opacity-70"
                  >
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-300 text-slate-700">
                        <Phone className="h-5 w-5" />
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-slate-900">SMS</p>
                        <p className="text-xs text-slate-600">Coming soon</p>
                      </div>
                    </div>
                    <p className="mt-4 text-sm text-slate-500">
                      SMS selection is shown here to match the planned experience, but it is not active in v1.
                    </p>
                  </button>
                </div>

                <Button
                  type="button"
                  variant="outline"
                  className="h-12 w-full rounded-xl border-slate-300"
                  onClick={() => void completeSignup(true)}
                  disabled={isSubmitting}
                >
                  {isSubmitting ? 'Creating account without MFA...' : 'Skip MFA for now'}
                </Button>

                <button
                  type="button"
                  onClick={() => setStep('verify')}
                  className="text-sm font-medium text-slate-500 hover:text-slate-700"
                >
                  Back to email verification
                </button>
              </div>
            ) : null}

            {step === 'mfa' && mfaSetup ? (
              <form className="space-y-5" onSubmit={verifyTotp}>
                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
                  <div className="grid gap-5 sm:grid-cols-[auto_1fr] sm:items-start">
                    {mfaSetup.qrCodeDataUrl ? (
                      <div className="rounded-2xl border border-slate-200 bg-white p-3 shadow-sm">
                        <img src={mfaSetup.qrCodeDataUrl} alt="Authenticator QR code" className="h-36 w-36 rounded-lg" />
                      </div>
                    ) : (
                      <div className="flex h-42 w-42 items-center justify-center rounded-2xl border border-dashed border-slate-300 bg-white p-4 text-center text-xs text-slate-500 shadow-sm">
                        QR preview is unavailable right now. Enter the manual code below in your authenticator app.
                      </div>
                    )}
                    <div className="space-y-3">
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                          {mfaSetup.qrCodeDataUrl ? 'Scan this QR code' : 'Set up with the manual code'}
                        </p>
                        <p className="mt-1 text-sm text-slate-600">
                          Use Google Authenticator, Authy, 1Password, or another TOTP app.
                        </p>
                      </div>
                      <div className="rounded-xl bg-slate-900 p-3 text-slate-100">
                        <p className="text-xs uppercase tracking-[0.18em] text-slate-400">Manual code</p>
                        <code className="mt-1 block break-all text-sm tracking-[0.18em]">{mfaSetup.manualCode}</code>
                      </div>
                      <p className="text-xs text-slate-500">
                        Enrollment challenge expires at {new Date(mfaSetup.expiresAt).toLocaleTimeString()}.
                      </p>
                      <p className="text-xs font-medium text-slate-600">
                        {mfaSetup.attemptsRemaining} verification attempt(s) remaining.
                      </p>
                    </div>
                  </div>
                </div>

                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
                  <div className="mb-4 text-center">
                    <p className="text-sm font-medium text-slate-700">Authenticator code</p>
                    <p className="mt-1 text-xs text-slate-500">Enter the live 6-digit code from your app.</p>
                  </div>
                  <OtpCodeInput value={totpCode} onChange={setTotpCode} autoFocus />
                </div>

                <Button className="h-12 w-full rounded-xl bg-indigo-600 text-white hover:bg-indigo-700" type="submit" disabled={isSubmitting}>
                  {isSubmitting ? 'Verifying authenticator...' : 'Verify authenticator and generate backup codes'}
                </Button>

                <div className="flex items-center justify-between text-sm">
                  <button
                    type="button"
                    onClick={() => {
                      setTotpCode('');
                      setErr('');
                    }}
                    className="font-medium text-indigo-600 hover:text-indigo-700"
                  >
                    Try another code
                  </button>
                  <button
                    type="button"
                    onClick={() => void restartMfaSetup()}
                    className="font-medium text-slate-500 hover:text-slate-700"
                    disabled={isSubmitting}
                  >
                    Restart setup
                  </button>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  className="h-12 w-full rounded-xl border-slate-300"
                  onClick={() => void completeSignup(true)}
                  disabled={isSubmitting}
                >
                  {isSubmitting ? 'Creating account without MFA...' : 'Skip MFA for now'}
                </Button>
              </form>
            ) : null}

            {step === 'backup' ? (
              <div className="space-y-5">
                <BackupCodesCard codes={backupCodes} />
                <Button
                  className="h-12 w-full rounded-xl bg-indigo-600 text-white hover:bg-indigo-700"
                  type="button"
                  onClick={() => void completeSignup()}
                  disabled={isSubmitting}
                >
                  {isSubmitting ? 'Creating your account...' : 'I have saved my backup codes'}
                </Button>
              </div>
            ) : null}

            {step === 'complete' ? (
              <div className="space-y-6 text-center">
                <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full border border-emerald-200 bg-emerald-50">
                  <ShieldCheck className="h-10 w-10 text-emerald-600" />
                </div>
                <div>
                  <h3 className="text-3xl font-semibold text-slate-900">You are all set</h3>
                  <p className="mt-2 text-sm text-slate-500">
                    {mfaSkipped
                      ? 'Your account is created with email verification, and you can enable authenticator MFA later.'
                      : 'Your account has email verification, authenticator MFA, and backup recovery codes.'}
                  </p>
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-800">
                    Email verified
                  </div>
                  <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-800">
                    {mfaSkipped ? 'MFA skipped for now' : 'Authenticator enabled'}
                  </div>
                  <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-800">
                    {mfaSkipped ? 'Enable MFA later in settings' : 'Backup codes created'}
                  </div>
                  <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-800">
                    Workspace secured
                  </div>
                </div>
                <Button className="h-12 w-full rounded-xl bg-slate-900 text-white hover:bg-slate-950" type="button" onClick={() => finalizeSignIn(pendingAuthPayload)} disabled={!pendingAuthPayload}>
                  Sign in to Retail IMS
                </Button>
              </div>
            ) : null}
          </Reveal>
        </div>
      </div>
    </div>
  );
}

export default SignupPage;

