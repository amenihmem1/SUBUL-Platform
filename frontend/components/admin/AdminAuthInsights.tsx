'use client';

import type { LucideIcon } from 'lucide-react';
import { Users, UserCheck, UserX, Percent, CreditCard, Timer, Ban } from 'lucide-react';
import { useAuthStats } from '@/hooks/api/useAdmin';
import { Skeleton } from '@/components/ui/skeleton';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  AreaChart,
  Area,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  Legend,
} from 'recharts';

const PIE_COLORS = ['#7C4DFF', '#9C27B0', '#C2185B', '#06b6d4', '#10b981', '#f59e0b', '#94a3b8'];

function StatCard({
  title,
  value,
  sub,
  icon: Icon,
  accent,
}: {
  title: string;
  value: string | number;
  sub?: string;
  icon: LucideIcon;
  accent: string;
}) {
  return (
    <div className="rounded-2xl border border-border bg-card p-5 shadow-card transition hover:shadow-card-hover">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{title}</p>
          <p className="mt-2 text-2xl font-bold tracking-tight text-foreground">{value}</p>
          {sub && <p className="mt-1 text-xs text-muted-foreground">{sub}</p>}
        </div>
        <div
          className="flex h-11 w-11 items-center justify-center rounded-xl"
          style={{ background: `${accent}18`, color: accent }}
        >
          <Icon className="h-5 w-5" />
        </div>
      </div>
    </div>
  );
}

export function AdminAuthInsights() {
  const { data, isLoading, isError } = useAuthStats();

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <Skeleton key={i} className="h-28 rounded-2xl" />
          ))}
        </div>
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <Skeleton className="h-72 rounded-2xl" />
          <Skeleton className="h-72 rounded-2xl" />
        </div>
      </div>
    );
  }

  if (isError || !data) {
    return (
      <div className="rounded-2xl border border-destructive/30 bg-destructive/5 p-6 text-sm text-destructive">
        Impossible de charger les statistiques d&apos;authentification.
      </div>
    );
  }

  const roleData = (data.usersByRole || []).map((r) => ({
    name: r.role || 'unknown',
    value: r.count,
  }));

  const signups = data.signupsOverTime || [];
  const verTrend = data.verificationRateTrend || [];
  const resets = data.passwordResetRequestsOverTime || [];

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-lg font-semibold text-foreground">Utilisateurs &amp; authentification</h2>
        <p className="text-sm text-muted-foreground">
          Inscriptions, vérification e-mail et demandes de réinitialisation (30 derniers jours).
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Utilisateurs"
          value={data.totalUsers}
          sub="Total enregistrés"
          icon={Users}
          accent="#7C4DFF"
        />
        <StatCard
          title="Vérifiés"
          value={data.verifiedUsers}
          sub="E-mail confirmé"
          icon={UserCheck}
          accent="#10b981"
        />
        <StatCard
          title="Non vérifiés"
          value={data.unverifiedUsers}
          icon={UserX}
          accent="#f59e0b"
        />
        <StatCard
          title="Taux de vérification"
          value={`${data.verificationRatePercent}%`}
          icon={Percent}
          accent="#9C27B0"
        />
        <StatCard
          title="Abonnements actifs"
          value={data.activeSubscriptions}
          icon={CreditCard}
          accent="#06b6d4"
        />
        <StatCard
          title="Essais (trial)"
          value={data.trialUsers}
          icon={Timer}
          accent="#8b5cf6"
        />
        <StatCard
          title="Abonnements expirés"
          value={data.expiredSubscriptions}
          icon={Ban}
          accent="#94a3b8"
        />
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        <div className="rounded-2xl border border-border bg-card p-5 shadow-card">
          <h3 className="mb-4 text-sm font-semibold text-foreground">Inscriptions (30 jours)</h3>
          {signups.length === 0 ? (
            <p className="py-12 text-center text-sm text-muted-foreground">Aucune donnée</p>
          ) : (
            <div className="h-72 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={signups} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis dataKey="date" tick={{ fontSize: 11 }} className="text-muted-foreground" />
                  <YAxis allowDecimals={false} tick={{ fontSize: 11 }} width={32} />
                  <Tooltip
                    contentStyle={{ borderRadius: '12px', border: '1px solid var(--border)' }}
                    labelFormatter={(l) => String(l)}
                  />
                  <Line type="monotone" dataKey="count" name="Inscriptions" stroke="#7C4DFF" strokeWidth={2} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>

        <div className="rounded-2xl border border-border bg-card p-5 shadow-card">
          <h3 className="mb-4 text-sm font-semibold text-foreground">Taux de vérification (nouveaux inscrits / jour)</h3>
          {verTrend.length === 0 ? (
            <p className="py-12 text-center text-sm text-muted-foreground">Aucune donnée</p>
          ) : (
            <div className="h-72 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={verTrend} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="rateGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#C2185B" stopOpacity={0.35} />
                      <stop offset="100%" stopColor="#C2185B" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                  <YAxis domain={[0, 100]} tick={{ fontSize: 11 }} width={36} />
                  <Tooltip />
                  <Area
                    type="monotone"
                    dataKey="ratePercent"
                    name="% vérifiés"
                    stroke="#C2185B"
                    fill="url(#rateGrad)"
                    strokeWidth={2}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>

        <div className="rounded-2xl border border-border bg-card p-5 shadow-card">
          <h3 className="mb-4 text-sm font-semibold text-foreground">Demandes de mot de passe oublié</h3>
          {resets.length === 0 ? (
            <p className="py-12 text-center text-sm text-muted-foreground">Aucune demande enregistrée sur la période</p>
          ) : (
            <div className="h-72 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={resets} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                  <YAxis allowDecimals={false} width={32} />
                  <Tooltip />
                  <Bar dataKey="count" name="Demandes" fill="#9C27B0" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>

        <div className="rounded-2xl border border-border bg-card p-5 shadow-card">
          <h3 className="mb-4 text-sm font-semibold text-foreground">Répartition par rôle</h3>
          {roleData.length === 0 ? (
            <p className="py-12 text-center text-sm text-muted-foreground">Aucune donnée</p>
          ) : (
            <div className="h-72 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={roleData}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    innerRadius={52}
                    outerRadius={88}
                    paddingAngle={2}
                  >
                    {roleData.map((_, i) => (
                      <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
