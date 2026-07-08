'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useParams } from 'next/navigation';
import { Loader2, Pencil, Plus, Trash2, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/components/ui';
import { deletePromoCode, listPromoCodes, updatePromoCode, type AdminPromoCode } from '@/services/adminPlatform';

export default function AdminPromoCodesPage() {
  const { locale } = useParams();
  const { showToast } = useToast();
  const queryClient = useQueryClient();
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'expired'>('all');
  const [nowTs, setNowTs] = useState(0);

  useEffect(() => {
    setNowTs(Date.now());
  }, []);

  const { data, isLoading } = useQuery({
    queryKey: ['admin-promo-codes'],
    queryFn: () => listPromoCodes({ page: 1, limit: 100 }),
  });

  const removeMutation = useMutation({
    mutationFn: deletePromoCode,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['admin-promo-codes'] }),
  });

  const toggleMutation = useMutation({
    mutationFn: ({ id, active }: { id: string; active: boolean }) => updatePromoCode(id, { active }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['admin-promo-codes'] }),
  });

  const rows = useMemo(() => {
    const list = data?.data || [];
    return list.filter((p) => {
      const expired = p.endDate ? new Date(p.endDate).getTime() < nowTs : false;
      if (statusFilter === 'active') return p.active && !expired;
      if (statusFilter === 'expired') return expired || !p.active;
      return true;
    });
  }, [data?.data, nowTs, statusFilter]);

  const getStatus = (p: AdminPromoCode) => {
    const expired = p.endDate ? new Date(p.endDate).getTime() < nowTs : false;
    if (expired) return 'Expired';
    return p.active ? 'Active' : 'Inactive';
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Promo Codes</h1>
          <p className="text-sm text-slate-500">Manage discount campaigns and limits</p>
        </div>
        <Button asChild>
          <Link href={`/${locale}/dashboard/admin/promo-codes/create`}>
            <Plus className="w-4 h-4 mr-2" /> Create Promo Code
          </Link>
        </Button>
      </div>

      <div className="flex gap-2">
        {(['all', 'active', 'expired'] as const).map((filter) => (
          <Button key={filter} variant={statusFilter === filter ? 'default' : 'outline'} onClick={() => setStatusFilter(filter)}>
            {filter}
          </Button>
        ))}
      </div>

      <div className="bg-white rounded-xl border shadow-sm overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 border-b">
            <tr>
              <th className="p-3 text-left">Code</th>
              <th className="p-3 text-left">Type</th>
              <th className="p-3 text-left">Value</th>
              <th className="p-3 text-left">Usage</th>
              <th className="p-3 text-left">Status</th>
              <th className="p-3 text-left">Start / End</th>
              <th className="p-3 text-left">Actions</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr><td className="p-6" colSpan={7}>Loading...</td></tr>
            ) : rows.length === 0 ? (
              <tr><td className="p-6" colSpan={7}>No promo codes found.</td></tr>
            ) : rows.map((p) => (
              <tr key={p.id} className="border-b">
                <td className="p-3 font-semibold">{p.code}</td>
                <td className="p-3">{p.discountType}</td>
                <td className="p-3">{p.discountType === 'percentage' ? `${p.discountValue}%` : p.discountValue}</td>
                <td className="p-3">
                  <div className="flex flex-col gap-1 min-w-[90px]">
                    <div className="flex items-center gap-1.5">
                      <Users className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      <span className="font-semibold text-slate-800">{p.usedCount}</span>
                      <span className="text-slate-400 text-xs">/ {p.maxUses ?? '∞'}</span>
                    </div>
                    {p.maxUses != null && p.maxUses > 0 && (
                      <div className="h-1.5 rounded-full bg-slate-100 overflow-hidden w-full">
                        <div
                          className={`h-full rounded-full transition-all ${
                            p.usedCount >= p.maxUses
                              ? 'bg-red-500'
                              : p.usedCount / p.maxUses >= 0.8
                              ? 'bg-amber-400'
                              : 'bg-emerald-500'
                          }`}
                          style={{ width: `${Math.min((p.usedCount / p.maxUses) * 100, 100)}%` }}
                        />
                      </div>
                    )}
                  </div>
                </td>
                <td className="p-3">
                  <Badge variant="secondary">{getStatus(p)}</Badge>
                </td>
                <td className="p-3">
                  {(p.startDate ? new Date(p.startDate).toLocaleDateString() : '-') + ' / ' + (p.endDate ? new Date(p.endDate).toLocaleDateString() : '-')}
                </td>
                <td className="p-3">
                  <div className="flex items-center gap-1">
                    <Button asChild variant="ghost" size="icon">
                      <Link href={`/${locale}/dashboard/admin/promo-codes/${p.id}/edit`}><Pencil className="w-4 h-4" /></Link>
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      disabled={removeMutation.isPending}
                      onClick={async () => {
                        try {
                          await removeMutation.mutateAsync(p.id);
                          showToast('Promo code deleted.', 'success');
                        } catch (error) {
                          showToast((error as any)?.response?.data?.message || 'Delete failed.', 'error');
                        }
                      }}
                    >
                      {removeMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4 text-red-600" />}
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={toggleMutation.isPending}
                      onClick={async () => {
                        try {
                          await toggleMutation.mutateAsync({ id: p.id, active: !p.active });
                          showToast('Promo code status updated.', 'success');
                        } catch (error) {
                          showToast((error as any)?.response?.data?.message || 'Update failed.', 'error');
                        }
                      }}
                    >
                      {toggleMutation.isPending ? 'Saving...' : p.active ? 'Disable' : 'Enable'}
                    </Button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
