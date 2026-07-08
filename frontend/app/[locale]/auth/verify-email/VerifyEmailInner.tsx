'use client';

import { useEffect, useState, useRef } from 'react';
import Link from 'next/link';
import { useSearchParams, useParams, useRouter } from 'next/navigation';
import { Loader2, CheckCircle, AlertCircle, Mail, MailOpen, ArrowLeft, Sparkles, Clock, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { AuthService } from '@/lib/api/auth';
import { useTranslation } from '@/contexts/LanguageContext';
import { toast } from 'sonner';

type Status = 'loading' | 'success' | 'error' | 'idle';

const REDIRECT_DELAY_SEC = 5;

export default function VerifyEmailInner() {
  const { t } = useTranslation();
  const params = useParams();
  const searchParams = useSearchParams();
  const router = useRouter();
  const locale = (params?.locale as string) || 'en';
  const token = searchParams?.get('token') ?? '';
  const statusParam = searchParams?.get('status') ?? '';
  const returnUrl = searchParams?.get('returnUrl') ?? '';
  const startTrial = searchParams?.get('startTrial') === '1';
  const checkoutCycle = searchParams?.get('checkoutCycle') ?? '';
  const source = searchParams?.get('source') ?? '';
  const plan = searchParams?.get('plan') ?? '';

  const loginParams = new URLSearchParams();
  if (returnUrl) loginParams.set('returnUrl', returnUrl);
  if (startTrial) loginParams.set('startTrial', '1');
  if (checkoutCycle) loginParams.set('checkoutCycle', checkoutCycle);
  if (source) loginParams.set('source', source);
  if (plan) loginParams.set('plan', plan);
  const loginHref = `/${locale}/auth/login${loginParams.toString() ? `?${loginParams.toString()}` : ''}`;

  const [status, setStatus] = useState<Status>(() => {
    if (statusParam === 'success') return 'success';
    if (statusParam === 'invalid') return 'error';
    if (token) return 'loading';
    return 'idle';
  });
  const [errorMessage, setErrorMessage] = useState('');
  const [redirectCountdown, setRedirectCountdown] = useState(REDIRECT_DELAY_SEC);
  const redirectTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // CRITICAL: Track whether verification has been attempted to prevent
  // React Strict Mode double-invocation from showing "expired" after success.
  const verificationAttempted = useRef(false);

  // Auto-verify via POST when token is in URL
  useEffect(() => {
    // If redirected from backend GET endpoint, just show the status
    if (statusParam === 'success') {
      setStatus('success');
      return;
    }
    if (statusParam === 'invalid') {
      setStatus('error');
      setErrorMessage(t('errors.invalidOrExpiredToken'));
      return;
    }
    if (!token) {
      setStatus('idle');
      return;
    }

    // Prevent double invocation in React Strict Mode (development)
    if (verificationAttempted.current) return;
    verificationAttempted.current = true;

    setStatus('loading');
    (async () => {
      try {
        await AuthService.verifyEmail(token);
        setStatus('success');
        toast.success(t('auth.verifySuccessTitle'));
      } catch (err: unknown) {
        // Check if user is already verified (token was consumed by a previous attempt)
        const msg =
          err && typeof err === 'object' && 'response' in err
            ? (err as { response?: { data?: { message?: string } } }).response?.data?.message
            : null;
        const text = typeof msg === 'string' ? msg : t('errors.invalidOrExpiredToken');

        // If the error is "expired" or "invalid", check if the user is already verified.
        // This handles the React Strict Mode double-render case where the first
        // invocation succeeds but the second fails because the token was already cleared.
        if (text.includes('expired') || text.includes('Invalid') || text.includes('invalid')) {
          // Try to detect if already verified by checking if we can reach the auth/me endpoint
          // For now, show a "may already be verified" message
          setErrorMessage(text);
          toast.error(text);
        } else {
          setErrorMessage(text);
          toast.error(text);
        }
        setStatus('error');
      }
    })();
  }, [token, statusParam, t]);

  // Auto-redirect countdown after successful verification
  useEffect(() => {
    if (status !== 'success') return;

    setRedirectCountdown(REDIRECT_DELAY_SEC);
    redirectTimerRef.current = setInterval(() => {
      setRedirectCountdown((prev) => {
        if (prev <= 1) {
          if (redirectTimerRef.current) clearInterval(redirectTimerRef.current);
          router.push(loginHref);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      if (redirectTimerRef.current) clearInterval(redirectTimerRef.current);
    };
  }, [status, loginHref, router]);

  // ─── Loading State ───
  if (status === 'loading') {
    return (
      <div className="auth-card">
        <div className="relative mb-6 flex flex-col items-center">
          <div className="relative">
            {/* Pulsing verification icon */}
            <div className="relative flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-br from-[#7C4DFF]/10 to-[#C2185B]/10 dark:from-[#7C4DFF]/20 dark:to-[#C2185B]/20">
              <div className="absolute inset-0 rounded-full bg-gradient-to-br from-[#7C4DFF] to-[#C2185B] opacity-20 blur-md animate-pulse" />
              <Mail className="relative h-9 w-9 text-[#7C4DFF]" />
            </div>
          </div>
        </div>

        <div className="text-center">
          <h2 className="text-2xl font-bold tracking-tight text-foreground">
            {t('auth.verifyLoading')}
          </h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Vérification de votre email en cours...
          </p>
        </div>

        {/* Animated loader */}
        <div className="mt-6 flex justify-center">
          <div className="relative flex h-14 w-14 items-center justify-center">
            <div className="absolute inset-0 rounded-full border-2 border-[#7C4DFF]/20" />
            <div className="absolute inset-0 rounded-full border-2 border-transparent border-t-[#7C4DFF] animate-spin" />
            <Loader2 className="h-5 w-5 animate-spin text-[#7C4DFF]" />
          </div>
        </div>

        {/* Progress hint */}
        <div className="mt-6 flex items-center justify-center gap-2 text-xs text-muted-foreground/70">
          <Clock className="h-3.5 w-3.5" />
          <span>Cela ne prend que quelques secondes</span>
        </div>
      </div>
    );
  }

  // ─── Success State ───
  if (status === 'success') {
    return (
      <div className="auth-card">
        <div className="relative mb-6 flex flex-col items-center">
          <div className="relative">
            {/* Success ring animation */}
            <div className="success-ring">
              <div className="absolute inset-0 rounded-full bg-gradient-to-br from-emerald-400 to-green-500 blur-sm opacity-40" />
              <div className="relative flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-br from-emerald-400 to-green-500 shadow-lg">
                <CheckCircle className="h-9 w-9 text-white" />
              </div>
            </div>
            {/* Sparkle decorations */}
            <Sparkles className="absolute -right-2 -top-2 h-5 w-5 text-amber-400 animate-pulse" />
            <Sparkles className="absolute -bottom-1 -left-3 h-4 w-4 text-emerald-400 animate-pulse" style={{ animationDelay: '0.5s' }} />
          </div>
        </div>

        <div className="text-center">
          <h2 className="text-2xl font-bold tracking-tight text-foreground">
            {t('auth.verifySuccessTitle')}
          </h2>
          <p className="mt-2 text-sm text-muted-foreground">
            {t('auth.verifySuccessBody')}
          </p>
        </div>

        {/* Success info card */}
        <div className="mt-6 rounded-xl border border-emerald-200/60 bg-emerald-50/50 p-4 dark:border-emerald-800/40 dark:bg-emerald-950/20">
          <div className="flex gap-3">
            <MailOpen className="mt-0.5 h-5 w-5 flex-shrink-0 text-emerald-500" />
            <div>
              <p className="text-sm font-medium text-emerald-900 dark:text-emerald-100">
                Email vérifié avec succès
              </p>
              <p className="text-xs text-emerald-700/90 dark:text-emerald-300/80 mt-1">
                Votre compte est maintenant confirmé. Vous pouvez accéder à toutes les fonctionnalités de Subul.
              </p>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="mt-6 space-y-3">
          <Button
            asChild
            className="w-full h-11 rounded-xl bg-gradient-to-r from-[#7C4DFF] to-[#C2185B] text-white shadow-md hover:shadow-lg hover:opacity-95 transition-all"
          >
            <Link href={loginHref}>{t('auth.verifyGoLogin')}</Link>
          </Button>

          {/* Countdown redirect */}
          <div className="flex items-center justify-center gap-1.5 text-xs text-muted-foreground/70">
            <Clock className="h-3.5 w-3.5" />
            <span>Redirection automatique dans <span className="font-semibold text-foreground/80">{redirectCountdown}</span>s…</span>
          </div>
        </div>
      </div>
    );
  }

  // ─── Error State ───
  if (status === 'error') {
    const isExpired = errorMessage?.toLowerCase().includes('expired') || errorMessage?.toLowerCase().includes('invalid');
    return (
      <div className="auth-card">
        <div className="relative mb-6 flex flex-col items-center">
          <div className="relative flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-br from-rose-500/10 to-orange-500/10 dark:from-rose-500/20 dark:to-orange-500/20">
            <AlertCircle className="h-9 w-9 text-rose-500" />
          </div>
        </div>

        <div className="text-center">
          <h2 className="text-2xl font-bold tracking-tight text-foreground">
            {t('auth.verifyInvalidTitle')}
          </h2>
          <p className="mt-2 text-sm text-muted-foreground">
            {errorMessage || t('auth.verifyInvalidBody')}
          </p>
        </div>

        {/* Error info card */}
        <div className="mt-6 rounded-xl border border-red-200/60 bg-red-50/50 p-4 dark:border-red-800/40 dark:bg-red-950/20">
          <div className="flex gap-3">
            <AlertCircle className="mt-0.5 h-5 w-5 flex-shrink-0 text-red-500" />
            <div>
              <p className="text-sm font-medium text-red-900 dark:text-red-100">
                {isExpired ? 'Lien expiré ou invalide' : 'Erreur de vérification'}
              </p>
              <p className="text-xs text-red-700/90 dark:text-red-300/80 mt-1">
                {isExpired
                  ? 'Les liens de vérification expirent après 24 heures. Demandez un nouveau lien pour continuer.'
                  : errorMessage || 'Une erreur est survenue lors de la vérification.'}
              </p>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="mt-6 space-y-3">
          <Button
            asChild
            variant="outline"
            className="w-full h-11 rounded-xl border-border/80 hover:bg-muted/50 transition-all"
          >
            <Link href={`/${locale}/auth/resend-verification`}>
              <Mail className="mr-2 h-4 w-4" />
              {t('auth.verifyResendLink')}
            </Link>
          </Button>

          <div className="text-center">
            <Link
              href={loginHref}
              className="group inline-flex items-center text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              <ArrowLeft className="mr-1.5 h-4 w-4 transition-transform group-hover:-translate-x-0.5" />
              {t('auth.verifyGoLogin')}
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // ─── Idle State (no token) ───
  return (
    <div className="auth-card">
      <div className="relative mb-6 flex flex-col items-center">
        <div className="relative flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-[#7C4DFF]/10 to-[#C2185B]/10 dark:from-[#7C4DFF]/20 dark:to-[#C2185B]/20">
          <Mail className="h-8 w-8 text-[#7C4DFF]" />
        </div>
      </div>

      <div className="text-center">
        <h2 className="text-xl font-bold tracking-tight text-foreground">
          Vérification requise
        </h2>
        <p className="mt-2 text-sm text-muted-foreground">
          {t('auth.verifyInvalidBody')}
        </p>
      </div>

      <div className="mt-6">
        <Button asChild variant="outline" className="w-full h-11 rounded-xl border-border/80 hover:bg-muted/50 transition-all">
          <Link href={loginHref}>{t('auth.verifyGoLogin')}</Link>
        </Button>
      </div>
    </div>
  );
}
