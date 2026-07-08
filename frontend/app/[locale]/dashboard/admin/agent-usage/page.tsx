'use client';

import { useEffect, useState, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui';
import { Input } from '@/components/ui/input';
import { getAgentLimits, patchAgentLimits, getAgentUsage } from '@/services/adminPlatform';
import { motion } from 'framer-motion';
import { Activity, Cpu, Users, Settings, TrendingUp } from 'lucide-react';

export default function AdminAgentUsagePage() {
  const { showToast } = useToast();
  const [limits, setLimits] = useState({ default: 100, perAgent: {} as Record<string, number> });
  const [def, setDef] = useState('100');
  const [usage, setUsage] = useState<unknown[]>([]);
  const [month, setMonth] = useState(() => new Date().toISOString().slice(0, 7));

  useEffect(() => {
    getAgentLimits().then((l) => {
      setLimits(l);
      setDef(String(l.default));
    });
    getAgentUsage({ yearMonth: month }).then(setUsage as (u: unknown[]) => void);
  }, [month]);

  const totalCalls = useMemo(() => {
    return (usage as Array<{ count?: number }>).reduce((acc, u) => acc + (u.count || 0), 0);
  }, [usage]);

  const activeAgents = useMemo(() => {
    const keys = new Set((usage as Array<{ agentKey?: string }>).map((u) => u.agentKey).filter(Boolean));
    return keys.size;
  }, [usage]);

  const activeUsers = useMemo(() => {
    const emails = new Set((usage as Array<{ email?: string }>).map((u) => u.email).filter(Boolean));
    return emails.size;
  }, [usage]);

  const callsPerAgent = activeAgents > 0 ? totalCalls / activeAgents : 0;

  const stats = [
    { label: 'Total Appels', value: totalCalls, change: `${callsPerAgent.toFixed(1)}/agent`, icon: Activity, color: 'bg-primary/10 text-primary' },
    { label: 'Agents Actifs', value: activeAgents, change: '', icon: Cpu, color: 'bg-green-50 text-green-700' },
    { label: 'Utilisateurs Actifs', value: activeUsers, change: '', icon: Users, color: 'bg-purple-50 text-purple-700' },
    { label: 'Limite par defaut', value: def, change: '', icon: Settings, color: 'bg-amber-50 text-amber-700' },
  ];

  return (
    <div className="space-y-6 p-1">
      <div className="flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Quotas agents</h1>
          <p className="text-sm text-slate-500 mt-1">Superviser l'utilisation des agents par mois</p>
        </div>
        <div className="flex gap-2 w-full sm:w-auto items-center">
           <label className="text-sm font-medium text-slate-700">Mois :</label>
           <Input type="month" value={month} onChange={(e) => setMonth(e.target.value)} className="w-40 bg-white" />
           <Button variant="outline" onClick={() => getAgentUsage({ yearMonth: month }).then(setUsage as (u: unknown[]) => void)}>
             Actualiser
           </Button>
        </div>
      </div>

      <motion.div
        className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        {stats.map((stat, index) => {
          const StatIcon = stat.icon;
          return (
          <motion.div
            key={index}
            className="bg-card rounded-2xl p-6 border border-border shadow-sm transition-all hover:-translate-y-1 hover:shadow-lg"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
            whileHover={{ scale: 1.02 }}
          >
            <div className="flex items-start justify-between mb-4">
              <div className={`w-14 h-14 rounded-xl flex items-center justify-center ${stat.color}`}>
                <StatIcon className="w-6 h-6" />
              </div>
              <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-600">
                <TrendingUp className="w-3 h-3" />
                {stat.change}
              </span>
            </div>
            <div className="flex items-end justify-between">
              <div>
                <motion.h3
                  className="text-3xl font-extrabold tracking-tight text-foreground"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.3 + index * 0.1 }}
                >
                  {stat.value}
                </motion.h3>
                <p className="text-slate-500 text-sm mt-1">{stat.label}</p>
              </div>
            </div>
          </motion.div>
          );
        })}
      </motion.div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden p-6 mb-6">
        <h2 className="font-semibold text-slate-900 mb-2">Parametres de Limite</h2>
        <p className="text-sm text-slate-500 mb-4">Limite par défaut par agent et par utilisateur (apprenants).</p>
        <div className="flex gap-2 items-center max-w-sm">
          <Input value={def} onChange={(e) => setDef(e.target.value)} className="flex-1" />
          <Button
            onClick={async () => {
              try {
                await patchAgentLimits({ default: +def || 100, perAgent: limits.perAgent });
                const l = await getAgentLimits();
                setLimits(l);
              } catch (err) {
                console.error('Failed to update agent limits:', err);
                showToast("Impossible d'enregistrer les limites.", 'error');
              }
            }}
          >
            Enregistrer
          </Button>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="p-4 text-left font-medium text-slate-600">Email</th>
                <th className="p-4 text-left font-medium text-slate-600">Agent</th>
                <th className="p-4 text-right font-medium text-slate-600">Appels</th>
              </tr>
            </thead>
            <tbody>
              {usage.length === 0 ? (
                <tr>
                  <td colSpan={3} className="p-8 text-center text-slate-500">
                    Aucune donnee pour ce mois.
                  </td>
                </tr>
              ) : (
                (usage as Array<{ email?: string; agentKey?: string; count?: number }>).map((u, i) => (
                  <tr key={i} className="border-b border-slate-100 last:border-0 hover:bg-slate-50 transition-colors">
                    <td className="p-4 font-medium text-slate-900">{u.email}</td>
                    <td className="p-4 font-mono text-xs text-slate-500">
                      <span className="bg-slate-100 px-2 py-1 rounded-md">{u.agentKey}</span>
                    </td>
                    <td className="p-4 text-right font-semibold text-slate-700">{u.count}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
