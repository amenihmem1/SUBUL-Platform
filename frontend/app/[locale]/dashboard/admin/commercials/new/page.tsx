'use client';

import { useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { createCommercial } from '@/services/commercials';
import { ArrowLeft, UserPlus, AlertCircle } from 'lucide-react';
import Link from 'next/link';

type FormState = {
  email: string;
  fullName: string;
  password: string;
  preferredCurrency: string;
  notes: string;
};

function Field({
  label, required, error, children,
}: {
  label: string; required?: boolean; error?: string; children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <label className="text-sm font-medium">
        {label}{required && <span className="text-red-500 ml-0.5">*</span>}
      </label>
      {children}
      {error && (
        <p className="text-xs text-red-500 flex items-center gap-1">
          <AlertCircle className="w-3 h-3" /> {error}
        </p>
      )}
    </div>
  );
}

const inputCls = 'w-full px-3 py-2.5 rounded-xl border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-[#7C4DFF]/30 focus:border-[#7C4DFF] transition-colors';
const selectCls = `${inputCls} cursor-pointer`;

export default function NewCommercialPage() {
  const router = useRouter();
  const params = useParams();
  const locale = String(params?.locale ?? 'en');
  const qc = useQueryClient();

  const [form, setForm] = useState<FormState>({
    email: '',
    fullName: '',
    password: '',
    preferredCurrency: 'EUR',
    notes: '',
  });
  const [errors, setErrors] = useState<Partial<FormState>>({});
  const [serverError, setServerError] = useState('');

  const mut = useMutation({
    mutationFn: () => createCommercial({
      email: form.email.trim(),
      fullName: form.fullName.trim(),
      password: form.password,
      preferredCurrency: form.preferredCurrency || undefined,
      notes: form.notes.trim() || undefined,
    }),
    onSuccess: (profile) => {
      qc.invalidateQueries({ queryKey: ['admin', 'commercials'] });
      router.push(`/${locale}/dashboard/admin/commercials/${profile.id}`);
    },
    onError: (err: any) => {
      const msg = err?.response?.data?.message ?? err?.message ?? 'Failed to create commercial.';
      setServerError(Array.isArray(msg) ? msg.join(', ') : String(msg));
    },
  });

  const set = (field: keyof FormState) => (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) => {
    setForm(prev => ({ ...prev, [field]: e.target.value }));
    setErrors(prev => ({ ...prev, [field]: '' }));
    setServerError('');
  };

  const validate = (): boolean => {
    const errs: Partial<FormState> = {};
    if (!form.email.trim()) errs.email = 'Email is required';
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) errs.email = 'Invalid email address';
    if (!form.fullName.trim()) errs.fullName = 'Full name is required';
    if (!form.password) errs.password = 'Password is required';
    else if (form.password.length < 8) errs.password = 'Minimum 8 characters';
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    mut.mutate();
  };

  return (
    <div className="max-w-xl mx-auto space-y-6">

      {/* Header */}
      <div className="flex items-center gap-3">
        <Link
          href={`/${locale}/dashboard/admin/commercials`}
          className="p-2 rounded-xl hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">New Commercial</h1>
          <p className="text-muted-foreground text-sm mt-0.5">Create an affiliate partner account.</p>
        </div>
      </div>

      {/* Form card */}
      <form onSubmit={submit} className="rounded-2xl border bg-card shadow-card p-6 space-y-5">

        {/* Section: Account */}
        <div>
          <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-4">
            Account Details
          </h2>
          <div className="space-y-4">
            <Field label="Full Name" required error={errors.fullName}>
              <input
                type="text"
                className={inputCls}
                placeholder="Jane Smith"
                value={form.fullName}
                onChange={set('fullName')}
                autoComplete="name"
              />
            </Field>
            <Field label="Email" required error={errors.email}>
              <input
                type="email"
                className={inputCls}
                placeholder="jane@example.com"
                value={form.email}
                onChange={set('email')}
                autoComplete="email"
              />
            </Field>
            <Field label="Password" required error={errors.password}>
              <input
                type="password"
                className={inputCls}
                placeholder="At least 8 characters"
                value={form.password}
                onChange={set('password')}
                autoComplete="new-password"
              />
            </Field>
          </div>
        </div>

        <div className="border-t border-border/50" />

        {/* Section: Payout Settings */}
        <div>
          <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-4">
            Payout Settings
          </h2>
          <div className="space-y-4">
            <Field label="Preferred Payout Currency">
              <select
                className={selectCls}
                value={form.preferredCurrency}
                onChange={set('preferredCurrency')}
              >
                <option value="EUR">EUR — Euro</option>
                <option value="TND">TND — Tunisian Dinar</option>
                <option value="USD">USD — US Dollar</option>
              </select>
            </Field>
          </div>
        </div>

        <div className="border-t border-border/50" />

        {/* Notes */}
        <Field label="Notes (optional)">
          <textarea
            className={`${inputCls} min-h-[80px] resize-y`}
            placeholder="Internal notes about this partner…"
            value={form.notes}
            onChange={set('notes')}
          />
        </Field>

        {/* Server error */}
        {serverError && (
          <div className="rounded-xl bg-red-50 border border-red-200 p-3 flex items-start gap-2 text-sm text-red-700">
            <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
            {serverError}
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-3 pt-1">
          <Link
            href={`/${locale}/dashboard/admin/commercials`}
            className="flex-1 text-center px-4 py-2.5 rounded-xl border text-sm font-medium hover:bg-muted transition-colors"
          >
            Cancel
          </Link>
          <button
            type="submit"
            disabled={mut.isPending}
            className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-[#7C4DFF] to-[#C2185B] text-white text-sm font-semibold shadow-md hover:opacity-90 disabled:opacity-60 transition-opacity"
          >
            <UserPlus className="w-4 h-4" />
            {mut.isPending ? 'Creating…' : 'Create Commercial'}
          </button>
        </div>
      </form>
    </div>
  );
}
