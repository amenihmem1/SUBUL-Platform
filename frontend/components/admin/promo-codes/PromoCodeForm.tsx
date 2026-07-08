'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { PromoCodePayload } from '@/services/adminPlatform';
import { listCommercials } from '@/services/commercials';

type PromoCodeFormValues = {
  code: string;
  description: string;
  discountType: 'percentage' | 'fixed';
  discountValue: string;
  currencyScope: string;
  maxUses: string;
  perUserLimit: string;
  startDate: string;
  endDate: string;
  active: boolean;
  commercialId: string;
};

// datetime-local inputs return "YYYY-MM-DDTHH:mm" with no timezone.
// Convert to a full ISO string so the server always gets UTC-anchored dates.
function localDateTimeToISO(value: string): string | undefined {
  if (!value) return undefined;
  return new Date(value).toISOString();
}

function toPayload(values: PromoCodeFormValues): PromoCodePayload {
  return {
    code: values.code.trim().toUpperCase(),
    description: values.description.trim() || undefined,
    discountType: values.discountType,
    discountValue: Number(values.discountValue || 0),
    currencyScope: values.currencyScope || undefined,
    maxUses: values.maxUses ? Number(values.maxUses) : undefined,
    perUserLimit: values.perUserLimit ? Number(values.perUserLimit) : undefined,
    startDate: localDateTimeToISO(values.startDate),
    endDate: localDateTimeToISO(values.endDate),
    active: values.active,
    commercialId: values.commercialId || undefined,
  } as any;
}

export function PromoCodeForm({
  initialValues,
  onSubmit,
  submitLabel,
  pending = false,
}: {
  initialValues?: Partial<PromoCodeFormValues>;
  onSubmit: (payload: PromoCodePayload) => Promise<void | unknown>;
  submitLabel: string;
  pending?: boolean;
}) {
  const [form, setForm] = useState<PromoCodeFormValues>({
    code: initialValues?.code || '',
    description: initialValues?.description || '',
    discountType: initialValues?.discountType || 'percentage',
    discountValue: initialValues?.discountValue || '',
    currencyScope: (initialValues as any)?.currencyScope || '',
    maxUses: initialValues?.maxUses || '',
    perUserLimit: initialValues?.perUserLimit || '',
    startDate: initialValues?.startDate || '',
    endDate: initialValues?.endDate || '',
    active: initialValues?.active ?? true,
    commercialId: (initialValues as any)?.commercialId || '',
  });
  const [error, setError] = useState<string | null>(null);

  const { data: commercialsData } = useQuery({
    queryKey: ['admin-commercials-list'],
    queryFn: () => listCommercials(1, 200),
  });

  const setField = <K extends keyof PromoCodeFormValues>(key: K, value: PromoCodeFormValues[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  return (
    <form
      className="space-y-4"
      onSubmit={async (e) => {
        e.preventDefault();
        setError(null);

        if (!form.code.trim()) return setError('Code is required.');
        if (Number(form.discountValue) <= 0) return setError('Discount value must be greater than 0.');
        if (form.discountType === 'percentage' && Number(form.discountValue) > 100) {
          return setError('Percentage discount cannot exceed 100.');
        }
        if (form.startDate && form.endDate && new Date(form.endDate) < new Date(form.startDate)) {
          return setError('End date must be after start date.');
        }

        await onSubmit(toPayload(form));
      }}
    >
      {error ? <p className="text-sm text-red-600">{error}</p> : null}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="text-sm font-medium">Code</label>
          <Input value={form.code} onChange={(e) => setField('code', e.target.value.toUpperCase())} placeholder="WELCOME50" />
        </div>
        <div>
          <label className="text-sm font-medium">Description</label>
          <Input value={form.description} onChange={(e) => setField('description', e.target.value)} placeholder="Campaign promo code" />
        </div>
        <div>
          <label className="text-sm font-medium">Discount Type</label>
          <select
            className="w-full h-10 px-3 border border-slate-200 rounded-md bg-white text-sm"
            value={form.discountType}
            onChange={(e) => setField('discountType', e.target.value as 'percentage' | 'fixed')}
          >
            <option value="percentage">Percentage</option>
            <option value="fixed">Fixed</option>
          </select>
        </div>
        <div>
          <label className="text-sm font-medium">Value</label>
          <Input type="number" step="0.01" value={form.discountValue} onChange={(e) => setField('discountValue', e.target.value)} />
        </div>
        <div>
          <label className="text-sm font-medium">Currency</label>
          <select
            className="w-full h-10 px-3 border border-slate-200 rounded-md bg-white text-sm mt-1"
            value={form.currencyScope}
            onChange={(e) => setField('currencyScope', e.target.value)}
          >
            <option value="">All currencies</option>
            <option value="EUR">EUR — Euro</option>
            <option value="USD">USD — US Dollar</option>
            <option value="TND">TND — Tunisian Dinar</option>
          </select>
          <p className="text-xs text-slate-400 mt-1">If set, code only works for this currency.</p>
        </div>
        <div>
          <label className="text-sm font-medium">Max Uses</label>
          <Input type="number" value={form.maxUses} onChange={(e) => setField('maxUses', e.target.value)} />
        </div>
        <div>
          <label className="text-sm font-medium">Per User Limit</label>
          <Input type="number" value={form.perUserLimit} onChange={(e) => setField('perUserLimit', e.target.value)} />
        </div>
        <div>
          <label className="text-sm font-medium">Start Date</label>
          <Input type="datetime-local" value={form.startDate} onChange={(e) => setField('startDate', e.target.value)} />
        </div>
        <div>
          <label className="text-sm font-medium">End Date</label>
          <Input type="datetime-local" value={form.endDate} onChange={(e) => setField('endDate', e.target.value)} />
        </div>
      </div>
      {/* Commercial assignment */}
      <div>
        <label className="text-sm font-medium">Assign to Commercial Agent (optional)</label>
        <select
          className="w-full h-10 px-3 border border-slate-200 rounded-md bg-white text-sm mt-1"
          value={form.commercialId}
          onChange={(e) => setField('commercialId', e.target.value)}
        >
          <option value="">— No commercial (admin/general code) —</option>
          {(commercialsData?.data ?? []).map(c => (
            <option key={c.id} value={c.id}>
              {c.user?.fullName ?? `User #${c.userId}`} ({c.user?.email})
            </option>
          ))}
        </select>
        <p className="text-xs text-slate-400 mt-1">If assigned, usage of this code will earn points for the commercial.</p>
      </div>
      <label className="inline-flex items-center gap-2 text-sm">
        <input type="checkbox" checked={form.active} onChange={(e) => setField('active', e.target.checked)} />
        Active
      </label>
      <div>
        <Button type="submit" disabled={pending}>{submitLabel}</Button>
      </div>
    </form>
  );
}
