'use client';

import { useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { PromoCodeForm } from '@/components/admin/promo-codes/PromoCodeForm';
import { getPromoCode, updatePromoCode } from '@/services/adminPlatform';
import { useToast } from '@/components/ui';

function toDateInput(value?: string | null) {
  if (!value) return '';
  const date = new Date(value);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

export default function EditPromoCodePage() {
  const params = useParams();
  const id = String(params?.id || '');
  const locale = String(params?.locale || 'en');
  const router = useRouter();
  const queryClient = useQueryClient();
  const { showToast } = useToast();

  const { data, isLoading } = useQuery({
    queryKey: ['admin-promo-code', id],
    queryFn: () => getPromoCode(id),
    enabled: Boolean(id),
  });

  const mutation = useMutation({
    mutationFn: (payload: any) => updatePromoCode(id, payload),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['admin-promo-codes'] });
      showToast('Promo code updated successfully.', 'success');
      router.push(`/${locale}/dashboard/admin/promo-codes`);
    },
    onError: (error: any) => showToast(error?.response?.data?.message || 'Failed to update promo code.', 'error'),
  });

  const initialValues = useMemo(() => {
    if (!data) return undefined;
    return {
      code: data.code,
      description: data.description || '',
      discountType: data.discountType,
      discountValue: String(data.discountValue),
      maxUses: data.maxUses ? String(data.maxUses) : '',
      perUserLimit: data.perUserLimit ? String(data.perUserLimit) : '',
      startDate: toDateInput(data.startDate),
      endDate: toDateInput(data.endDate),
      active: data.active,
    };
  }, [data]);

  if (isLoading) return <div>Loading...</div>;
  if (!data) return <div>Promo code not found.</div>;

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">Edit Promo Code</h1>
      <div className="bg-white rounded-xl border p-6">
        <PromoCodeForm
          initialValues={initialValues}
          submitLabel="Save Changes"
          pending={mutation.isPending}
          onSubmit={mutation.mutateAsync}
        />
      </div>
    </div>
  );
}
