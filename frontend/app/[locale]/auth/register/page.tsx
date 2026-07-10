'use client';

import { useState, useMemo } from 'react';
import { useSearchParams, useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  AlertCircle,
  UserPlus,
  UserRound,
  Mail,
  Lock,
  Loader2,
  Eye,
  EyeOff,
  ArrowLeft,
  Sparkles,
  GraduationCap,
  Globe,
  Check,
  X,
} from 'lucide-react';
import { api, API_PATHS } from '@/lib/api/client';
import type { RegisterApiResponse } from '@/lib/api/auth';
import { registerSchema, type RegisterFormValues } from '@/lib/auth/schemas';
import { loadPlanIntent } from '@/lib/plan-intent';
import { normalizeLocale } from '@/lib/auth/routing';
import { trackEvent } from '@/lib/analytics/events';
import {
  Form,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';

/* ── Password strength helpers ── */
const PASSWORD_RULES = [
  { label: '8 caractères minimum', test: (p: string) => p.length >= 8 },
  { label: 'Une majuscule',        test: (p: string) => /[A-Z]/.test(p) },
  { label: 'Un chiffre',           test: (p: string) => /\d/.test(p) },
  { label: 'Un caractère spécial', test: (p: string) => /[^A-Za-z0-9]/.test(p) },
];

function getStrength(password: string) {
  const passed = PASSWORD_RULES.filter(r => r.test(password)).length;
  if (passed <= 1) return { pct: 25,  color: '#ef4444', label: 'Faible' };
  if (passed === 2) return { pct: 50,  color: '#f97316', label: 'Moyen' };
  if (passed === 3) return { pct: 75,  color: '#eab308', label: 'Bon' };
  return                    { pct: 100, color: '#22c55e', label: 'Fort' };
}

/* ── Feature list for left panel ── */
const FEATURES = [
  { icon: Sparkles,      text: 'IA personnalisée pour booster votre apprentissage' },
  { icon: GraduationCap, text: 'Certifications reconnues à l\'international' },
  { icon: Globe,         text: 'Communauté de professionnels dans le monde arabe' },
];

export default function RegisterPage() {
  const searchParams = useSearchParams();
  const params = useParams();
  const router = useRouter();
  const locale = normalizeLocale(params?.locale as string);
  const refCodeFromUrl = searchParams?.get('ref') ?? '';
  const returnUrl = searchParams?.get('returnUrl') ?? '';
  const shouldStartTrial = searchParams?.get('startTrial') === '1';

  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showPass, setShowPass] = useState(false);

  const form = useForm<RegisterFormValues>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      email: '',
      password: '',
      fullName: '',
    },
  });

  const watchedPassword = form.watch('password');
  const strength = useMemo(() => getStrength(watchedPassword || ''), [watchedPassword]);

  const onSubmit = async (data: RegisterFormValues) => {
    setError('');
    setIsLoading(true);
    trackEvent('signup_started', { source: 'register_page', locale });
    try {
      const { data: res } = await api.post<RegisterApiResponse>(API_PATHS.auth('register'), {
        email: data.email,
        password: data.password,
        fullName: data.fullName || undefined,
        refCode: refCodeFromUrl || undefined,
      });

      const qs = new URLSearchParams();
      qs.set('email', data.email);
      if (shouldStartTrial) qs.set('startTrial', '1');
      if (returnUrl) qs.set('returnUrl', returnUrl);
      const intent = loadPlanIntent();
      if (intent?.cycle) qs.set('checkoutCycle', intent.cycle);
      if (intent?.source) qs.set('source', intent.source);
      if (intent?.planId) qs.set('plan', intent.planId);

      if (!res.requiresVerification && res.user?.isEmailVerified) {
        qs.set('invite', '1');
      }

      if (res.requiresVerification) {
        qs.set('emailSent', String(res.emailSent ?? true));
        if (res.emailError) {
          qs.set('emailError', res.emailError.slice(0, 200));
        }
      }

      trackEvent('signup_completed', {
        locale,
        requiresVerification: Boolean(res.requiresVerification),
      });

      router.push(`/${locale}/auth/verify-email/pending?${qs.toString()}`);
    } catch (err: unknown) {
      const msg =
        err && typeof err === 'object' && 'response' in err
          ? (err as { response?: { data?: { message?: string | string[] } } }).response?.data?.message
          : null;
      setError(
        typeof msg === 'string'
          ? msg
          : Array.isArray(msg)
            ? msg.join(', ')
            : 'Inscription impossible',
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen w-full">

      {/* ── LEFT BRAND PANEL ── */}
      <div
        className="hidden lg:flex lg:w-[52%] xl:w-[55%] relative flex-col items-center justify-center overflow-hidden"
        style={{ background: 'linear-gradient(135deg, #1a0533 0%, #3b0764 30%, #7c1fa2 65%, #c2185b 100%)' }}
      >
        {/* Decorative blobs */}
        <div
          className="absolute top-[-10%] left-[-10%] w-72 h-72 rounded-full opacity-20 blur-3xl"
          style={{ background: 'radial-gradient(circle, #ff2d78, transparent)' }}
        />
        <div
          className="absolute bottom-[-8%] right-[-8%] w-96 h-96 rounded-full opacity-15 blur-3xl"
          style={{ background: 'radial-gradient(circle, #7c3aed, transparent)' }}
        />
        <div
          className="absolute top-[40%] right-[10%] w-48 h-48 rounded-full opacity-10 blur-2xl"
          style={{ background: 'radial-gradient(circle, #ff6bc1, transparent)' }}
        />

        {/* Grid pattern overlay */}
        <div
          className="absolute inset-0 opacity-[0.04]"
          style={{
            backgroundImage:
              'linear-gradient(rgba(255,255,255,.3) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,.3) 1px,transparent 1px)',
            backgroundSize: '40px 40px',
          }}
        />

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
            Rejoignez la<br />
            <span
              style={{
                background: 'linear-gradient(90deg,#ff9de2,#ffcb77)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
              }}
            >
              révolution du savoir
            </span>
          </h1>
          <p className="text-white/60 text-sm leading-relaxed mb-10">
            Créez votre compte et accédez à des milliers de ressources, certifications et un coaching IA personnalisé.
          </p>

          {/* Feature pills */}
          <div className="w-full space-y-3">
            {FEATURES.map(({ icon: Icon, text }, i) => (
              <div
                key={i}
                className="flex items-center gap-3 px-4 py-3 rounded-2xl"
                style={{
                  background: 'rgba(255,255,255,0.07)',
                  backdropFilter: 'blur(12px)',
                  border: '1px solid rgba(255,255,255,0.12)',
                }}
              >
                <div
                  className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0"
                  style={{ background: 'linear-gradient(135deg,#ff2d78,#7c3aed)' }}
                >
                  <Icon className="w-4 h-4 text-white" />
                </div>
                <span className="text-white/80 text-sm text-left">{text}</span>
              </div>
            ))}
          </div>

          {/* Stats row */}
          <div className="mt-10 grid grid-cols-3 gap-4 w-full">
            {([['5k+', 'Apprenants'], ['98%', 'Satisfaction'], ['50+', 'Certifications']] as const).map(
              ([val, label]) => (
                <div key={label} className="flex flex-col items-center">
                  <span className="text-2xl font-extrabold text-white">{val}</span>
                  <span className="text-xs text-white/50 mt-0.5">{label}</span>
                </div>
              ),
            )}
          </div>
        </div>
      </div>

      {/* ── RIGHT FORM PANEL ── */}
      <div className="flex-1 flex flex-col items-center justify-center bg-white relative px-6 py-12">
        {/* Back link */}
        <Link
          href={`/${locale}`}
          className="absolute top-6 left-6 flex items-center gap-1.5 text-sm text-slate-400 hover:text-slate-700 transition-colors group"
        >
          <ArrowLeft className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform" />
          Accueil
        </Link>

        {/* Mobile logo */}
        <div className="lg:hidden mb-8">
          <Image src="/logo_subul_nav-side.png" alt="Subul" width={140} height={70} className="object-contain" />
        </div>

        <div className="w-full max-w-[420px]">
          {/* Header */}
          <div className="mb-8">
            <h2 className="text-2xl font-extrabold text-slate-900">Créer votre compte</h2>
            <p className="text-slate-500 text-sm mt-1">
              Commencez votre parcours d&apos;apprentissage dès maintenant
            </p>
          </div>

          {/* Error */}
          {error && (
            <div className="mb-4 flex items-start gap-2 p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              {/* Full Name */}
              <FormField
                control={form.control}
                name="fullName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-slate-700 text-sm font-semibold">Nom complet</FormLabel>
                    <div className="relative">
                      <UserRound className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                      <Input
                        placeholder="Jean Dupont"
                        autoComplete="name"
                        className="h-11 pl-10 pr-4 rounded-xl border-slate-200 bg-slate-50 focus:bg-white focus:border-violet-400 focus:ring-2 focus:ring-violet-100 transition-all"
                        {...field}
                      />
                    </div>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Email */}
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

              {/* Password */}
              <FormField
                control={form.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-slate-700 text-sm font-semibold">Mot de passe</FormLabel>
                    <div className="relative">
                      <Lock className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                      <Input
                        placeholder="••••••••"
                        type={showPass ? 'text' : 'password'}
                        autoComplete="new-password"
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

                    {/* Password strength indicator */}
                    {watchedPassword && watchedPassword.length > 0 && (
                      <div className="mt-2.5 space-y-2">
                        {/* Strength bar */}
                        <div className="flex items-center gap-2">
                          <div className="flex-1 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                            <div
                              className="h-full rounded-full transition-all duration-500 ease-out"
                              style={{ width: `${strength.pct}%`, background: strength.color }}
                            />
                          </div>
                          <span
                            className="text-xs font-semibold min-w-[40px] text-right"
                            style={{ color: strength.color }}
                          >
                            {strength.label}
                          </span>
                        </div>

                        {/* Rules checklist */}
                        <div className="grid grid-cols-2 gap-x-3 gap-y-1">
                          {PASSWORD_RULES.map((rule, i) => {
                            const passed = rule.test(watchedPassword);
                            return (
                              <div key={i} className="flex items-center gap-1.5">
                                {passed ? (
                                  <Check className="w-3 h-3 text-emerald-500 flex-shrink-0" />
                                ) : (
                                  <X className="w-3 h-3 text-slate-300 flex-shrink-0" />
                                )}
                                <span
                                  className={`text-[11px] ${passed ? 'text-emerald-600' : 'text-slate-400'} transition-colors`}
                                >
                                  {rule.label}
                                </span>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </FormItem>
                )}
              />

              {/* Submit button */}
              <Button
                type="submit"
                disabled={isLoading}
                className="w-full h-11 rounded-xl font-semibold text-sm text-white border-0 shadow-lg shadow-pink-200/50 transition-all hover:shadow-pink-300/60 hover:scale-[1.01] active:scale-[0.99]"
                style={{ background: 'linear-gradient(135deg, #c2185b 0%, #7c3aed 100%)' }}
              >
                {isLoading ? (
                  <span className="flex items-center gap-2">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Création du compte…
                  </span>
                ) : (
                  <span className="flex items-center gap-2">
                    <UserPlus className="w-4 h-4" />
                    Créer mon compte
                  </span>
                )}
              </Button>
            </form>
          </Form>

          {/* Sign in link */}
          <p className="text-center text-sm text-slate-500 mt-6">
            Déjà un compte ?{' '}
            <Link
              href={`/${locale}/auth/login${returnUrl ? `?returnUrl=${encodeURIComponent(returnUrl)}` : ''}`}
              className="font-semibold"
              style={{ color: '#c2185b' }}
            >
              Se connecter
            </Link>
          </p>

          <p className="mt-4 text-center text-xs text-slate-400">
            En vous inscrivant, vous acceptez nos{' '}
            <Link href={`/${locale}/terms`} className="underline hover:text-violet-600">
              conditions d&apos;utilisation
            </Link>
            {' '}et notre{' '}
            <Link href={`/${locale}/privacy`} className="underline hover:text-violet-600">
              politique de confidentialité
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
