'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams, useParams } from 'next/navigation';
import { useQueryClient } from '@tanstack/react-query';
import Link from 'next/link';
import Image from 'next/image';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { AlertCircle, Lock, Loader2, Eye, EyeOff, ArrowLeft, Zap, Shield, TrendingUp, Mail, MailWarning, X } from 'lucide-react';
import { api, API_PATHS } from '@/lib/api/client';
import { setToken } from '@/lib/auth/token';
import { loginSchema, getRoleFromResponse, type LoginFormValues } from '@/lib/auth/schemas';
import { getDashboardPath, normalizeLocale } from '@/lib/auth/routing';
import { useAuth } from '@/hooks/useAuth';
import { useTranslation } from '@/contexts/LanguageContext';
import { normalizeApiError } from '@/lib/errors/normalizeApiError';
import { loadPlanIntent, clearPlanIntent } from '@/lib/plan-intent';
import { trackEvent } from '@/lib/analytics/events';
import { startFreeTrial } from '@/services/subscriptions';
import { toast } from 'sonner';
import { Form, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';

function isValidReturnUrl(url: string | null): boolean {
  if (!url || typeof url !== 'string') return false;
  if (url.startsWith('http://') || url.startsWith('https://')) return false;
  return url.startsWith('/') && url.length > 1;
}

function isRoleCompatibleReturnUrl(url: string | null, role: string | null | undefined): boolean {
  if (!isValidReturnUrl(url)) return false;
  const r = String(role || '').toLowerCase();
  const path = String(url);
  if (path.includes('/dashboard/admin'))      return r === 'admin';
  if (path.includes('/dashboard/learner'))    return r === 'learner';
  if (path.includes('/dashboard/employer'))   return r === 'employer';
  if (path.includes('/dashboard/university')) return r === 'university';
  if (path.includes('/dashboard/instructor')) return r === 'instructor';
  if (path.includes('/dashboard/commercial')) return r === 'commercial';
  return true;
}

const FEATURES = [
  { icon: Zap,        text: 'Coaching IA personnalisé pour votre carrière' },
  { icon: TrendingUp, text: 'Certifications reconnues mondialement' },
  { icon: Shield,     text: 'Plateforme sécurisée et certifiée' },
];

export default function LoginPage() {
  const router          = useRouter();
  const searchParams    = useSearchParams();
  const params          = useParams();
  const locale          = normalizeLocale(params?.locale as string);
  const returnUrl       = searchParams?.get('returnUrl') ?? null;
  const startTrialParam = searchParams?.get('startTrial') === '1';
  const checkoutCycleParam = searchParams?.get('checkoutCycle') ?? null;
  const queryClient     = useQueryClient();
  const { session, isLoading: isSessionLoading } = useAuth();
  const { t }           = useTranslation();

  const [error,       setError]       = useState('');
  const [isLoading,   setIsLoading]   = useState(false);
  const [showPass,    setShowPass]    = useState(false);
  const [unverifiedNotice, setUnverifiedNotice] = useState<{ email: string } | null>(null);

  useEffect(() => {
    if (isSessionLoading) return;
    if (!session?.user) return;
    if (isRoleCompatibleReturnUrl(returnUrl, session.userRole) && typeof returnUrl === 'string') {
      router.replace(returnUrl); return;
    }
    if (checkoutCycleParam && session.userRole === 'learner') {
      const intent = loadPlanIntent();
      const planPart = intent?.planId ? `&plan=${encodeURIComponent(intent.planId)}` : '';
      const modePart = intent?.mode ? `&mode=${encodeURIComponent(intent.mode)}` : '';
      const sourcePart = intent?.source ? `&source=${encodeURIComponent(intent.source)}` : '';
      clearPlanIntent();
      router.replace(`/${locale}/checkout?cycle=${encodeURIComponent(checkoutCycleParam)}${planPart}${modePart}${sourcePart}`); return;
    }
    const intent = loadPlanIntent();
    if (intent && session.userRole === 'learner') {
      const planPart = intent.planId ? `&plan=${encodeURIComponent(intent.planId)}` : '';
      const modePart = intent.mode ? `&mode=${encodeURIComponent(intent.mode)}` : '';
      const sourcePart = intent.source ? `&source=${encodeURIComponent(intent.source)}` : '';
      clearPlanIntent();
      router.replace(`/${locale}/checkout?cycle=${encodeURIComponent(intent.cycle)}${planPart}${modePart}${sourcePart}`); return;
    }
    router.replace(getDashboardPath(locale, session.userRole));
  }, [isSessionLoading, locale, returnUrl, checkoutCycleParam, router, session?.user, session?.userRole]);

  const form = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: '', password: '' },
  });

  const onSubmit = async (data: LoginFormValues) => {
    setError('');
    setUnverifiedNotice(null);
    setIsLoading(true);
    try {
      const { data: res } = await api.post<{
        access_token?: string;
        requiresVerification?: boolean;
        email?: string;
        user?: { id: number; email: string; fullName?: string; role?: string };
      }>(API_PATHS.auth('login'), data);

      if (res.requiresVerification && res.email) {
        setUnverifiedNotice({ email: res.email });
        toast.info(t('auth.loginVerify.title'));
        return;
      }
      if (!res.access_token) { setError(t('errors.unknownError')); return; }

      setToken(res.access_token);
      const role     = getRoleFromResponse({ access_token: res.access_token, user: res.user });
      const roleLower = String(role).toLowerCase();
      window.dispatchEvent(new Event('auth:refresh'));

      if (isRoleCompatibleReturnUrl(returnUrl, role) && typeof returnUrl === 'string') {
        trackEvent('signup_completed', { source: 'login_existing_user', locale, role: roleLower });
        router.push(returnUrl); router.refresh(); return;
      }
      if (checkoutCycleParam && roleLower === 'learner') {
        const intent = loadPlanIntent();
        const planPart = intent?.planId ? `&plan=${encodeURIComponent(intent.planId)}` : '';
        const modePart = intent?.mode ? `&mode=${encodeURIComponent(intent.mode)}` : '';
        const sourcePart = intent?.source ? `&source=${encodeURIComponent(intent.source)}` : '';
        clearPlanIntent();
        trackEvent('signup_completed', { source: 'login_to_checkout', locale, role: roleLower });
        router.push(`/${locale}/checkout?cycle=${encodeURIComponent(checkoutCycleParam)}${planPart}${modePart}${sourcePart}`);
        router.refresh(); return;
      }
      const intent = loadPlanIntent();
      if (intent && roleLower === 'learner') {
        const planPart = intent.planId ? `&plan=${encodeURIComponent(intent.planId)}` : '';
        const modePart = intent.mode ? `&mode=${encodeURIComponent(intent.mode)}` : '';
        const sourcePart = intent.source ? `&source=${encodeURIComponent(intent.source)}` : '';
        clearPlanIntent();
        trackEvent('signup_completed', { source: 'login_with_plan_intent', locale, role: roleLower });
        router.push(`/${locale}/checkout?cycle=${encodeURIComponent(intent.cycle)}${planPart}${modePart}${sourcePart}`);
        router.refresh(); return;
      }
      if (startTrialParam && roleLower === 'learner') {
        try {
          await startFreeTrial();
          await queryClient.invalidateQueries({ queryKey: ['subscription-status'] });
        } catch { /* trial may already exist */ }
        router.push(`/${locale}/dashboard/learner`);
        router.refresh(); return;
      }
      router.push(getDashboardPath(locale, role));
      router.refresh();
    } catch (err: unknown) {
      const { key } = normalizeApiError(err);
      setError(t(key));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen w-full">

      {/* ── LEFT BRAND PANEL ── */}
      <div className="hidden lg:flex lg:w-[52%] xl:w-[55%] relative flex-col items-center justify-center overflow-hidden"
           style={{ background: 'linear-gradient(135deg, #1a0533 0%, #3b0764 30%, #7c1fa2 65%, #c2185b 100%)' }}>

        {/* Decorative blobs */}
        <div className="absolute top-[-10%] left-[-10%] w-72 h-72 rounded-full opacity-20 blur-3xl"
             style={{ background: 'radial-gradient(circle, #ff2d78, transparent)' }} />
        <div className="absolute bottom-[-8%] right-[-8%] w-96 h-96 rounded-full opacity-15 blur-3xl"
             style={{ background: 'radial-gradient(circle, #7c3aed, transparent)' }} />
        <div className="absolute top-[40%] right-[10%] w-48 h-48 rounded-full opacity-10 blur-2xl"
             style={{ background: 'radial-gradient(circle, #ff6bc1, transparent)' }} />

        {/* Grid pattern overlay */}
        <div className="absolute inset-0 opacity-[0.04]"
             style={{ backgroundImage: 'linear-gradient(rgba(255,255,255,.3) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,.3) 1px,transparent 1px)', backgroundSize: '40px 40px' }} />

        <div className="relative z-10 flex flex-col items-center text-center px-12 max-w-lg">
          {/* Logo */}
          <div className="mb-10 drop-shadow-2xl">
            <Image
              src="/logo_subul_nav-side.png"
              alt="Subul"
              width={220}
              height={110}
              className="object-contain"
              priority
            />
          </div>

          <h1 className="text-3xl xl:text-4xl font-extrabold text-white leading-tight mb-3">
            Votre carrière,<br />
            <span style={{ background: 'linear-gradient(90deg,#ff9de2,#ffcb77)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
              propulsée par l&apos;IA
            </span>
          </h1>
          <p className="text-white/60 text-sm leading-relaxed mb-10">
            La plateforme d&apos;apprentissage nouvelle génération pour les professionnels tech du monde arabe.
          </p>

          {/* Feature pills */}
          <div className="w-full space-y-3">
            {FEATURES.map(({ icon: Icon, text }, i) => (
              <div key={i} className="flex items-center gap-3 px-4 py-3 rounded-2xl"
                   style={{ background: 'rgba(255,255,255,0.07)', backdropFilter: 'blur(12px)', border: '1px solid rgba(255,255,255,0.12)' }}>
                <div className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0"
                     style={{ background: 'linear-gradient(135deg,#ff2d78,#7c3aed)' }}>
                  <Icon className="w-4 h-4 text-white" />
                </div>
                <span className="text-white/80 text-sm text-left">{text}</span>
              </div>
            ))}
          </div>

          {/* Stats row */}
          <div className="mt-10 grid grid-cols-3 gap-4 w-full">
            {[['5k+', 'Apprenants'], ['98%', 'Satisfaction'], ['50+', 'Certifications']].map(([val, label]) => (
              <div key={label} className="flex flex-col items-center">
                <span className="text-2xl font-extrabold text-white">{val}</span>
                <span className="text-xs text-white/50 mt-0.5">{label}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── RIGHT FORM PANEL ── */}
      <div className="flex-1 flex flex-col items-center justify-center bg-white relative px-6 py-12">

        {/* Back to localized home (e.g. /fr) */}
        <Button
          variant="outline"
          size="sm"
          className="absolute top-6 left-6 gap-1.5 rounded-xl border-slate-200 bg-white/90 text-slate-700 shadow-sm hover:bg-slate-50 rtl:left-auto rtl:right-6"
          asChild
        >
          <Link href={`/${locale}`}>
            <ArrowLeft className="h-4 w-4 shrink-0 rtl:rotate-180" aria-hidden />
            {t('auth.backToHome')}
          </Link>
        </Button>

        {/* Mobile logo */}
        <div className="lg:hidden mb-8">
          <Image src="/logo_subul_nav-side.png" alt="Subul" width={140} height={70} className="object-contain" />
        </div>

        <div className="w-full max-w-[400px]">

          {/* Header */}
          <div className="mb-8">
            <h2 className="text-2xl font-extrabold text-slate-900">Bon retour</h2>
            <p className="text-slate-500 text-sm mt-1">Connectez-vous à votre espace Subul</p>
          </div>

          {unverifiedNotice && (
            <div
              role="alert"
              className="mb-5 rounded-xl border border-violet-200 bg-gradient-to-br from-violet-50 to-fuchsia-50/80 p-4 shadow-sm dark:border-violet-900/40 dark:from-violet-950/40 dark:to-fuchsia-950/20"
            >
              <div className="flex items-start gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-violet-600/10 text-violet-700 dark:text-violet-300">
                  <MailWarning className="h-5 w-5" />
                </div>
                <div className="min-w-0 flex-1 space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <h3 className="text-sm font-bold text-violet-950 dark:text-violet-100">
                      {t('auth.loginVerify.title')}
                    </h3>
                    <button
                      type="button"
                      onClick={() => setUnverifiedNotice(null)}
                      className="rounded-md p-1 text-violet-600/70 hover:bg-violet-100/80 hover:text-violet-900 dark:hover:bg-violet-900/40"
                      aria-label={t('auth.loginVerify.dismiss')}
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                  <p className="text-sm text-violet-900/90 dark:text-violet-100/90">
                    {t('auth.loginVerify.body').replace('{email}', unverifiedNotice.email)}
                  </p>
                  <p className="text-xs text-violet-800/75 dark:text-violet-200/70">{t('auth.loginVerify.hint')}</p>
                  <div className="flex flex-col gap-2 pt-1 sm:flex-row sm:flex-wrap">
                    <Button
                      type="button"
                      variant="default"
                      className="h-9 rounded-lg bg-violet-600 text-white hover:bg-violet-700"
                      onClick={() => {
                        const pendingQs = new URLSearchParams({ email: unverifiedNotice.email });
                        if (returnUrl) pendingQs.set('returnUrl', returnUrl);
                        if (startTrialParam) pendingQs.set('startTrial', '1');
                        if (checkoutCycleParam) pendingQs.set('checkoutCycle', checkoutCycleParam);
                        router.push(`/${locale}/auth/verify-email/pending?${pendingQs.toString()}`);
                      }}
                    >
                      {t('auth.loginVerify.openPending')}
                    </Button>
                    <Button type="button" variant="outline" className="h-9 rounded-lg border-violet-300" asChild>
                      <Link
                        href={`/${locale}/auth/resend-verification?email=${encodeURIComponent(unverifiedNotice.email)}`}
                      >
                        {t('auth.loginVerify.resend')}
                      </Link>
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Error */}
          {error && (
            <div className="mb-4 flex items-start gap-2 p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">

              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-slate-700 text-sm font-semibold">Adresse e-mail</FormLabel>
                    <div className="relative">
                      <Mail className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                      <Input
                        placeholder="vous@exemple.com"
                        type="email"
                        autoComplete="email"
                        className="h-11 pl-10 pr-4 rounded-xl border-slate-200 bg-slate-50 focus:bg-white focus:border-violet-400 focus:ring-2 focus:ring-violet-100 transition-all"
                        {...field}
                      />
                    </div>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <div className="flex items-center justify-between">
                      <FormLabel className="text-slate-700 text-sm font-semibold">Mot de passe</FormLabel>
                      <Link
                        href={`/${locale}/auth/forgot-password`}
                        className="text-xs text-violet-600 hover:text-violet-800 font-medium"
                      >
                        Oublié ?
                      </Link>
                    </div>
                    <div className="relative">
                      <Lock className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                      <Input
                        placeholder="••••••••"
                        type={showPass ? 'text' : 'password'}
                        autoComplete="current-password"
                        className="h-11 pl-10 pr-10 rounded-xl border-slate-200 bg-slate-50 focus:bg-white focus:border-violet-400 focus:ring-2 focus:ring-violet-100 transition-all"
                        {...field}
                      />
                      <button
                        type="button"
                        onClick={() => setShowPass(v => !v)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                        tabIndex={-1}
                      >
                        {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <Button
                type="submit"
                disabled={isLoading}
                className="w-full h-11 rounded-xl font-semibold text-sm text-white border-0 shadow-lg shadow-pink-200/50 transition-all hover:shadow-pink-300/60 hover:scale-[1.01] active:scale-[0.99]"
                style={{ background: 'linear-gradient(135deg, #c2185b 0%, #7c3aed 100%)' }}
              >
                {isLoading ? (
                  <span className="flex items-center gap-2">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Connexion…
                  </span>
                ) : (
                  <span className="flex items-center gap-2">
                    <Lock className="w-4 h-4" />
                    Se connecter
                  </span>
                )}
              </Button>
            </form>
          </Form>

          {/* Divider */}
          <div className="flex items-center gap-3 my-5">
            <div className="flex-1 h-px bg-slate-100" />
            <span className="text-xs text-slate-400">ou</span>
            <div className="flex-1 h-px bg-slate-100" />
          </div>

          {/* Resend verification */}
          <Link
            href={`/${locale}/auth/resend-verification`}
            className="flex items-center justify-center gap-2 w-full h-10 rounded-xl border border-slate-200 text-sm text-slate-500 hover:border-violet-300 hover:text-violet-600 hover:bg-violet-50 transition-all"
          >
            Email non vérifié ? Renvoyer
          </Link>

          {/* Sign up link */}
          <p className="text-center text-sm text-slate-500 mt-6">
            Pas encore de compte ?{' '}
            <Link
              href={`/${locale}/auth/register${returnUrl ? `?returnUrl=${encodeURIComponent(returnUrl)}` : ''}`}
              className="font-semibold"
              style={{ color: '#c2185b' }}
            >
              Créer un compte
            </Link>
          </p>

          <p className="mt-4 text-center text-xs text-slate-400">
            En vous connectant, vous acceptez nos{' '}
            <Link href={`/${locale}/terms`} className="underline hover:text-violet-600">
              conditions d&apos;utilisation
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
