'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useParams } from 'next/navigation';
import { Eye, Loader2, Trash2 } from 'lucide-react';
import { Badge, Button, useToast } from '@/components/ui';
import { LoadingRow } from '@/components/ui/loading';
import {
  deleteQuoteRequest,
  listQuoteRequests,
  updateQuoteRequestStatus,
  type QuoteRequestItem,
  type QuoteRequestStatus,
} from '@/services/adminPlatform';

const STATUS_COLORS: Record<QuoteRequestStatus, string> = {
  pending: 'bg-amber-100 text-amber-700',
  contacted: 'bg-blue-100 text-blue-700',
  closed: 'bg-emerald-100 text-emerald-700',
};

const LEAD_TIER_COLORS: Record<'high' | 'medium' | 'low', string> = {
  high: 'bg-rose-100 text-rose-700',
  medium: 'bg-indigo-100 text-indigo-700',
  low: 'bg-slate-100 text-slate-700',
};

export default function AdminDevisPage() {
  const params = useParams();
  const locale = String(params?.locale || 'en');
  const [statusFilter, setStatusFilter] = useState<'all' | QuoteRequestStatus>('all');
  const { showToast } = useToast();
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ['admin-quote-requests', statusFilter],
    queryFn: () => listQuoteRequests({ page: 1, limit: 100, status: statusFilter === 'all' ? undefined : statusFilter }),
  });

  const deleteMutation = useMutation({
    mutationFn: deleteQuoteRequest,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['admin-quote-requests'] }),
  });

  const statusMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: QuoteRequestStatus }) => updateQuoteRequestStatus(id, status),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['admin-quote-requests'] }),
  });

  const rows = useMemo(() => data?.data || [], [data?.data]);

  const nextStatus = (status: QuoteRequestStatus): QuoteRequestStatus =>
    status === 'pending' ? 'contacted' : status === 'contacted' ? 'closed' : 'pending';

  const onDelete = async (id: string) => {
    try {
      await deleteMutation.mutateAsync(id);
      showToast('Demande supprimee.', 'success');
    } catch (error: any) {
      showToast(error?.response?.data?.message || 'Suppression impossible.', 'error');
    }
  };

  const onStatus = async (row: QuoteRequestItem) => {
    const target = nextStatus(row.status);
    try {
      await statusMutation.mutateAsync({ id: row.id, status: target });
      showToast('Statut mis a jour.', 'success');
    } catch (error: any) {
      showToast(error?.response?.data?.message || 'Mise a jour impossible.', 'error');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Demandes de devis</h1>
          <p className="text-sm text-slate-500">Suivez les demandes universite et entreprise</p>
        </div>
      </div>

      <div className="flex gap-2">
        {(['all', 'pending', 'contacted', 'closed'] as const).map((item) => (
          <Button
            key={item}
            size="sm"
            variant={statusFilter === item ? 'default' : 'outline'}
            onClick={() => setStatusFilter(item)}
          >
            {item}
          </Button>
        ))}
      </div>

      <div className="overflow-x-auto rounded-xl border bg-white shadow-sm">
        <table className="w-full text-sm">
          <thead className="border-b bg-slate-50">
            <tr>
              <th className="p-3 text-left">Nom</th>
              <th className="p-3 text-left">Email</th>
              <th className="p-3 text-left">Organisation</th>
              <th className="p-3 text-left">Plan</th>
              <th className="p-3 text-left">Users</th>
              <th className="p-3 text-left">Lead</th>
              <th className="p-3 text-left">Statut</th>
              <th className="p-3 text-left">Date</th>
              <th className="p-3 text-left">Actions</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <LoadingRow colSpan={9} />
            ) : rows.length === 0 ? (
              <tr>
                <td className="p-6" colSpan={9}>Aucune demande.</td>
              </tr>
            ) : (
              rows.map((row) => (
                <tr key={row.id} className="border-b">
                  <td className="p-3 font-medium">{row.name}</td>
                  <td className="p-3">{row.email}</td>
                  <td className="p-3">{row.organization}</td>
                  <td className="p-3 capitalize">{row.planType}</td>
                  <td className="p-3">{row.numberOfUsers}</td>
                  <td className="p-3">
                    <div className="flex flex-col gap-1">
                      <Badge className={LEAD_TIER_COLORS[row.leadTier || 'low']}>
                        {(row.leadTier || 'low').toUpperCase()} · {row.leadScore ?? 0}
                      </Badge>
                      {row.slaBreached ? (
                        <span className="text-[11px] font-semibold text-rose-600">SLA depassee</span>
                      ) : null}
                    </div>
                  </td>
                  <td className="p-3">
                    <Badge className={STATUS_COLORS[row.status]}>{row.status}</Badge>
                  </td>
                  <td className="p-3">{new Date(row.createdAt).toLocaleDateString()}</td>
                  <td className="p-3">
                    <div className="flex items-center gap-2">
                      <Button asChild variant="ghost" size="icon">
                        <Link href={`/${locale}/dashboard/admin/devis/${row.id}`}>
                          <Eye className="h-4 w-4" />
                        </Link>
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => onStatus(row)} disabled={statusMutation.isPending}>
                        {statusMutation.isPending ? '...' : `Passer ${nextStatus(row.status)}`}
                      </Button>
                      <Button size="icon" variant="ghost" onClick={() => onDelete(row.id)} disabled={deleteMutation.isPending}>
                        {deleteMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4 text-red-600" />}
                      </Button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
