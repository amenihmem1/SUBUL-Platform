'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams, useSearchParams } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Lock, Eye, EyeOff, Loader2, AlertCircle, Users, CheckCircle, User } from 'lucide-react';
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
import { setToken, getToken } from '@/lib/auth/token';
import { toast } from 'sonner';

const newAccountSchema = z.object({
  fullName: z.string().min(2, 'Full name is required'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  confirmPassword: z.string(),
}).refine(d => d.password === d.confirmPassword, { message: 'Passwords do not match', path: ['confirmPassword'] });

type FormValues = z.infer<typeof newAccountSchema>;

export default function UniversityInvitePage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const router = useRouter();
  const locale = (params?.locale as string) || 'en';
  const token = searchParams?.get('token') || '';

  const [inviteInfo, setInviteInfo] = useState<{
    email?: string;
    universityName?: string;
    universityLogo?: string;
    role?: string;
  } | null>(null);
  const [tokenError, setTokenError] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [showConfirmPw, setShowConfirmPw] = useState(false);
  const [success, setSuccess] = useState(false);

  const hasExistingSession = !!getToken();

  useEffect(() => {
    if (!token) { setTokenError('Missing invite token.'); return; }
    api.get(`/api/auth/university/invite?token=${token}`)
      .then(r => setInviteInfo(r.data))
      .catch(() => setTokenError('This invite link is invalid or has expired. Please contact your university administrator.'));
  }, [token]);

  const form = useForm<FormValues>({
    resolver: zodResolver(newAccountSchema),
    defaultValues: { fullName: '', password: '', confirmPassword: '' },
    mode: 'onChange',
  });

  const isLoading = form.formState.isSubmitting;

  const acceptWithExistingAccount = async () => {
    try {
      const res = await api.post('/api/auth/university/invite', { token });
      setToken(res.data.token);
      toast.success(`Welcome to ${inviteInfo?.universityName}!`);
      setSuccess(true);
      setTimeout(() => router.push(`/${locale}/dashboard/learner`), 1500);
    } catch (e: any) {
      toast.error(e?.response?.data?.message || 'Failed to accept invite.');
    }
  };

  const onSubmit = async (data: FormValues) => {
    try {
      const res = await api.post('/api/auth/university/invite', {
        token,
        fullName: data.fullName,
        password: data.password,
      });
      setToken(res.data.token);
      toast.success(`Welcome to ${inviteInfo?.universityName}!`);
      setSuccess(true);
      setTimeout(() => router.push(`/${locale}/dashboard/learner`), 1500);
    } catch (e: any) {
      toast.error(e?.response?.data?.message || 'Failed to accept invite.');
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
        <h2 className="text-2xl font-bold text-foreground">Invalid Invite</h2>
        <p className="mt-2 text-sm text-muted-foreground">{tokenError}</p>
      </div>
    </div>
  );

  if (!inviteInfo) return (
    <div className="auth-card flex items-center justify-center py-16">
      <Loader2 className="h-8 w-8 animate-spin text-[#7C4DFF]" />
    </div>
  );

  if (success) return (
    <div className="auth-card">
      <div className="flex flex-col items-center mb-6">
        <div className="flex h-20 w-20 items-center justify-center rounded-full bg-emerald-100">
          <CheckCircle className="h-9 w-9 text-emerald-500" />
        </div>
      </div>
      <div className="text-center">
        <h2 className="text-2xl font-bold text-foreground">You're In!</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Welcome to {inviteInfo.universityName}. Redirecting to your dashboard…
        </p>
      </div>
    </div>
  );

  return (
    <div className="auth-card">
      {/* University branding */}
      <div className="flex flex-col items-center mb-6">
        {inviteInfo.universityLogo
          ? <img src={inviteInfo.universityLogo} alt={inviteInfo.universityName} className="h-16 w-16 rounded-2xl object-contain border" />
          : (
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-[#7C4DFF]/10 to-[#C2185B]/10">
              <Users className="h-8 w-8 text-[#7C4DFF]" />
            </div>
          )}
        <div className="text-center mt-4">
          <h2 className="text-2xl font-bold text-foreground">You've Been Invited!</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Join <strong>{inviteInfo.universityName}</strong> as a{' '}
            <strong className="capitalize">{inviteInfo.role ?? 'student'}</strong> on Subul
          </p>
          {inviteInfo.email && (
            <p className="mt-1 text-xs text-muted-foreground">Invite sent to: {inviteInfo.email}</p>
          )}
        </div>
      </div>

      {/* If user already logged in, offer quick link */}
      {hasExistingSession && (
        <div className="mb-6 rounded-xl border border-[#7C4DFF]/20 bg-[#7C4DFF]/5 p-4">
          <div className="flex items-start gap-3">
            <User className="mt-0.5 h-5 w-5 text-[#7C4DFF] flex-shrink-0" />
            <div>
              <p className="text-sm font-medium text-foreground">Already have an account?</p>
              <p className="text-xs text-muted-foreground mt-0.5">Accept the invite and link it to your existing account.</p>
            </div>
          </div>
          <Button
            onClick={acceptWithExistingAccount}
            className="w-full mt-3 h-10 rounded-xl bg-gradient-to-r from-[#7C4DFF] to-[#C2185B] text-white"
          >
            Accept with My Account
          </Button>
          <p className="text-center text-xs text-muted-foreground mt-3">— or create a new account below —</p>
        </div>
      )}

      {/* New account form */}
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <FormField
            control={form.control}
            name="fullName"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Your Full Name</FormLabel>
                <Input placeholder="e.g. Ahmed Ben Ali" disabled={isLoading} className="h-11 rounded-xl" {...field} />
                <FormMessage className="text-xs" />
              </FormItem>
            )}
          />

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
            className="w-full h-11 rounded-xl bg-gradient-to-r from-[#7C4DFF] to-[#C2185B] text-white font-medium shadow-md hover:opacity-95"
          >
            {isLoading ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Joining…</> : <>Accept Invitation</>}
          </Button>
        </form>
      </Form>
    </div>
  );
}
