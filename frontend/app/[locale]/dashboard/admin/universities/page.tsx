'use client';

import { useEffect, useState, useCallback, Fragment } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/components/ui';
import {
  listUniversities,
  createUniversity,
  assignUniversityLicense,
  createUniversityStaff,
  listSubscriptionPlans,
  type AdminUniversityListItem,
} from '@/services/adminPlatform';
import { ChevronLeft, ChevronRight, TrendingUp, Building2, Plus } from 'lucide-react';
import { motion } from 'framer-motion';

function apiMessage(e: unknown): string {
  const msg =
    e && typeof e === 'object' && 'response' in e
      ? (e as { response?: { data?: { message?: string | string[] } } }).response?.data?.message
      : null;
  if (typeof msg === 'string') return msg;
  if (Array.isArray(msg)) return msg.join(', ');
  return 'Une erreur est survenue';
}

const ITEMS_PER_PAGE = 10;

export default function AdminUniversitiesPage() {
  const { showToast } = useToast();
  const [list, setList] = useState<AdminUniversityListItem[]>([]);
  const [listTotal, setListTotal] = useState(0);
  const [plans, setPlans] = useState<Array<{ id: string; name: string }>>([]);
  const [name, setName] = useState('');
  const [contactEmail, setContactEmail] = useState('');
  const [billingEmail, setBillingEmail] = useState('');
  const [contactName, setContactName] = useState('');
  const [country, setCountry] = useState('');
  const [website, setWebsite] = useState('');
  const [sel, setSel] = useState<string | null>(null);
  const [planId, setPlanId] = useState('');
  const [seats, setSeats] = useState('50');
  const [validUntil, setValidUntil] = useState('');
  const [staffEmail, setStaffEmail] = useState('');
  const [staffPass, setStaffPass] = useState('');
  const [loadError, setLoadError] = useState('');
  const [currentPage, setCurrentPage] = useState(1);

  const load = useCallback(async () => {
    setLoadError('');
    try {
      const [u, p] = await Promise.all([listUniversities(), listSubscriptionPlans()]);
      setList(u.items);
      setListTotal(u.total);
      setPlans(p);
    } catch (e) {
      setLoadError(apiMessage(e));
      showToast('Impossible de charger les universites.', 'error');
    }
  }, [showToast]);

  useEffect(() => {
    load();
  }, [load]);

  const seatsNum = Math.max(0, parseInt(seats, 10) || 0);
  const totalPages = Math.ceil(list.length / ITEMS_PER_PAGE);
  const paginatedList = list.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE);

  const stats = [
    { label: 'Total Universites', value: listTotal || list.length, change: '', icon: Building2, color: 'bg-primary/10 text-primary' },
  ];

  return (
    <div className="space-y-6 p-1">
      <div className="flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Universites B2B</h1>
          <p className="text-sm text-slate-500 mt-1">Gérer les universités partenaires et leurs accès</p>
        </div>
        <div className="flex flex-col gap-3 w-full sm:max-w-xl">
          <div className="flex flex-wrap gap-2">
            <Input placeholder="Nom universite *" value={name} onChange={(e) => setName(e.target.value)} className="min-w-[140px] flex-1 bg-white" />
            <Input
              type="email"
              placeholder="Email contact (proprietaire) *"
              value={contactEmail}
              onChange={(e) => setContactEmail(e.target.value)}
              className="min-w-[180px] flex-1 bg-white"
            />
          </div>
          <div className="flex flex-wrap gap-2">
            <Input placeholder="Facturation (email)" value={billingEmail} onChange={(e) => setBillingEmail(e.target.value)} className="min-w-[140px] flex-1 bg-white" />
            <Input placeholder="Nom du contact" value={contactName} onChange={(e) => setContactName(e.target.value)} className="min-w-[120px] flex-1 bg-white" />
            <Input placeholder="Pays" value={country} onChange={(e) => setCountry(e.target.value)} className="w-24 bg-white" />
            <Input placeholder="Site web" value={website} onChange={(e) => setWebsite(e.target.value)} className="min-w-[120px] flex-1 bg-white" />
          </div>
          <Button
            className="w-fit"
            onClick={async () => {
              if (!name.trim() || !contactEmail.trim()) {
                showToast('Nom et email contact sont requis.', 'error');
                return;
              }
              try {
                await createUniversity({
                  name: name.trim(),
                  contactEmail: contactEmail.trim(),
                  billingEmail: billingEmail.trim() || undefined,
                  contactName: contactName.trim() || undefined,
                  country: country.trim() || undefined,
                  website: website.trim() || undefined,
                });
                setName('');
                setContactEmail('');
                setBillingEmail('');
                setContactName('');
                setCountry('');
                setWebsite('');
                showToast('Universite creee. Email d activation envoye au contact.', 'success');
                await load();
              } catch (e) {
                showToast(apiMessage(e), 'error');
              }
            }}
          >
            <Plus className="w-4 h-4 mr-2" /> Creer
          </Button>
        </div>
      </div>

      {list.length > 0 && (
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
      )}

      {loadError && <p className="text-sm text-destructive">{loadError}</p>}

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="text-left p-4 text-sm font-medium text-slate-600">Universite</th>
                <th className="text-right p-4 text-sm font-medium text-slate-600">Actions</th>
              </tr>
            </thead>
            <tbody>
              {list.length === 0 ? (
                <tr>
                  <td colSpan={2} className="p-8 text-center text-slate-500">
                    Aucune universite trouvée
                  </td>
                </tr>
              ) : paginatedList.map((u) => (
                <Fragment key={u.id}>
                  <tr className="border-b border-slate-100 last:border-0 hover:bg-slate-50 transition-colors">
                    <td className="p-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-500 rounded-xl flex items-center justify-center text-white font-bold text-sm">
                          {u.name.substring(0, 2).toUpperCase()}
                        </div>
                        <span className="font-medium text-slate-900">{u.name}</span>
                      </div>
                    </td>
                    <td className="p-4 text-right">
                      <Button variant="outline" size="sm" onClick={() => setSel(sel === u.id ? null : u.id)}>
                        {sel === u.id ? 'Fermer' : 'Gerer'}
                      </Button>
                    </td>
                  </tr>
                  {sel === u.id && (
                    <tr className="bg-slate-50/50 border-b border-slate-200">
                      <td colSpan={2} className="p-6">
                        <div className="grid gap-6 md:grid-cols-2">
                          <div className="space-y-4 bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
                            <h4 className="font-semibold text-slate-900">Licence / sieges</h4>
                            <select
                              className="w-full border rounded-lg p-2.5 bg-background text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary"
                              value={planId}
                              onChange={(e) => setPlanId(e.target.value)}
                            >
                              <option value="">Choisir un plan</option>
                              {plans.map((p) => (
                                <option key={p.id} value={p.id}>{p.name}</option>
                              ))}
                            </select>
                            <Input type="number" min={1} placeholder="Sieges" value={seats} onChange={(e) => setSeats(e.target.value)} />
                            <Input
                              type="date"
                              className="w-full border rounded-lg p-2.5 bg-background text-sm"
                              value={validUntil}
                              onChange={(e) => setValidUntil(e.target.value)}
                              title="Fin de validite (optionnel)"
                            />
                            <Button
                              className="w-full bg-primary hover:bg-primary/90 text-primary-foreground"
                              disabled={!planId || seatsNum < 1}
                              onClick={async () => {
                                try {
                                  await assignUniversityLicense(u.id, {
                                    planId,
                                    seatsTotal: seatsNum,
                                    ...(validUntil ? { validUntil: new Date(validUntil).toISOString() } : {}),
                                  });
                                  showToast('Licence attribuee.', 'success');
                                  await load();
                                } catch (e) {
                                  showToast(apiMessage(e), 'error');
                                }
                              }}
                            >
                              Attribuer licence
                            </Button>
                          </div>
                          <div className="space-y-4 bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
                            <h4 className="font-semibold text-slate-900">Compte staff (dashboard)</h4>
                            <Input placeholder="Email staff" value={staffEmail} onChange={(e) => setStaffEmail(e.target.value)} />
                            <Input type="password" placeholder="Mot de passe" value={staffPass} onChange={(e) => setStaffPass(e.target.value)} />
                            <Button
                              className="w-full"
                              variant="secondary"
                              onClick={async () => {
                                if (!staffEmail || !staffPass) return;
                                try {
                                  await createUniversityStaff(u.id, { email: staffEmail, password: staffPass });
                                  setStaffEmail('');
                                  setStaffPass('');
                                  showToast('Compte staff cree. L utilisateur peut se connecter.', 'success');
                                } catch (e) {
                                  showToast(apiMessage(e), 'error');
                                }
                              }}
                            >
                              Creer staff
                            </Button>
                          </div>
                        </div>
                      </td>
                    </tr>
                  )}
                </Fragment>
              ))}
            </tbody>
          </table>
        </div>

        {totalPages > 1 && (
          <div className="flex items-center justify-between px-6 py-4 border-t border-slate-200 bg-white">
            <p className="text-sm text-slate-600">
              Affichage {list.length === 0 ? 0 : ((currentPage - 1) * ITEMS_PER_PAGE) + 1}-{Math.min(currentPage * ITEMS_PER_PAGE, list.length)} de {list.length} résultats
            </p>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1}>
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <span className="text-sm font-medium text-slate-700 px-2">Page {currentPage} / {totalPages}</span>
              <Button variant="outline" size="sm" onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages}>
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
