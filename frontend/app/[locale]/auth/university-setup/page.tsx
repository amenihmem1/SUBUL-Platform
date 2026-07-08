'use client';

import { useState, useEffect, useMemo } from 'react';
import { useRouter, useParams, useSearchParams } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Lock, Eye, EyeOff, Loader2, CheckCircle, AlertCircle, Building2, ShieldCheck } from 'lucide-react';
import {
  Form,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import api from '@/lib/api/client';
import { setToken } from '@/lib/auth/token';
import { toast } from 'sonner';

const setupSchema = z.object({
  fullName: z.string().min(2, 'Full name must be at least 2 characters'),
  password: z.string()
    .min(8, 'Password must be at least 8 characters')
    .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
    .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
    .regex(/[0-9]/, 'Password must contain at least one digit'),
  confirmPassword: z.string(),
}).refine(d => d.password === d.confirmPassword, {
  message: 'Passwords do not match',
  path: ['confirmPassword'],
});

type SetupFormValues = z.infer<typeof setupSchema>;

const strengthCriteria = [
  { label: 'At least 8 characters', test: (pw: string) => pw.length >= 8 },
  { label: 'One uppercase letter', test: (pw: string) => /[A-Z]/.test(pw) },
  { label: 'One lowercase letter', test: (pw: string) => /[a-z]/.test(pw) },
  { label: 'One digit', test: (pw: string) => /[0-9]/.test(pw) },
];

function strengthOf(pw: string) {
  const score = strengthCriteria.reduce((a, c) => a + (c.test(pw) ? 1 : 0), 0);
  if (score <= 1) return { label: 'Weak', color: 'text-red-500', bg: 'bg-red-500', w: 'w-1/4' };
  if (score === 2) return { label: 'Fair', color: 'text-amber-500', bg: 'bg-amber-500', w: 'w-2/4' };
  if (score === 3) return { label: 'Good', color: 'text-blue-500', bg: 'bg-blue-500', w: 'w-3/4' };
  return { label: 'Strong', color: 'text-emerald-500', bg: 'bg-emerald-500', w: 'w-full' };
}

export default function UniversitySetupPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const router = useRouter();
  const locale = (params?.locale as string) || 'en';
  const token = searchParams?.get('token') || '';

  const [tokenInfo, setTokenInfo] = useState<{ universityName?: string; email?: string } | null>(null);
  const [tokenError, setTokenError] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [showConfirmPw, setShowConfirmPw] = useState(false);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    if (!token) { setTokenError('Missing setup token.'); return; }
    api.get(`/api/auth/university/setup?token=${token}`)
      .then(r => setTokenInfo(r.data))
      .catch(() => setTokenError('This setup link is invalid or has expired. Please contact your Subul administrator.'));
  }, [token]);

  const form = useForm<SetupFormValues>({
    resolver: zodResolver(setupSchema),
    defaultValues: { fullName: '', password: '', confirmPassword: '' },
    mode: 'onChange',
  });

  const pw = form.watch('password');
  const strength = useMemo(() => strengthOf(pw || ''), [pw]);
  const isLoading = form.formState.isSubmitting;

  const onSubmit = async (data: SetupFormValues) => {
    try {
      const res = await api.post('/api/auth/university/setup', {
        token,
        fullName: data.fullName,
        password: data.password,
      });
      setToken(res.data.token);
      toast.success('Workspace activated! Welcome aboard.');
      setSuccess(true);
      setTimeout(() => router.push(`/${locale}/dashboard/university`), 1500);
    } catch (e: any) {
      toast.error(e?.response?.data?.message || 'Setup failed. Please try again.');
    }
  };

  if (tokenError) return (
    <div className="auth-card">
      <div className="flex flex-col items-center mb-6">
        <div className="flex h-20 w-20 items-center justify-center rounded-full bg-red-100">
          <AlertCircle className="h-9 w-9 text-red-500" />
        </div>
      </div>
      <div className="text-center">
        <h2 className="text-2xl font-bold text-foreground">Invalid Setup Link</h2>
        <p className="mt-2 text-sm text-muted-foreground">{tokenError}</p>
      </div>
    </div>
  );

  if (!tokenInfo) return (
    <div className="auth-card flex items-center justify-center py-16">
      <Loader2 className="h-8 w-8 animate-spin text-[#7C4DFF]" />
    </div>
  );

  if (success) return (
    <div className="auth-card">
      <div className="flex flex-col items-center mb-6">
        <div className="flex h-20 w-20 items-center justify-center rounded-full bg-emerald-100">
          <ShieldCheck className="h-9 w-9 text-emerald-500" />
        </div>
      </div>
      <div className="text-center">
        <h2 className="text-2xl font-bold text-foreground">Workspace Activated!</h2>
        <p className="mt-2 text-sm text-muted-foreground">Redirecting to your university dashboard…</p>
      </div>
    </div>
  );

  return (
    <div className="auth-card">
      {/* Header */}
      <div className="flex flex-col items-center mb-6">
        <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-[#7C4DFF]/10 to-[#C2185B]/10">
          <Building2 className="h-8 w-8 text-[#7C4DFF]" />
        </div>
        <div className="text-center mt-4">
          <h2 className="text-2xl font-bold text-foreground">Activate Your Workspace</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Setting up <strong>{tokenInfo.universityName}</strong> on Subul
          </p>
          {tokenInfo.email && (
            <p className="mt-1 text-xs text-muted-foreground">for {tokenInfo.email}</p>
          )}
        </div>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
          {/* Full Name */}
          <FormField
            control={form.control}
            name="fullName"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Your Full Name</FormLabel>
                <Input
                  placeholder="e.g. Dr. Ahmed Ben Ali"
                  disabled={isLoading}
                  className="h-11 rounded-xl"
                  {...field}
                />
                <FormMessage className="text-xs" />
              </FormItem>
            )}
          />

          {/* Password */}
          <FormField
            control={form.control}
            name="password"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Create Password</FormLabel>
                <div className="relative">
                  <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5">
                    <Lock className="h-4 w-4 text-muted-foreground/60" />
                  </div>
                  <Input
                    type={showPw ? 'text' : 'password'}
                    placeholder="At least 8 characters"
                    disabled={isLoading}
                    className="pl-10 pr-10 h-11 rounded-xl"
                    {...field}
                  />
                  <button type="button" onClick={() => setShowPw(!showPw)}
                    className="absolute inset-y-0 right-0 flex items-center pr-3.5 text-muted-foreground/60">
                    {showPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
                <FormMessage className="text-xs" />
              </FormItem>
            )}
          />

          {/* Strength meter */}
          {pw && (
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-xs text-muted-foreground">Password strength</span>
                <span className={`text-xs font-semibold ${strength.color}`}>{strength.label}</span>
              </div>
              <div className="h-1.5 w-full rounded-full bg-muted/60 overflow-hidden">
                <div className={`h-full rounded-full ${strength.bg} ${strength.w} transition-all duration-500`} />
              </div>
              <div className="grid grid-cols-2 gap-1.5">
                {strengthCriteria.map(c => {
                  const ok = c.test(pw);
                  return (
                    <div key={c.label} className="flex items-center gap-1.5 text-xs">
                      {ok
                        ? <CheckCircle className="h-3.5 w-3.5 text-emerald-500 flex-shrink-0" />
                        : <span className="h-3.5 w-3.5 rounded-full border-2 border-muted-foreground/20 flex-shrink-0" />}
                      <span className={ok ? 'text-emerald-600 dark:text-emerald-400' : 'text-muted-foreground/60'}>{c.label}</span>
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
                <FormLabel>Confirm Password</FormLabel>
                <div className="relative">
                  <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5">
                    <Lock className="h-4 w-4 text-muted-foreground/60" />
                  </div>
                  <Input
                    type={showConfirmPw ? 'text' : 'password'}
                    placeholder="Confirm your password"
                    disabled={isLoading}
                    className="pl-10 pr-10 h-11 rounded-xl"
                    {...field}
                  />
                  <button type="button" onClick={() => setShowConfirmPw(!showConfirmPw)}
                    className="absolute inset-y-0 right-0 flex items-center pr-3.5 text-muted-foreground/60">
                    {showConfirmPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
                <FormMessage className="text-xs" />
              </FormItem>
            )}
          />

          <Button
            type="submit"
            disabled={isLoading}
            className="w-full h-11 rounded-xl bg-gradient-to-r from-[#7C4DFF] to-[#C2185B] text-white font-medium shadow-md hover:opacity-95 transition-all"
          >
            {isLoading ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Activating…</> : <><ShieldCheck className="mr-2 h-4 w-4" />Activate Workspace</>}
          </Button>
        </form>
      </Form>
    </div>
  );
}
