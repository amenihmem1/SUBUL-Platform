'use client';

import { useRouter, useParams } from 'next/navigation';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { PromoCodeForm } from '@/components/admin/promo-codes/PromoCodeForm';
import { createPromoCode } from '@/services/adminPlatform';
import { useToast } from '@/components/ui';

export default function CreatePromoCodePage() {
  const router = useRouter();
  const { locale } = useParams();
  const queryClient = useQueryClient();
  const { showToast } = useToast();

  const mutation = useMutation({
    mutationFn: createPromoCode,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['admin-promo-codes'] });
      showToast('Promo code created successfully.', 'success');
      router.push(`/${locale}/dashboard/admin/promo-codes`);
    },
    onError: (error: any) => {
      showToast(error?.response?.data?.message || 'Failed to create promo code.', 'error');
    },
  });

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">Create Promo Code</h1>
      <div className="bg-white rounded-xl border p-6">
        <PromoCodeForm submitLabel="Create Promo Code" pending={mutation.isPending} onSubmit={mutation.mutateAsync} />
      </div>
    </div>
  );
}
