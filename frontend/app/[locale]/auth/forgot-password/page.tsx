'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useParams } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  Mail,
  ArrowLeft,
  Loader2,
  CheckCircle,
  AlertCircle,
  Sparkles,
  MailCheck,
  Zap,
  Shield,
  TrendingUp,
} from 'lucide-react';
import {
  Form,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { AuthService } from '@/lib/api/auth';
import { toast } from 'sonner';
import { useTranslation } from '@/contexts/LanguageContext';
import { normalizeLocale } from '@/lib/auth/routing';

const FEATURE_ICONS = [Zap, TrendingUp, Shield] as const;

export default function ForgotPasswordPage() {
  const params = useParams();
  const locale = normalizeLocale((params?.locale as string) || 'fr');
  const { t } = useTranslation();
  const [status, setStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState('');
  const [submittedEmail, setSubmittedEmail] = useState('');

  const forgotPasswordSchema = useMemo(
    () =>
      z.object({
        email: z.string().email(t('auth.forgotPasswordFlow.emailInvalid')),
      }),
    [t],
  );

  type ForgotPasswordFormValues = z.infer<typeof forgotPasswordSchema>;

  const form = useForm<ForgotPasswordFormValues>({
    resolver: zodResolver(forgotPasswordSchema),
    defaultValues: { email: '' },
    mode: 'onChange',
  });

  const isLoading = form.formState.isSubmitting;

  const onSubmit = async (data: ForgotPasswordFormValues) => {
    try {
      setStatus('idle');
      setErrorMessage('');
      setSubmittedEmail(data.email);
      await AuthService.forgotPassword(data.email);
      toast.success(t('auth.forgotPasswordFlow.toastSuccess'));
      setStatus('success');
    } catch (error: unknown) {
      setStatus('error');
      const msg =
        (error as { response?: { data?: { message?: string } } })?.response?.data?.message ||
        t('errors.somethingWentWrong');
      setErrorMessage(String(msg));
    }
  };

  const leftFeatures = [
    t('auth.forgotPasswordFlow.leftFeature1'),
    t('auth.forgotPasswordFlow.leftFeature2'),
    t('auth.forgotPasswordFlow.leftFeature3'),
  ];
  const leftStats = [
    [t('auth.forgotPasswordFlow.leftStat1Val'), t('auth.forgotPasswordFlow.leftStat1Label')],
    [t('auth.forgotPasswordFlow.leftStat2Val'), t('auth.forgotPasswordFlow.leftStat2Label')],
    [t('auth.forgotPasswordFlow.leftStat3Val'), t('auth.forgotPasswordFlow.leftStat3Label')],
  ] as const;

  if (status === 'success') {
    return (
      <div className="flex min-h-screen w-full">
      <style jsx global>{`
        @keyframes authStatRise {
          from { opacity: 0; transform: translateY(14px) scale(0.96); }
          to { opacity: 1; transform: translateY(0) scale(1); }
        }
        .auth-stat-card {
          opacity: 0;
          animation: authStatRise 560ms cubic-bezier(.22, 1, .36, 1) both;
        }
        @media (prefers-reduced-motion: reduce) {
          .auth-stat-card { opacity: 1; animation: none; }
        }
      `}</style>
        <div
          className="hidden lg:flex lg:w-[52%] xl:w-[55%] relative flex-col items-center justify-start overflow-hidden py-5 xl:py-6"
          style={{
            background:
              'linear-gradient(135deg, #1a0533 0%, #3b0764 30%, #7c1fa2 65%, #c2185b 100%)',
          }}
        >
          <div
            className="absolute inset-0 opacity-[0.04]"
            style={{
              backgroundImage:
                'linear-gradient(rgba(255,255,255,.3) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,.3) 1px,transparent 1px)',
              backgroundSize: '40px 40px',
            }}
          />
          <div className="relative z-10 flex flex-col items-center text-center px-12 max-w-lg">
            <div className="mb-2 drop-shadow-2xl">
              <Image
                src="/subul-logo-transparent.png"
                alt="Subul"
                width={165}
                height={85}
                className="object-contain"
                priority
              />
            </div>
            <h1 className="text-3xl xl:text-4xl font-extrabold text-white leading-tight mb-2">
              {t('auth.forgotPasswordFlow.successTitle')}
            </h1>
            <p className="text-white/60 text-sm leading-relaxed">{t('auth.forgotPasswordFlow.brandTagline')}</p>
          </div>
        </div>

        <div className="flex-1 flex flex-col items-center justify-start lg:justify-center bg-white relative px-6 pb-10 pt-16 lg:py-8">
          <Link
            href={`/${locale}`}
            className="absolute top-6 left-6 flex items-center gap-1.5 text-sm text-slate-400 hover:text-slate-700 transition-colors group"
          >
            <ArrowLeft className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform" />
            {t('auth.forgotPasswordFlow.backHome')}
          </Link>

          <div className="w-full max-w-[440px]">
            <div className="relative mb-6 flex flex-col items-center">
              <div className="success-ring relative">
                <div className="absolute inset-0 rounded-full bg-gradient-to-br from-emerald-400 to-green-500 blur-sm opacity-40" />
                <div className="relative flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-br from-emerald-400 to-green-500 shadow-lg">
                  <MailCheck className="h-9 w-9 text-white" />
                </div>
              </div>
              <Sparkles className="absolute -right-2 top-0 h-5 w-5 text-amber-400 animate-pulse" />
            </div>

            <div className="text-center mb-6">
              <h2 className="text-2xl font-extrabold tracking-tight text-slate-900">
                {t('auth.forgotPasswordFlow.successTitle')}
              </h2>
              <p className="mt-2 text-sm text-slate-500">{t('auth.forgotPasswordFlow.successSubtitle')}</p>
            </div>

            <div className="rounded-xl border border-emerald-200/60 bg-emerald-50/50 p-4 dark:border-emerald-800/40 dark:bg-emerald-950/20 mb-4">
              <div className="flex gap-3">
                <CheckCircle className="mt-0.5 h-5 w-5 flex-shrink-0 text-emerald-500" />
                <p className="text-sm text-emerald-900 dark:text-emerald-100 leading-relaxed">
                  {t('auth.forgotPasswordFlow.successDetail').replace('{email}', submittedEmail)}
                </p>
              </div>
            </div>

            <div className="rounded-xl border border-slate-200 bg-slate-50/80 p-4 mb-6">
              <p className="text-xs font-semibold text-slate-600 mb-2">{t('auth.forgotPasswordFlow.successTipsTitle')}</p>
              <ul className="space-y-1.5 text-xs text-slate-500">
                <li className="flex items-start gap-2">
                  <span className="mt-1 h-1 w-1 rounded-full bg-slate-400 shrink-0" />
                  {t('auth.forgotPasswordFlow.successTipSpam')}
                </li>
                <li className="flex items-start gap-2">
                  <span className="mt-1 h-1 w-1 rounded-full bg-slate-400 shrink-0" />
                  {t('auth.forgotPasswordFlow.successTipAddress')}
                </li>
              </ul>
            </div>

            <Button
              asChild
              className="w-full h-11 rounded-xl font-semibold text-white border-0 shadow-lg"
              style={{ background: 'linear-gradient(135deg, #c2185b 0%, #7c3aed 100%)' }}
            >
              <Link href={`/${locale}/auth/login`}>
                <ArrowLeft className="mr-2 h-4 w-4" />
                {t('auth.forgotPasswordFlow.backLogin')}
              </Link>
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen w-full">
      <style jsx global>{`
        @keyframes authStatRise {
          from { opacity: 0; transform: translateY(14px) scale(0.96); }
          to { opacity: 1; transform: translateY(0) scale(1); }
        }
        .auth-stat-card {
          opacity: 0;
          animation: authStatRise 560ms cubic-bezier(.22, 1, .36, 1) both;
        }
        @media (prefers-reduced-motion: reduce) {
          .auth-stat-card { opacity: 1; animation: none; }
        }
      `}</style>
      <div
        className="hidden lg:flex lg:w-[52%] xl:w-[55%] relative flex-col items-center justify-start overflow-hidden py-5 xl:py-6"
        style={{
          background: 'linear-gradient(135deg, #1a0533 0%, #3b0764 30%, #7c1fa2 65%, #c2185b 100%)',
        }}
      >
        <div
          className="absolute top-[-10%] left-[-10%] w-72 h-72 rounded-full opacity-20 blur-3xl"
          style={{ background: 'radial-gradient(circle, #ff2d78, transparent)' }}
        />
        <div
          className="absolute bottom-[-8%] right-[-8%] w-96 h-96 rounded-full opacity-15 blur-3xl"
          style={{ background: 'radial-gradient(circle, #7c3aed, transparent)' }}
        />
        <div
          className="absolute inset-0 opacity-[0.04]"
          style={{
            backgroundImage:
              'linear-gradient(rgba(255,255,255,.3) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,.3) 1px,transparent 1px)',
            backgroundSize: '40px 40px',
          }}
        />

        <div className="relative z-10 flex flex-col items-center text-center px-12 max-w-lg">
          <div className="mb-2 drop-shadow-2xl">
            <Image
              src="/subul-logo-transparent.png"
              alt="Subul"
              width={165}
              height={85}
              className="object-contain"
              priority
            />
          </div>
          <h1 className="text-3xl xl:text-4xl font-extrabold text-white leading-tight mb-2">
            {t('auth.forgotPasswordFlow.title')}
          </h1>
          <p className="text-white/60 text-sm leading-relaxed mb-5 max-w-md">{t('auth.forgotPasswordFlow.brandTagline')}</p>

          <div className="grid w-full gap-3 text-left mb-5">
            {FEATURE_ICONS.map((Icon, i) => (
              <div
                key={i}
                className="flex items-center gap-3 rounded-2xl bg-white/5 border border-white/10 px-4 py-2 backdrop-blur-sm"
              >
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-white/10">
                  <Icon className="h-4 w-4 text-white/90" />
                </div>
                <span className="text-sm text-white/85">{leftFeatures[i]}</span>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-3 gap-4 w-full">
            {leftStats.map(([val, label], index) => (
              <div key={String(label)} className="auth-stat-card flex flex-col items-center"
                style={{ animationDelay: `${index * 120 + 160}ms` }}
              >
                <span className="text-2xl font-extrabold text-white">{val}</span>
                <span className="text-xs text-white/50 mt-0.5">{label}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="flex-1 flex flex-col items-center justify-start lg:justify-center bg-white relative px-6 pb-10 pt-16 lg:py-8">
        <Link
          href={`/${locale}`}
          className="absolute top-6 left-6 flex items-center gap-1.5 text-sm text-slate-400 hover:text-slate-700 transition-colors group rtl:left-auto rtl:right-6"
        >
          <ArrowLeft className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform rtl:rotate-180" />
          {t('auth.forgotPasswordFlow.backHome')}
        </Link>

        <div className="lg:hidden mb-4">
          <Image src="/subul-logo-transparent.png" alt="Subul" width={115} height={62} className="object-contain" />
        </div>

        <div className="w-full max-w-[400px]">
          <div className="mb-6 text-center lg:text-left rtl:lg:text-right">
            <h2 className="text-2xl font-extrabold text-slate-900">{t('auth.forgotPasswordFlow.title')}</h2>
            <p className="text-slate-500 text-sm mt-2">{t('auth.forgotPasswordFlow.subtitle')}</p>
          </div>

          {status === 'error' && (
            <div className="mb-4 flex gap-3 rounded-xl border border-red-200/60 bg-red-50/50 p-3.5 dark:border-red-800/40 dark:bg-red-950/20">
              <AlertCircle className="mt-0.5 h-5 w-5 flex-shrink-0 text-red-500" />
              <div>
                <p className="text-sm font-medium text-red-800 dark:text-red-200">
                  {t('auth.forgotPasswordFlow.errorTitle')}
                </p>
                <p className="text-xs text-red-600/90 dark:text-red-400/80 mt-0.5">{errorMessage}</p>
              </div>
            </div>
          )}

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-slate-700 text-sm font-semibold">
                      {t('auth.forgotPasswordFlow.emailLabel')}
                    </FormLabel>
                    <div className="relative">
                      <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-4 rtl:left-auto rtl:right-0 rtl:pl-0 rtl:pr-3.5">
                        <Mail className="h-4 w-4 text-slate-400" />
                      </div>
                      <Input
                        type="email"
                        placeholder={t('auth.forgotPasswordFlow.emailPlaceholder')}
                        disabled={isLoading}
                        className="h-14 pl-12 rtl:pl-4 rtl:pr-12 rounded-xl border-slate-200 bg-slate-50 focus:bg-white focus:border-violet-400 focus:ring-2 focus:ring-violet-100 transition-all"
                        {...field}
                      />
                    </div>
                    <FormMessage className="text-xs" />
                  </FormItem>
                )}
              />

              <Button
                type="submit"
                disabled={isLoading || !form.watch('email')}
                className="w-full h-11 rounded-xl font-semibold text-sm text-white border-0 shadow-lg shadow-pink-200/50 transition-all hover:shadow-pink-300/60 hover:scale-[1.01] active:scale-[0.99] disabled:opacity-50"
                style={{ background: 'linear-gradient(135deg, #c2185b 0%, #7c3aed 100%)' }}
              >
                {isLoading ? (
                  <span className="flex items-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    {t('auth.forgotPasswordFlow.submitting')}
                  </span>
                ) : (
                  <span className="flex items-center gap-2">
                    <Mail className="h-4 w-4" />
                    {t('auth.forgotPasswordFlow.submit')}
                  </span>
                )}
              </Button>
            </form>
          </Form>

          <div className="mt-8 text-center">
            <Link
              href={`/${locale}/auth/login`}
              className="group inline-flex items-center text-sm text-slate-500 hover:text-violet-600 transition-colors"
            >
              <ArrowLeft className="mr-1.5 h-4 w-4 transition-transform group-hover:-translate-x-0.5 rtl:mr-0 rtl:ml-1.5 rtl:rotate-180" />
              {t('auth.forgotPasswordFlow.backLogin')}
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
