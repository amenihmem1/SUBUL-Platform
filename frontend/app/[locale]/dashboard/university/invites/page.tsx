'use client';

import { useState } from 'react';
import { useParams } from 'next/navigation';
import { motion } from 'framer-motion';
import {
  Mail,
  Send,
  RefreshCw,
  X,
  Clock,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Users,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import {
  useUniversityInvites,
  useSendInvite,
  useResendInvite,
  useCancelInvite,
  useUniversityCohorts,
  useUniversityDepartments,
} from '@/hooks/api/useUniversity';

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: React.ElementType }> = {
  pending: { label: 'En attente', color: 'bg-amber-500/10 text-amber-600', icon: Clock },
  accepted: { label: 'Accepté', color: 'bg-emerald-500/10 text-emerald-600', icon: CheckCircle2 },
  expired: { label: 'Expiré', color: 'bg-slate-500/10 text-slate-600', icon: AlertCircle },
  cancelled: { label: 'Annulé', color: 'bg-red-500/10 text-red-600', icon: XCircle },
};

export default function UniversityInvitesPage() {
  const params = useParams();
  const locale = (params?.locale as string) || 'en';
  const [filterStatus, setFilterStatus] = useState<string | undefined>(undefined);
  const [showForm, setShowForm] = useState(false);
  const [email, setEmail] = useState('');
  const [cohortId, setCohortId] = useState('');
  const [departmentId, setDepartmentId] = useState('');

  const { data: invites, isLoading } = useUniversityInvites(filterStatus);
  const { data: cohorts } = useUniversityCohorts();
  const { data: departments } = useUniversityDepartments();
  const sendInvite = useSendInvite();
  const resendInvite = useResendInvite();
  const cancelInvite = useCancelInvite();

  const inviteList: any[] = Array.isArray(invites) ? invites : invites?.data ?? [];
  const cohortList: any[] = Array.isArray(cohorts) ? cohorts : [];
  const departmentList: any[] = Array.isArray(departments) ? departments : [];

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;
    try {
      await sendInvite.mutateAsync({
        email: email.trim(),
        cohortId: cohortId || undefined,
        departmentId: departmentId || undefined,
        role: 'student',
      });
      setEmail('');
      setCohortId('');
      setDepartmentId('');
      setShowForm(false);
    } catch (err: any) {
      const msg = err?.response?.data?.message;
      toast.error(typeof msg === 'string' ? msg : "Erreur lors de l'envoi de l'invitation");
    }
  };

  const statusTabs = [
    { label: 'Toutes', value: undefined },
    { label: 'En attente', value: 'pending' },
    { label: 'Acceptées', value: 'accepted' },
    { label: 'Expirées', value: 'expired' },
  ];

  const pendingCount = inviteList.filter(i => i.status === 'pending').length;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Invitations</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Invitez des étudiants à rejoindre votre université.
          </p>
        </div>
        <Button onClick={() => setShowForm(!showForm)} className="gap-2">
          <Send className="w-4 h-4" />
          Inviter un étudiant
        </Button>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Total', value: inviteList.length, color: '#7C4DFF' },
          { label: 'En attente', value: pendingCount, color: '#f59e0b' },
          { label: 'Acceptées', value: inviteList.filter(i => i.status === 'accepted').length, color: '#10b981' },
          { label: 'Expirées', value: inviteList.filter(i => i.status === 'expired').length, color: '#94a3b8' },
        ].map(stat => (
          <div key={stat.label} className="bg-card border border-border rounded-xl p-4">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center mb-2" style={{ background: `${stat.color}20` }}>
              <Users className="w-4 h-4" style={{ color: stat.color }} />
            </div>
            <p className="text-2xl font-bold text-foreground">{stat.value}</p>
            <p className="text-xs text-muted-foreground">{stat.label}</p>
          </div>
        ))}
      </div>

      {/* Invite form */}
      {showForm && (
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-card border border-border rounded-2xl p-6 shadow-sm"
        >
          <h2 className="text-lg font-semibold mb-4">Nouvelle invitation</h2>
          <form onSubmit={handleSend} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <Label htmlFor="email">Email *</Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="etudiant@univ.tn"
                  required
                  className="mt-1"
                />
              </div>
              <div>
                <Label htmlFor="cohort">Cohorte (optionnel)</Label>
                <select
                  id="cohort"
                  value={cohortId}
                  onChange={e => setCohortId(e.target.value)}
                  className="mt-1 w-full border border-border rounded-lg px-3 py-2 bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                >
                  <option value="">— Aucune cohorte —</option>
                  {cohortList.map((c: any) => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <Label htmlFor="dept">Département (optionnel)</Label>
                <select
                  id="dept"
                  value={departmentId}
                  onChange={e => setDepartmentId(e.target.value)}
                  className="mt-1 w-full border border-border rounded-lg px-3 py-2 bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                >
                  <option value="">— Aucun département —</option>
                  {departmentList.map((d: any) => (
                    <option key={d.id} value={d.id}>{d.name}</option>
                  ))}
                </select>
              </div>
            </div>
            <div className="flex gap-2">
              <Button type="submit" disabled={sendInvite.isPending}>
                {sendInvite.isPending ? 'Envoi…' : 'Envoyer l\'invitation'}
              </Button>
              <Button type="button" variant="outline" onClick={() => setShowForm(false)}>
                Annuler
              </Button>
            </div>
          </form>
        </motion.div>
      )}

      {/* Status filter tabs */}
      <div className="flex gap-2 flex-wrap">
        {statusTabs.map(tab => (
          <button
            key={String(tab.value)}
            onClick={() => setFilterStatus(tab.value)}
            className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${
              filterStatus === tab.value
                ? 'bg-primary text-primary-foreground'
                : 'bg-muted text-muted-foreground hover:bg-muted/80'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Invites list */}
      <div className="bg-card border border-border rounded-2xl shadow-sm overflow-hidden">
        {isLoading ? (
          <div className="flex items-center justify-center p-12">
            <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          </div>
        ) : inviteList.length === 0 ? (
          <div className="flex flex-col items-center justify-center p-12 text-center">
            <Mail className="w-10 h-10 text-muted-foreground mb-3 opacity-40" />
            <p className="text-muted-foreground">Aucune invitation</p>
          </div>
        ) : (
          <div className="divide-y divide-border">
            {inviteList.map((invite: any) => {
              const cfg = STATUS_CONFIG[invite.status] ?? STATUS_CONFIG.pending;
              const Icon = cfg.icon;
              const isPending = invite.status === 'pending';
              const canResend = isPending && (invite.resendCount ?? 0) < 3;

              return (
                <div key={invite.id} className="flex items-center gap-4 p-4 hover:bg-muted/30 transition-colors">
                  <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
                    <Mail className="w-5 h-5 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-foreground truncate">{invite.email}</p>
                    <div className="flex items-center gap-3 mt-0.5">
                      {invite.cohort && (
                        <span className="text-xs text-muted-foreground">{invite.cohort.name}</span>
                      )}
                      {invite.department && (
                        <span className="text-xs text-muted-foreground">{invite.department.name}</span>
                      )}
                      {invite.expiresAt && isPending && (
                        <span className="text-xs text-muted-foreground">
                          Expire le {new Date(invite.expiresAt).toLocaleDateString('fr-FR')}
                        </span>
                      )}
                    </div>
                  </div>
                  <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold flex-shrink-0 ${cfg.color}`}>
                    <Icon className="w-3 h-3" />
                    {cfg.label}
                  </span>
                  {isPending && (
                    <div className="flex items-center gap-1 flex-shrink-0">
                      {canResend && (
                        <button
                          onClick={() => resendInvite.mutate(invite.id)}
                          disabled={resendInvite.isPending}
                          className="p-2 hover:bg-primary/10 rounded-lg transition-colors"
                          title="Renvoyer"
                        >
                          <RefreshCw className="w-4 h-4 text-primary" />
                        </button>
                      )}
                      <button
                        onClick={() => cancelInvite.mutate(invite.id)}
                        disabled={cancelInvite.isPending}
                        className="p-2 hover:bg-red-100 rounded-lg transition-colors"
                        title="Annuler"
                      >
                        <X className="w-4 h-4 text-red-600" />
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
