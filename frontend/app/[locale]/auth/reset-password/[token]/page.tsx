'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import { useRouter, useParams } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Lock, Eye, EyeOff, Loader2, CheckCircle, AlertCircle, ArrowLeft, ShieldCheck, KeyRound } from 'lucide-react';
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

const resetPasswordSchema = z.object({
  newPassword: z.string()
    .min(8, 'Le mot de passe doit contenir au moins 8 caractères')
    .regex(/[A-Z]/, 'Le mot de passe doit contenir au moins une majuscule')
    .regex(/[a-z]/, 'Le mot de passe doit contenir au moins une minuscule')
    .regex(/[0-9]/, 'Le mot de passe doit contenir au moins un chiffre'),
  confirmPassword: z.string(),
}).refine((data) => data.newPassword === data.confirmPassword, {
  message: 'Les mots de passe ne correspondent pas',
  path: ['confirmPassword'],
});

type ResetPasswordFormValues = z.infer<typeof resetPasswordSchema>;

// Password strength calculator
type StrengthLevel = 'weak' | 'fair' | 'good' | 'strong';

interface StrengthCriteria {
  label: string;
  test: (pw: string) => boolean;
}

const strengthCriteria: StrengthCriteria[] = [
  { label: '8 caractères minimum', test: (pw) => pw.length >= 8 },
  { label: 'Une majuscule', test: (pw) => /[A-Z]/.test(pw) },
  { label: 'Une minuscule', test: (pw) => /[a-z]/.test(pw) },
  { label: 'Un chiffre', test: (pw) => /[0-9]/.test(pw) },
];

function getStrengthLevel(password: string): { level: StrengthLevel; score: number } {
  const score = strengthCriteria.reduce((acc, { test }) => acc + (test(password) ? 1 : 0), 0);
  if (score <= 1) return { level: 'weak', score };
  if (score === 2) return { level: 'fair', score };
  if (score === 3) return { level: 'good', score };
  return { level: 'strong', score };
}

const strengthConfig: Record<StrengthLevel, { label: string; color: string; bgColor: string; width: string }> = {
  weak: { label: 'Faible', color: 'text-red-500', bgColor: 'bg-red-500', width: 'w-1/4' },
  fair: { label: 'Moyen', color: 'text-amber-500', bgColor: 'bg-amber-500', width: 'w-2/4' },
  good: { label: 'Bon', color: 'text-blue-500', bgColor: 'bg-blue-500', width: 'w-3/4' },
  strong: { label: 'Fort', color: 'text-emerald-500', bgColor: 'bg-emerald-500', width: 'w-full' },
};

export default function ResetPasswordPage() {
  const router = useRouter();
  const params = useParams();
  const locale = (params?.locale as string) || 'fr';
  const token = typeof params?.token === 'string' ? decodeURIComponent(params.token) : '';
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [status, setStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState('');

  const form = useForm<ResetPasswordFormValues>({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: {
      newPassword: '',
      confirmPassword: '',
    },
    mode: 'onChange',
  });

  const newPassword = form.watch('newPassword');
  const strength = useMemo(() => getStrengthLevel(newPassword || ''), [newPassword]);

  const isLoading = form.formState.isSubmitting;

  const onSubmit = async (data: ResetPasswordFormValues) => {
    try {
      setStatus('idle');
      setErrorMessage('');
      await AuthService.resetPassword(token, data.newPassword);
      toast.success('Mot de passe mis à jour');
      setStatus('success');
    } catch (error: any) {
      setStatus('error');
      setErrorMessage(error?.response?.data?.message || 'Le lien est invalide ou a expiré');
    }
  };

  // ─── Invalid Token ───
  if (!token || token === 'undefined') {
    return (
      <div className="auth-card">
        <div className="relative mb-6 flex flex-col items-center">
          <div className="relative flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-br from-rose-500/10 to-orange-500/10 dark:from-rose-500/20 dark:to-orange-500/20">
            <AlertCircle className="h-9 w-9 text-rose-500" />
          </div>
        </div>

        <div className="text-center">
          <h2 className="text-2xl font-bold tracking-tight text-foreground">
            Lien invalide
          </h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Ce lien de réinitialisation est incomplet ou a expiré.
          </p>
        </div>

        <div className="mt-6">
          <Button asChild className="w-full h-11 rounded-xl bg-gradient-to-r from-[#7C4DFF] to-[#C2185B] text-white shadow-md hover:shadow-lg hover:opacity-95 transition-all">
            <Link href={`/${locale}/auth/forgot-password`}>
              Demander un nouveau lien
            </Link>
          </Button>
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
            <div className="success-ring">
              <div className="absolute inset-0 rounded-full bg-gradient-to-br from-emerald-400 to-green-500 blur-sm opacity-40" />
              <div className="relative flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-br from-emerald-400 to-green-500 shadow-lg">
                <ShieldCheck className="h-9 w-9 text-white" />
              </div>
            </div>
          </div>
        </div>

        <div className="text-center">
          <h2 className="text-2xl font-bold tracking-tight text-foreground">
            Mot de passe réinitialisé !
          </h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Votre mot de passe a été changé avec succès
          </p>
        </div>

        <div className="mt-6 rounded-xl border border-emerald-200/60 bg-emerald-50/50 p-4 dark:border-emerald-800/40 dark:bg-emerald-950/20">
          <div className="flex gap-3">
            <CheckCircle className="mt-0.5 h-5 w-5 flex-shrink-0 text-emerald-500" />
            <div>
              <p className="text-sm font-medium text-emerald-900 dark:text-emerald-100">
                Connexion requise
              </p>
              <p className="text-xs text-emerald-700/90 dark:text-emerald-300/80 mt-1">
                Vous pouvez maintenant vous connecter avec votre nouveau mot de passe.
              </p>
            </div>
          </div>
        </div>

        <div className="mt-6 space-y-3">
          <Button
            onClick={() => router.push(`/${locale}/auth/login`)}
            className="w-full h-11 rounded-xl bg-gradient-to-r from-[#7C4DFF] to-[#C2185B] text-white shadow-md hover:shadow-lg hover:opacity-95 transition-all"
          >
            <KeyRound className="mr-2 h-4 w-4" />
            Se connecter
          </Button>

          <div className="text-center">
            <Link
              href={`/${locale}/auth/login`}
              className="group inline-flex items-center text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              <ArrowLeft className="mr-1.5 h-4 w-4 transition-transform group-hover:-translate-x-0.5" />
              Retour à la connexion
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // ─── Form State ───
  return (
    <div className="auth-card">
      {/* Header icon */}
      <div className="relative mb-6 flex flex-col items-center">
        <div className="relative flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-[#7C4DFF]/10 to-[#C2185B]/10 dark:from-[#7C4DFF]/20 dark:to-[#C2185B]/20">
          <Lock className="h-8 w-8 text-[#7C4DFF]" />
        </div>
      </div>

      {/* Title */}
      <div className="text-center">
        <h2 className="text-2xl font-bold tracking-tight text-foreground">
          Nouveau mot de passe
        </h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Créez un mot de passe fort et sécurisé
        </p>
      </div>

      {/* Error alert */}
      {status === 'error' && (
        <div className="mt-5 flex gap-3 rounded-xl border border-red-200/60 bg-red-50/50 p-3.5 dark:border-red-800/40 dark:bg-red-950/20">
          <AlertCircle className="mt-0.5 h-5 w-5 flex-shrink-0 text-red-500" />
          <div>
            <p className="text-sm font-medium text-red-800 dark:text-red-200">Erreur</p>
            <p className="text-xs text-red-600/90 dark:text-red-400/80 mt-0.5">{errorMessage}</p>
          </div>
        </div>
      )}

      {/* Form */}
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="mt-6 space-y-5">
          {/* New Password */}
          <FormField
            control={form.control}
            name="newPassword"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-sm font-medium text-foreground">Nouveau mot de passe</FormLabel>
                <div className="relative">
                  <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5">
                    <Lock className="h-4.5 w-4.5 text-muted-foreground/60" />
                  </div>
                  <Input
                    type={showPassword ? 'text' : 'password'}
                    placeholder="Minimum 8 caractères"
                    disabled={isLoading}
                    className="pl-10 pr-10 h-11 rounded-xl border-border/80 bg-background/50 transition-all focus:border-[#7C4DFF]/50 focus:ring-[#7C4DFF]/20 focus:ring-2"
                    {...field}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 flex items-center pr-3.5 text-muted-foreground/60 hover:text-foreground transition-colors"
                    aria-label={showPassword ? 'Masquer le mot de passe' : 'Afficher le mot de passe'}
                  >
                    {showPassword ? <EyeOff className="h-4.5 w-4.5" /> : <Eye className="h-4.5 w-4.5" />}
                  </button>
                </div>
                <FormMessage className="text-xs" />
              </FormItem>
            )}
          />

          {/* Password Strength Meter */}
          {newPassword && (
            <div className="space-y-2.5 animate-[fadeIn_0.3s_ease-out]">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-muted-foreground">Force du mot de passe</span>
                <span className={`text-xs font-semibold ${strengthConfig[strength.level].color}`}>
                  {strengthConfig[strength.level].label}
                </span>
              </div>
              {/* Progress bar */}
              <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted/60">
                <div
                  className={`h-full rounded-full ${strengthConfig[strength.level].bgColor} ${strengthConfig[strength.level].width} transition-all duration-500 ease-out`}
                />
              </div>
              {/* Criteria checklist */}
              <div className="grid grid-cols-2 gap-x-3 gap-y-1.5">
                {strengthCriteria.map(({ label, test }) => {
                  const passed = test(newPassword);
                  return (
                    <div key={label} className="flex items-center gap-2 text-xs">
                      {passed ? (
                        <CheckCircle className="h-3.5 w-3.5 flex-shrink-0 text-emerald-500" />
                      ) : (
                        <span className="h-3.5 w-3.5 flex-shrink-0 rounded-full border-2 border-muted-foreground/20" />
                      )}
                      <span className={passed ? 'text-emerald-600 dark:text-emerald-400' : 'text-muted-foreground/60'}>
                        {label}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Confirm Password */}
          <FormField
            control={form.control}
            name="confirmPassword"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-sm font-medium text-foreground">Confirmer le mot de passe</FormLabel>
                <div className="relative">
                  <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5">
                    <Lock className="h-4.5 w-4.5 text-muted-foreground/60" />
                  </div>
                  <Input
                    type={showConfirmPassword ? 'text' : 'password'}
                    placeholder="Confirmez votre mot de passe"
                    disabled={isLoading}
                    className="pl-10 pr-10 h-11 rounded-xl border-border/80 bg-background/50 transition-all focus:border-[#7C4DFF]/50 focus:ring-[#7C4DFF]/20 focus:ring-2"
                    {...field}
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute inset-y-0 right-0 flex items-center pr-3.5 text-muted-foreground/60 hover:text-foreground transition-colors"
                    aria-label={showConfirmPassword ? 'Masquer le mot de passe' : 'Afficher le mot de passe'}
                  >
                    {showConfirmPassword ? <EyeOff className="h-4.5 w-4.5" /> : <Eye className="h-4.5 w-4.5" />}
                  </button>
                </div>
                <FormMessage className="text-xs" />
              </FormItem>
            )}
          />

          {/* Submit */}
          <Button
            type="submit"
            disabled={isLoading}
            className="w-full h-11 rounded-xl bg-gradient-to-r from-[#7C4DFF] to-[#C2185B] text-white font-medium shadow-md hover:shadow-lg hover:opacity-95 transition-all disabled:opacity-50"
          >
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Réinitialisation en cours...
              </>
            ) : (
              <>
                <ShieldCheck className="mr-2 h-4 w-4" />
                Réinitialiser le mot de passe
              </>
            )}
          </Button>
        </form>
      </Form>

      {/* Back link */}
      <div className="mt-6 text-center">
        <Link
          href={`/${locale}/auth/login`}
          className="group inline-flex items-center text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="mr-1.5 h-4 w-4 transition-transform group-hover:-translate-x-0.5" />
          Retour à la connexion
        </Link>
      </div>
    </div>
  );
}
