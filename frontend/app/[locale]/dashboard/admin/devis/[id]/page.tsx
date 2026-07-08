'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { getQuoteRequest } from '@/services/adminPlatform';
import { PageLoader } from '@/components/ui/loading';

export default function AdminDevisDetailsPage() {
  const params = useParams();
  const locale = String(params?.locale || 'en');
  const id = String(params?.id || '');

  const { data, isLoading } = useQuery({
    queryKey: ['admin-quote-request', id],
    queryFn: () => getQuoteRequest(id),
    enabled: Boolean(id),
  });

  if (isLoading) return <PageLoader />;
  if (!data) return <div>Demande introuvable.</div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Details demande de devis</h1>
        <Button asChild variant="outline">
          <Link href={`/${locale}/dashboard/admin/devis`}>Retour</Link>
        </Button>
      </div>

      <div className="grid grid-cols-1 gap-4 rounded-xl border bg-white p-6 md:grid-cols-2">
        <div><p className="text-xs text-slate-500">Nom</p><p className="font-medium">{data.name}</p></div>
        <div><p className="text-xs text-slate-500">Email</p><p className="font-medium">{data.email}</p></div>
        <div><p className="text-xs text-slate-500">Telephone</p><p className="font-medium">{data.phone || '-'}</p></div>
        <div><p className="text-xs text-slate-500">Organisation</p><p className="font-medium">{data.organization}</p></div>
        <div><p className="text-xs text-slate-500">Nombre utilisateurs</p><p className="font-medium">{data.numberOfUsers}</p></div>
        <div><p className="text-xs text-slate-500">Plan</p><p className="font-medium capitalize">{data.planType}</p></div>
        <div><p className="text-xs text-slate-500">Statut</p><p className="font-medium capitalize">{data.status}</p></div>
        <div><p className="text-xs text-slate-500">Lead score</p><p className="font-medium">{data.leadScore ?? 0}</p></div>
        <div><p className="text-xs text-slate-500">Lead tier</p><p className="font-medium uppercase">{data.leadTier ?? 'low'}</p></div>
        <div><p className="text-xs text-slate-500">SLA</p><p className="font-medium">{data.slaBreached ? 'Depassee' : 'OK'}</p></div>
        <div><p className="text-xs text-slate-500">Date</p><p className="font-medium">{new Date(data.createdAt).toLocaleString()}</p></div>
        <div className="md:col-span-2">
          <p className="text-xs text-slate-500">Message</p>
          <p className="whitespace-pre-wrap font-medium">{data.message || '-'}</p>
        </div>
      </div>
    </div>
  );
}
