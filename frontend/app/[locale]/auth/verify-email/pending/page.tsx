'use client';

import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useCallback, useEffect, useState, Suspense } from 'react';
import {
  Mail, Loader2, AlertTriangle, MailOpen, ArrowLeft,
  Clock, RefreshCw, Pen, CheckCircle2, ShieldCheck, Sparkles,
} from 'lucide-react';
import { useTranslation } from '@/contexts/LanguageContext';
import { Button } from '@/components/ui/button';
import { AuthService } from '@/lib/api/auth';
import { toast } from 'sonner';

const RESEND_COOLDOWN_SEC = 60;

/* Brand colors */
const PINK = '#E8177D';
const PURPLE = '#8B1CC8';

function VerifyEmailPendingInner() {
  const { t, locale } = useTranslation();
  const searchParams = useSearchParams();
  const email = searchParams?.get('email') ?? '';
  const returnUrl = searchParams?.get('returnUrl') ?? '';
  const startTrial = searchParams?.get('startTrial') === '1';
  const checkoutCycle = searchParams?.get('checkoutCycle') ?? '';
  const source = searchParams?.get('source') ?? '';
  const plan = searchParams?.get('plan') ?? '';
  const fromInvite = searchParams?.get('invite') === '1';
  const emailSentParam = searchParams?.get('emailSent');
  const emailWasSent = emailSentParam !== 'false';
  const emailError = searchParams?.get('emailError') ?? '';

  const [cooldown, setCooldown] = useState(0);
  const [sending, setSending] = useState(false);
  const [resendError, setResendError] = useState('');
  const [showChangeEmail, setShowChangeEmail] = useState(false);
  const [newEmail, setNewEmail] = useState('');
  const [changingEmail, setChangingEmail] = useState(false);
  const [changeEmailError, setChangeEmailError] = useState('');
  const [changeEmailSuccess, setChangeEmailSuccess] = useState(false);

  useEffect(() => {
    if (cooldown <= 0) return;
    const tmr = setInterval(() => setCooldown((c) => (c <= 1 ? 0 : c - 1)), 1000);
    return () => clearInterval(tmr);
  }, [cooldown]);

  const handleResend = useCallback(async () => {
    if (!email.trim() || cooldown > 0 || sending) return;
    setSending(true);
    setResendError('');
    try {
      await AuthService.resendVerification(email.trim());
      toast.success(t('auth.verifyResendToast') || 'Verification email sent');
      setCooldown(RESEND_COOLDOWN_SEC);
    } catch (e: unknown) {
      const msg =
        e && typeof e === 'object' && 'response' in e
          ? (e as { response?: { data?: { message?: string } } }).response?.data?.message
          : null;
      const errorText = typeof msg === 'string' ? msg : 'Could not send verification email. Please try again later.';
      setResendError(errorText);
      toast.error(errorText);
    } finally {
      setSending(false);
    }
  }, [email, cooldown, sending, t]);

  const handleChangeEmail = useCallback(async () => {
    if (!newEmail.trim() || changingEmail) return;
    setChangingEmail(true);
    setChangeEmailError('');
    setChangeEmailSuccess(false);
    try {
      await AuthService.changeEmail(email.trim(), newEmail.trim());
      setChangeEmailSuccess(true);
      toast.success(t('auth.verifyPending.changeEmailToast'));
      setTimeout(() => { window.location.reload(); }, 2000);
    } catch (e: unknown) {
      const msg =
        e && typeof e === 'object' && 'response' in e
          ? (e as { response?: { data?: { message?: string } } }).response?.data?.message
          : null;
      const errorText = typeof msg === 'string' ? msg : 'Could not update email. Please try again.';
      setChangeEmailError(errorText);
      toast.error(errorText);
    } finally {
      setChangingEmail(false);
    }
  }, [newEmail, email, changingEmail, t]);

  const loginQs = new URLSearchParams();
  if (returnUrl) loginQs.set('returnUrl', returnUrl);
  if (startTrial) loginQs.set('startTrial', '1');
  if (checkoutCycle) loginQs.set('checkoutCycle', checkoutCycle);
  if (source) loginQs.set('source', source);
  if (plan) loginQs.set('plan', plan);
  const loginHref = `/${locale}/auth/login${loginQs.toString() ? `?${loginQs.toString()}` : ''}`;

  const isSuccess = emailWasSent && !fromInvite;
  const isWarning = !emailWasSent && !fromInvite;

  // ─── Invite flow ───
  if (fromInvite) {
    return (
      <PageShell>
        <div className="auth-card text-center overflow-hidden">
          {/* Top gradient bar */}
          <div className="absolute top-0 left-0 right-0 h-1.5" style={{ background: `linear-gradient(90deg, ${PINK}, ${PURPLE})` }} />
          <div className="pt-2">
            <IconCircle variant="success" />
            <h2 className="text-2xl font-bold tracking-tight text-foreground mt-2">{t('auth.verifyInviteNote')}</h2>
            <div className="mt-8">
              <Link href={loginHref}>
                <GradientButton full>{t('auth.verifyGoLogin')}</GradientButton>
              </Link>
            </div>
          </div>
        </div>
      </PageShell>
    );
  }

  return (
    <PageShell>
      <div className="auth-card relative overflow-hidden">
        {/* Top gradient bar */}
        <div className="absolute top-0 left-0 right-0 h-1.5" style={{ background: `linear-gradient(90deg, ${PINK}, ${PURPLE})` }} />

        {/* ─── Success state ─── */}
        {isSuccess && (
          <div className="pt-2">
            {/* Step progress */}
            <StepProgress />

            {/* Icon */}
            <IconCircle variant="success" />

            {/* Title */}
            <div className="text-center mt-2 mb-6">
              <h1 className="text-[26px] font-extrabold tracking-tight text-foreground">
                {t('auth.verifyPendingTitle')}
              </h1>
              <p className="mt-2.5 text-[15px] text-muted-foreground leading-relaxed max-w-sm mx-auto">
                {t('auth.verifyPending.successLead')}
              </p>
            </div>

            {/* Email pill */}
            {email && (
              <div
                className="rounded-2xl p-[1px] mx-auto max-w-sm"
                style={{ background: `linear-gradient(135deg, ${PINK}30, ${PURPLE}30)` }}
              >
                <div className="rounded-2xl bg-card p-4">
                  <div className="flex items-center gap-3.5">
                    <div
                      className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-xl shadow-lg"
                      style={{ background: `linear-gradient(135deg, ${PINK}, ${PURPLE})` }}
                    >
                      <Mail className="h-5 w-5 text-white" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-bold text-foreground truncate">{email}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {t('auth.verifyPending.emailHelper')}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Help section */}
            <div className="mt-7 space-y-2.5">
              <p className="text-sm font-bold text-foreground text-center">
                {t('auth.verifyPending.notReceived')}
              </p>

              {/* Spam card */}
              <div className="rounded-xl border border-amber-200/70 bg-gradient-to-r from-amber-50/80 to-orange-50/50 p-4 dark:border-amber-800/30 dark:from-amber-950/20 dark:to-orange-950/10">
                <div className="flex items-start gap-3">
                  <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg bg-amber-100 dark:bg-amber-900/30">
                    <ShieldCheck className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                  </div>
                  <div>
                    <p className="text-[13px] font-semibold text-amber-900 dark:text-amber-100">
                      {t('auth.verifyPending.spamTitle')}
                    </p>
                    <p className="text-xs text-amber-700/80 dark:text-amber-300/60 mt-1 leading-relaxed">
                      {t('auth.verifyPending.spamHint')}
                    </p>
                  </div>
                </div>
              </div>

              {/* Timer card */}
              <div className="flex items-center gap-3 rounded-xl border border-border/50 bg-muted/20 p-3.5">
                <Clock className="h-4 w-4 flex-shrink-0 text-muted-foreground" />
                <p className="text-xs text-muted-foreground">
                  {t('auth.verifyPending.linkExpires24h')}
                </p>
              </div>
            </div>

            {/* Error */}
            {resendError && (
              <div className="mt-4 flex gap-3 rounded-xl border border-red-200/60 bg-red-50/50 p-3.5 dark:border-red-800/40 dark:bg-red-950/20">
                <AlertTriangle className="mt-0.5 h-4 w-4 flex-shrink-0 text-red-500" />
                <p className="text-xs text-red-600 dark:text-red-400">{resendError}</p>
              </div>
            )}

            {/* Actions */}
            <div className="mt-8 space-y-3">
              {email && (
                <button
                  type="button"
                  className="w-full h-[50px] rounded-2xl font-semibold text-[15px] transition-all duration-200 disabled:opacity-40 border-2 hover:scale-[1.01] active:scale-[0.99]"
                  style={{
                    borderColor: PINK,
                    color: sending || cooldown > 0 ? '#999' : PINK,
                    background: 'transparent',
                  }}
                  disabled={sending || cooldown > 0}
                  onClick={handleResend}
                >
                  {sending ? (
                    <span className="inline-flex items-center gap-2">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      {t('auth.verifyPending.sending')}
                    </span>
                  ) : cooldown > 0 ? (
                    <span className="inline-flex items-center gap-2">
                      <Clock className="h-4 w-4" />
                      {t('auth.verifyPending.resendWithSeconds', { seconds: cooldown })}
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-2">
                      <RefreshCw className="h-4 w-4" />
                      {t('auth.verifyPending.resendVerification')}
                    </span>
                  )}
                </button>
              )}

              {/* Change email */}
              <button
                type="button"
                className="w-full h-11 rounded-xl text-sm text-muted-foreground hover:text-foreground transition-all inline-flex items-center justify-center gap-2"
                onClick={() => setShowChangeEmail(!showChangeEmail)}
              >
                <Pen className="h-3.5 w-3.5" />
                {t('auth.verifyPending.changeEmail')}
              </button>

              {/* Change email form */}
              {showChangeEmail && (
                <div
                  className="rounded-2xl p-[1px]"
                  style={{ background: `linear-gradient(135deg, ${PINK}20, ${PURPLE}20)` }}
                >
                  <div className="rounded-2xl bg-card p-5">
                    {changeEmailSuccess ? (
                      <div className="flex items-center gap-3">
                        <CheckCircle2 className="h-5 w-5 flex-shrink-0 text-emerald-500" />
                        <div>
                          <p className="text-sm font-semibold text-emerald-700 dark:text-emerald-300">
                            {t('auth.verifyPending.emailUpdated')}
                          </p>
                          <p className="text-xs text-muted-foreground mt-0.5">
                            {t('auth.verifyPending.newLinkSent')}
                          </p>
                        </div>
                      </div>
                    ) : (
                      <form onSubmit={(e) => { e.preventDefault(); handleChangeEmail(); }}>
                        <p className="text-xs text-muted-foreground mb-3">
                          {t('auth.verifyPending.enterCorrectEmail')}
                        </p>
                        <input
                          type="email"
                          placeholder={t('auth.verifyPending.newEmailPlaceholder')}
                          value={newEmail}
                          onChange={(e) => setNewEmail(e.target.value)}
                          className="w-full h-11 rounded-xl border border-border/80 bg-background px-4 text-sm transition-all"
                          style={{ outline: 'none' }}
                          onFocus={(e) => { e.target.style.borderColor = PINK + '60'; e.target.style.boxShadow = `0 0 0 3px ${PINK}15`; }}
                          onBlur={(e) => { e.target.style.borderColor = ''; e.target.style.boxShadow = ''; }}
                          disabled={changingEmail}
                          required
                        />
                        {changeEmailError && (
                          <p className="text-xs text-red-600 dark:text-red-400 mt-2">{changeEmailError}</p>
                        )}
                        <div className="flex gap-2 mt-3">
                          <button
                            type="submit"
                            className="flex-1 h-10 rounded-xl text-white text-sm font-semibold transition-all disabled:opacity-50 inline-flex items-center justify-center gap-1.5"
                            style={{ background: `linear-gradient(135deg, ${PINK}, ${PURPLE})` }}
                            disabled={changingEmail || !newEmail.trim()}
                          >
                            {changingEmail ? (
                              <><Loader2 className="h-3.5 w-3.5 animate-spin" /> {t('auth.verifyPending.updating')}</>
                            ) : (
                              <><Pen className="h-3.5 w-3.5" /> {t('auth.verifyPending.update')}</>
                            )}
                          </button>
                          <Button
                            type="button"
                            variant="ghost"
                            className="h-10 rounded-xl text-sm"
                            onClick={() => { setShowChangeEmail(false); setNewEmail(''); setChangeEmailError(''); }}
                          >
                            {t('auth.verifyPending.cancel')}
                          </Button>
                        </div>
                      </form>
                    )}
                  </div>
                </div>
              )}

              {/* Divider */}
              <div className="relative py-2">
                <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-border/40" /></div>
              </div>

              {/* Back to login */}
              <div className="text-center">
                <Link
                  href={loginHref}
                  className="group inline-flex items-center text-sm text-muted-foreground hover:text-foreground transition-colors"
                >
                  <ArrowLeft className="mr-1.5 h-4 w-4 transition-transform group-hover:-translate-x-0.5" />
                  {t('auth.verifyBackLogin')}
                </Link>
              </div>
            </div>
          </div>
        )}

        {/* ─── Warning state ─── */}
        {isWarning && (
          <div className="pt-2">
            <IconCircle variant="warning" />

            <div className="text-center mt-2 mb-6">
              <h1 className="text-[26px] font-extrabold tracking-tight text-foreground">
                {t('auth.verifyPending.deliveryIssueTitle')}
              </h1>
              <p className="mt-2.5 text-[15px] text-muted-foreground leading-relaxed max-w-sm mx-auto">
                {t('auth.verifyPending.deliveryIssueBody')}
              </p>
            </div>

            {email && (
              <div className="rounded-xl border border-amber-200/60 bg-amber-50/50 p-4 dark:border-amber-800/40 dark:bg-amber-950/20">
                <div className="flex items-start gap-3">
                  <AlertTriangle className="mt-0.5 h-5 w-5 flex-shrink-0 text-amber-500" />
                  <div>
                    <p className="text-sm font-semibold text-amber-900 dark:text-amber-100">
                      {t('auth.verifyPending.emailNotSentTitle')}
                    </p>
                    <p className="text-xs text-amber-700/80 dark:text-amber-300/70 mt-1">
                      {t('auth.verifyPending.emailNotSentBody')}
                    </p>
                    {emailError && <p className="text-xs text-amber-600/60 mt-1 font-mono break-all">{emailError}</p>}
                  </div>
                </div>
              </div>
            )}

            {resendError && (
              <div className="mt-4 flex gap-3 rounded-xl border border-red-200/60 bg-red-50/50 p-3.5 dark:border-red-800/40 dark:bg-red-950/20">
                <AlertTriangle className="mt-0.5 h-4 w-4 flex-shrink-0 text-red-500" />
                <p className="text-xs text-red-600 dark:text-red-400">{resendError}</p>
              </div>
            )}

            <div className="mt-8 space-y-3">
              {email && (
                <GradientButton full onClick={handleResend} disabled={sending || cooldown > 0}>
                  {sending ? (
                    <span className="inline-flex items-center gap-2"><Loader2 className="h-4 w-4 animate-spin" /> {t('auth.verifyPending.sending')}</span>
                  ) : cooldown > 0 ? (
                    <span className="inline-flex items-center gap-2"><Clock className="h-4 w-4" /> {t('auth.verifyPending.resendWithSeconds', { seconds: cooldown })}</span>
                  ) : (
                    <span className="inline-flex items-center gap-2"><RefreshCw className="h-4 w-4" /> {t('auth.verifyPending.resendVerification')}</span>
                  )}
                </GradientButton>
              )}
              <div className="text-center pt-2">
                <Link href={loginHref} className="group inline-flex items-center text-sm text-muted-foreground hover:text-foreground transition-colors">
                  <ArrowLeft className="mr-1.5 h-4 w-4 transition-transform group-hover:-translate-x-0.5" />
                  {t('auth.verifyBackLogin')}
                </Link>
              </div>
            </div>
          </div>
        )}
      </div>
    </PageShell>
  );
}

/* ── Shared UI pieces ── */

function PageShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 w-screen h-screen overflow-y-auto bg-background">
      {/* Background decorations */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute -top-40 -right-40 h-[500px] w-[500px] rounded-full opacity-[0.04]" style={{ background: `radial-gradient(circle, ${PINK}, transparent 70%)` }} />
        <div className="absolute -bottom-40 -left-40 h-[500px] w-[500px] rounded-full opacity-[0.04]" style={{ background: `radial-gradient(circle, ${PURPLE}, transparent 70%)` }} />
      </div>
      <div className="relative min-h-full w-full flex items-center justify-center px-4 py-16">
        <div className="relative w-full max-w-[480px] mx-auto">
          {children}
        </div>
      </div>
    </div>
  );
}

function IconCircle({ variant }: { variant: 'success' | 'warning' }) {
  const isSuccess = variant === 'success';
  return (
    <div className="relative mx-auto mb-6 flex items-center justify-center" style={{ width: 88, height: 88 }}>
      {/* Glow */}
      <div
        className="absolute inset-0 rounded-full blur-2xl opacity-25"
        style={{ background: isSuccess ? `linear-gradient(135deg, ${PINK}, ${PURPLE})` : 'linear-gradient(135deg, #f59e0b, #ef4444)' }}
      />
      {/* Outer ring */}
      <div
        className="relative flex h-20 w-20 items-center justify-center rounded-full"
        style={{
          background: isSuccess
            ? `linear-gradient(135deg, ${PINK}15, ${PURPLE}15)`
            : `linear-gradient(135deg, #fef3c720, #fef08a20)`,
          boxShadow: isSuccess ? `0 0 0 1px ${PINK}25` : '0 0 0 1px #fbbf2440',
        }}
      >
        {/* Inner */}
        <div
          className="flex h-14 w-14 items-center justify-center rounded-full shadow-lg"
          style={{ background: isSuccess ? `linear-gradient(135deg, ${PINK}, ${PURPLE})` : 'linear-gradient(135deg, #f59e0b, #ef4444)' }}
        >
          {isSuccess ? <MailOpen className="h-6 w-6 text-white" /> : <AlertTriangle className="h-6 w-6 text-white" />}
        </div>
      </div>
      {/* Badge */}
      {isSuccess && (
        <div className="absolute -bottom-0.5 -right-0.5 flex h-7 w-7 items-center justify-center rounded-full shadow-md ring-[3px] ring-card" style={{ background: '#10b981' }}>
          <Sparkles className="h-3.5 w-3.5 text-white" />
        </div>
      )}
    </div>
  );
}

function StepProgress() {
  const { t } = useTranslation();
  const steps = [t('auth.verifyPending.stepSignup'), t('auth.verifyPending.stepVerify'), t('auth.verifyPending.stepAccess')];

  return (
    <div className="flex items-center justify-center gap-1 mb-8">
      {steps.map((label, i) => (
        <div key={label} className="flex items-center gap-1">
          <div className="flex flex-col items-center gap-1.5">
            <div
              className="flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold transition-all"
              style={
                i === 0
                  ? { background: '#10b981', color: '#fff' }
                  : i === 1
                    ? { background: `linear-gradient(135deg, ${PINK}, ${PURPLE})`, color: '#fff', boxShadow: `0 0 12px ${PINK}40` }
                    : { background: 'hsl(var(--muted))', color: 'hsl(var(--muted-foreground))' }
              }
            >
              {i === 0 ? <CheckCircle2 className="h-4 w-4" /> : i + 1}
            </div>
            <span
              className="text-[10px] font-semibold"
              style={{ color: i === 1 ? PINK : i === 0 ? '#10b981' : 'hsl(var(--muted-foreground))' }}
            >
              {label}
            </span>
          </div>
          {i < steps.length - 1 && (
            <div
              className="h-[2px] w-10 mb-5 rounded-full"
              style={{ background: i === 0 ? '#10b981' : 'hsl(var(--border))' }}
            />
          )}
        </div>
      ))}
    </div>
  );
}

function GradientButton({ children, full, onClick, disabled }: {
  children: React.ReactNode;
  full?: boolean;
  onClick?: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`${full ? 'w-full' : ''} h-[50px] rounded-2xl text-white font-semibold text-[15px] shadow-lg transition-all duration-200 hover:shadow-xl hover:scale-[1.01] active:scale-[0.99] disabled:opacity-40 disabled:hover:scale-100`}
      style={{ background: `linear-gradient(135deg, ${PINK}, ${PURPLE})` }}
    >
      {children}
    </button>
  );
}

export default function VerifyEmailPendingPage() {
  return (
    <Suspense
      fallback={
        <PageShell>
          <div className="auth-card">
            <div className="flex flex-col items-center justify-center py-14">
              <div
                className="flex h-16 w-16 items-center justify-center rounded-full"
                style={{ background: `linear-gradient(135deg, ${PINK}15, ${PURPLE}15)` }}
              >
                <Mail className="h-7 w-7" style={{ color: PINK }} />
              </div>
              <Loader2 className="mt-6 h-6 w-6 animate-spin" style={{ color: PINK }} />
            </div>
          </div>
        </PageShell>
      }
    >
      <VerifyEmailPendingInner />
    </Suspense>
  );
}
