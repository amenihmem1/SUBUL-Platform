'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter, useParams, useSearchParams } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Mail, ArrowLeft, Loader2, CheckCircle, AlertCircle, MailOpen, Send } from 'lucide-react';
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

const resendVerificationSchema = z.object({
  email: z.string().email('Veuillez entrer une adresse email valide'),
});

type ResendVerificationFormValues = z.infer<typeof resendVerificationSchema>;

export default function ResendVerificationPage() {
  const router = useRouter();
  const params = useParams();
  const searchParams = useSearchParams();
  const locale = (params?.locale as string) || 'fr';
  const [status, setStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState('');
  const [submittedEmail, setSubmittedEmail] = useState('');

  const form = useForm<ResendVerificationFormValues>({
    resolver: zodResolver(resendVerificationSchema),
    defaultValues: { email: '' },
    mode: 'onChange',
  });

  useEffect(() => {
    const raw = searchParams?.get('email');
    if (!raw) return;
    const email = decodeURIComponent(raw).trim();
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return;
    form.setValue('email', email);
  }, [searchParams, form]);

  const isLoading = form.formState.isSubmitting;

  const onSubmit = async (data: ResendVerificationFormValues) => {
    try {
      setStatus('idle');
      setErrorMessage('');
      setSubmittedEmail(data.email);
      await AuthService.resendVerification(data.email);
      setStatus('success');
    } catch (error: any) {
      setStatus('error');
      setErrorMessage(error?.response?.data?.message || 'Une erreur est survenue');
    }
  };

  // ─── Success State ───
  if (status === 'success') {
    return (
      <div className="auth-card">
        {/* Success illustration */}
        <div className="relative mb-6 flex flex-col items-center">
          <div className="relative">
            <div className="success-ring">
              <div className="absolute inset-0 rounded-full bg-gradient-to-br from-emerald-400 to-green-500 blur-sm opacity-40" />
              <div className="relative flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-br from-emerald-400 to-green-500 shadow-lg">
                <MailOpen className="h-9 w-9 text-white" />
              </div>
            </div>
          </div>
        </div>

        {/* Success content */}
        <div className="text-center">
          <h2 className="text-2xl font-bold tracking-tight text-foreground">
            Email envoyé !
          </h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Vérifiez votre boîte de réception
          </p>
        </div>

        {/* Info card */}
        <div className="mt-6 rounded-xl border border-emerald-200/60 bg-emerald-50/50 p-4 dark:border-emerald-800/40 dark:bg-emerald-950/20">
          <div className="flex gap-3">
            <CheckCircle className="mt-0.5 h-5 w-5 flex-shrink-0 text-emerald-500" />
            <div className="space-y-1.5">
              <p className="text-sm font-medium text-emerald-900 dark:text-emerald-100">
                Email de vérification envoyé
              </p>
              <p className="text-xs text-emerald-700/90 dark:text-emerald-300/80 leading-relaxed">
                Si un compte existe avec <span className="font-semibold text-emerald-800 dark:text-emerald-200">{submittedEmail}</span> et n&apos;est pas encore vérifié,
                vous recevrez un email de vérification. Le lien expire dans 24 heures.
              </p>
            </div>
          </div>
        </div>

        {/* Tips */}
        <div className="mt-4 rounded-xl border border-border/50 bg-muted/30 p-4">
          <p className="text-xs font-medium text-muted-foreground mb-2">💡 Conseils :</p>
          <ul className="space-y-1.5 text-xs text-muted-foreground/80">
            <li className="flex items-start gap-2">
              <span className="mt-1 h-1 w-1 rounded-full bg-muted-foreground/50" />
              Vérifiez votre dossier spam ou courrier indésirable
            </li>
            <li className="flex items-start gap-2">
              <span className="mt-1 h-1 w-1 rounded-full bg-muted-foreground/50" />
              Assurez-vous que l&apos;adresse email est correcte
            </li>
            <li className="flex items-start gap-2">
              <span className="mt-1 h-1 w-1 rounded-full bg-muted-foreground/50" />
              Le lien expirera dans 24 heures
            </li>
          </ul>
        </div>

        {/* Actions */}
        <div className="mt-6">
          <Button asChild className="w-full h-11 rounded-xl bg-gradient-to-r from-[#7C4DFF] to-[#C2185B] text-white shadow-md hover:shadow-lg hover:opacity-95 transition-all">
            <Link href={`/${locale}/auth/login`}>
              <ArrowLeft className="mr-2 h-4 w-4" />
              Retour à la connexion
            </Link>
          </Button>
        </div>
      </div>
    );
  }

  // ─── Form State ───
  return (
    <div className="auth-card">
      {/* Header icon */}
      <div className="relative mb-6 flex flex-col items-center">
        <div className="relative">
          <div className="relative flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-[#7C4DFF]/10 to-[#C2185B]/10 dark:from-[#7C4DFF]/20 dark:to-[#C2185B]/20">
            <div className="relative">
              <Mail className="h-8 w-8 text-[#7C4DFF]" />
              <Send className="absolute -right-1.5 -bottom-1.5 h-4 w-4 text-[#C2185B] bg-card rounded-full p-0.5" />
            </div>
          </div>
        </div>
      </div>

      {/* Title */}
      <div className="text-center">
        <h2 className="text-2xl font-bold tracking-tight text-foreground">
          Renvoyer la vérification
        </h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Recevez un nouveau lien de vérification par email
        </p>
      </div>

      {/* Info card */}
      <div className="mt-5 rounded-xl border border-blue-200/60 bg-blue-50/50 p-4 dark:border-blue-800/40 dark:bg-blue-950/20">
        <div className="flex gap-3">
          <Mail className="mt-0.5 h-5 w-5 flex-shrink-0 text-blue-500" />
          <div>
            <p className="text-sm font-medium text-blue-900 dark:text-blue-100">
              Email de vérification
            </p>
            <p className="text-xs text-blue-700/90 dark:text-blue-300/80 mt-1">
              Entrez votre adresse email pour recevoir un nouveau lien de vérification.
              Le lien expire dans 24 heures.
            </p>
          </div>
        </div>
      </div>

      {/* Error alert */}
      {status === 'error' && (
        <div className="mt-4 flex gap-3 rounded-xl border border-red-200/60 bg-red-50/50 p-3.5 dark:border-red-800/40 dark:bg-red-950/20">
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
          <FormField
            control={form.control}
            name="email"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-sm font-medium text-foreground">Adresse email</FormLabel>
                <div className="relative">
                  <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5">
                    <Mail className="h-4.5 w-4.5 text-muted-foreground/60" />
                  </div>
                  <Input
                    type="email"
                    placeholder="votre@email.com"
                    disabled={isLoading}
                    className="pl-10 h-11 rounded-xl border-border/80 bg-background/50 transition-all focus:border-[#7C4DFF]/50 focus:ring-[#7C4DFF]/20 focus:ring-2"
                    {...field}
                  />
                </div>
                <FormMessage className="text-xs" />
              </FormItem>
            )}
          />

          <Button
            type="submit"
            disabled={isLoading || !form.getValues('email')}
            className="w-full h-11 rounded-xl bg-gradient-to-r from-[#7C4DFF] to-[#C2185B] text-white font-medium shadow-md hover:shadow-lg hover:opacity-95 transition-all disabled:opacity-50"
          >
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Envoi en cours...
              </>
            ) : (
              <>
                <Send className="mr-2 h-4 w-4" />
                Renvoyer l'email
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
