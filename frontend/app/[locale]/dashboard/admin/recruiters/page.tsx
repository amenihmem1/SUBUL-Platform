'use client';

import { useEffect, useState, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { getAdminEmployers, createAdminEmployer } from '@/services/adminPlatform';
import { ChevronLeft, ChevronRight, Users, Building2, Briefcase, Plus, TrendingUp } from 'lucide-react';
import { motion } from 'framer-motion';

const ITEMS_PER_PAGE = 10;

export default function AdminRecruitersPage() {
  const [rows, setRows] = useState<
    Array<{ id: number; email: string; fullName?: string; company?: { name: string }; jobCount: number }>
  >([]);
  const [total, setTotal] = useState(0);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [loading, setLoading] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);

  const totalPages = Math.ceil(total / ITEMS_PER_PAGE);

  const load = (page: number) => getAdminEmployers(page, ITEMS_PER_PAGE).then((r) => {
    setRows(r.data || []);
    setTotal(r.total || 0);
  });

  useEffect(() => {
    load(currentPage).catch(() => {});
  }, [currentPage]);

  const create = async () => {
    if (!email || !password) return;
    setLoading(true);
    try {
      await createAdminEmployer({ email, password, fullName: fullName || undefined, companyName: companyName || undefined });
      setEmail('');
      setPassword('');
      setFullName('');
      setCompanyName('');
      await load(currentPage);
    } finally {
      setLoading(false);
    }
  };

  const stats = useMemo(() => {
    const rowCount = rows.length;
    const companiesOnPage = new Set(rows.map(r => r.company?.name).filter(Boolean)).size;
    const totalJobsOnPage = rows.reduce((acc, r) => acc + r.jobCount, 0);
    const distinctCompanyRatio =
      rowCount > 0 ? (companiesOnPage / rowCount) * 100 : 0;
    const avgJobsPerRecruiterOnPage = rowCount > 0 ? totalJobsOnPage / rowCount : 0;

    return [
      { label: 'Total recruteurs', value: total, icon: Users, color: 'bg-primary/10 text-primary', change: '' },
      {
        label: 'Entreprises distinctes (page)',
        value: companiesOnPage,
        icon: Building2,
        color: 'bg-blue-50 text-blue-700',
        change: rowCount > 0 ? `${distinctCompanyRatio.toFixed(1)}%` : '—',
      },
      {
        label: 'Offres (somme page)',
        value: totalJobsOnPage,
        icon: Briefcase,
        color: 'bg-emerald-50 text-emerald-700',
        change: rowCount > 0 ? `${avgJobsPerRecruiterOnPage.toFixed(1)} / recruteur` : '—',
      },
    ];
  }, [rows, total]);

  return (
    <div className="space-y-6 p-1">
      <div className="flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Recruteurs (employeurs)</h1>
          <p className="text-sm text-slate-500 mt-1">Gérer les comptes recruteurs et leurs entreprises affiliées</p>
        </div>
      </div>

      <motion.div
        className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6"
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

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-1">
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden sticky top-6">
            <div className="p-6 border-b border-slate-100 bg-slate-50/50">
              <h2 className="text-lg font-semibold text-slate-900">Nouveau Recruteur</h2>
              <p className="text-sm text-slate-500 mt-1">Création réservée à l'admin - pas d'inscription publique.</p>
            </div>
            <div className="p-6 space-y-4">
              <div className="space-y-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-700">Email professionnel</label>
                  <Input placeholder="email@entreprise.com" type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-700">Mot de passe</label>
                  <Input placeholder="••••••••" type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-700">Nom complet</label>
                  <Input placeholder="Jean Dupont" value={fullName} onChange={(e) => setFullName(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-700">Nom de l'entreprise</label>
                  <Input placeholder="Entreprise XYZ" value={companyName} onChange={(e) => setCompanyName(e.target.value)} />
                </div>
              </div>
              <Button onClick={create} disabled={loading || !email || !password} className="w-full bg-primary hover:bg-primary/90 mt-2">
                <Plus className="w-4 h-4 mr-2" />
                Créer recruteur
              </Button>
            </div>
          </div>
        </div>

        <div className="lg:col-span-2">
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden h-full flex flex-col">
            <div className="p-4 border-b border-slate-100 bg-slate-50 flex items-center justify-between">
              <h3 className="font-semibold text-slate-900">Liste des Recruteurs</h3>
              <Badge variant="secondary" className="bg-blue-100 text-blue-700">{total} total</Badge>
            </div>
            
            <div className="overflow-x-auto flex-1">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 border-b border-slate-200">
                  <tr>
                    <th className="p-4 text-left font-medium text-slate-600">Email</th>
                    <th className="p-4 text-left font-medium text-slate-600">Nom complet</th>
                    <th className="p-4 text-left font-medium text-slate-600">Entreprise</th>
                    <th className="p-4 text-center font-medium text-slate-600">Offres</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="p-8 text-center text-slate-500">
                        Aucun recruteur trouvé
                      </td>
                    </tr>
                  ) : (
                    rows.map((r) => (
                      <tr key={r.id} className="border-b border-slate-100 last:border-0 hover:bg-slate-50 transition-colors">
                        <td className="p-4 font-medium text-slate-900">{r.email}</td>
                        <td className="p-4 text-slate-600">{r.fullName || '-'}</td>
                        <td className="p-4">
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-slate-100 text-slate-700 text-xs font-medium">
                            <Building2 className="w-3.5 h-3.5" />
                            {r.company?.name || '-'}
                          </span>
                        </td>
                        <td className="p-4 text-center">
                          <Badge variant="secondary" className="bg-emerald-50 text-emerald-700 border-emerald-100">
                            {r.jobCount} offres
                          </Badge>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {totalPages > 1 && (
              <div className="flex items-center justify-between px-6 py-4 border-t border-slate-200 bg-white">
                <p className="text-sm text-slate-600">
                  Affichage de {total === 0 ? 0 : ((currentPage - 1) * ITEMS_PER_PAGE) + 1} à {Math.min(currentPage * ITEMS_PER_PAGE, total)} sur {total}
                </p>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                    disabled={currentPage === 1}
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <span className="text-sm font-medium text-slate-700">
                    Page {currentPage} / {totalPages}
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                    disabled={currentPage === totalPages}
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
