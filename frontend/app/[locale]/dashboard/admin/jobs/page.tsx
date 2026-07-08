'use client';

import { useState } from 'react';
import {
  Briefcase, Search, Filter, Download, Eye,
  MapPin, Clock, Users, DollarSign, Calendar,
  CheckCircle, XCircle, ChevronLeft, ChevronRight,
  TrendingUp
} from 'lucide-react';
import { motion } from 'framer-motion';
import { Badge } from '@/components/ui';
import { Button } from '@/components/ui';
import { useTranslation } from '@/contexts/LanguageContext';
import { useAdminJobs, useUpdateAdminJobStatus } from '@/hooks/api/useAdminJobs';
import type { AdminJob } from '@/services/adminJobs';
import { PageLoader } from '@/components/ui/loading';

const PAGE_SIZE = 10;

export default function JobsPage() {
  const { t } = useTranslation();
  const [searchQuery, setSearchQuery] = useState('');
  const [showViewModal, setShowViewModal] = useState(false);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [selectedJob, setSelectedJob] = useState<AdminJob | null>(null);
  const [filterStatus, setFilterStatus] = useState<string>('pending');
  const [showFilters, setShowFilters] = useState(false);
  const [rejectionReason, setRejectionReason] = useState('');
  const [adminNotes, setAdminNotes] = useState('');
  const [page, setPage] = useState(1);

  const { data, isLoading } = useAdminJobs({
    status: filterStatus === 'all' ? 'all' : filterStatus,
    page,
    limit: PAGE_SIZE,
  });
  const jobs = data?.data ?? [];
  const total = data?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  const updateStatusMutation = useUpdateAdminJobStatus();

  const pageCount = jobs.length;
  const publishedCount = jobs.filter(j => j.status === 'published').length;
  const pendingCount = jobs.filter(j => j.status === 'pending').length;
  const totalApplications = jobs.reduce((acc, j) => acc + (j.applicants || 0), 0);
  const publishedPagePct = pageCount > 0 ? (publishedCount / pageCount) * 100 : 0;
  const pendingPagePct = pageCount > 0 ? (pendingCount / pageCount) * 100 : 0;
  const avgApplicationsPerJobOnPage = pageCount > 0 ? totalApplications / pageCount : 0;

  const stats = [
    { label: t('jobs.totalOffers'), value: total, change: '', icon: Briefcase, color: 'bg-primary/10 text-primary' },
    {
      label: `${t('jobs.published')} (page)`,
      value: publishedCount,
      change: pageCount > 0 ? `${publishedPagePct.toFixed(1)}%` : '—',
      icon: CheckCircle,
      color: 'bg-green-50 text-green-700',
    },
    {
      label: `${t('jobs.pending') || 'En attente'} (page)`,
      value: pendingCount,
      change: pageCount > 0 ? `${pendingPagePct.toFixed(1)}%` : '—',
      icon: Clock,
      color: 'bg-amber-50 text-amber-700',
    },
    {
      label: `${t('jobs.applications')} (page)`,
      value: totalApplications,
      change: pageCount > 0 ? `${avgApplicationsPerJobOnPage.toFixed(1)} / offre` : '—',
      icon: Users,
      color: 'bg-purple-50 text-purple-700',
    },
  ];

  const filteredJobs = jobs.filter(job => {
    const matchesSearch = job.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         job.company.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         (job.location && job.location.toLowerCase().includes(searchQuery.toLowerCase()));
    return matchesSearch;
  });

  const rangeStart = total === 0 ? 0 : (page - 1) * PAGE_SIZE + 1;
  const rangeEnd = Math.min(page * PAGE_SIZE, total);

  const handleAccept = async (job: AdminJob) => {
    try {
      await updateStatusMutation.mutateAsync({
        id: job.id,
        data: { status: 'published', adminNotes: adminNotes || undefined },
      });
      setShowViewModal(false);
      setSelectedJob(null);
    } catch (err) {
      console.error(err);
    }
  };

  const handleReject = async () => {
    if (!selectedJob) return;
    try {
      await updateStatusMutation.mutateAsync({
        id: selectedJob.id,
        data: {
          status: 'rejected',
          rejectionReason: rejectionReason || undefined,
          adminNotes: adminNotes || undefined,
        },
      });
      setShowRejectModal(false);
      setShowViewModal(false);
      setSelectedJob(null);
      setRejectionReason('');
      setAdminNotes('');
    } catch (err) {
      console.error(err);
    }
  };

  const openRejectModal = (job: AdminJob) => {
    setSelectedJob(job);
    setShowViewModal(false);
    setShowRejectModal(true);
    setRejectionReason('');
    setAdminNotes('');
  };

  const exportData = () => {
    const csv = [
      ['Titre', 'Entreprise', 'Lieu', 'Type', 'Salaire', 'Candidats', 'Statut'],
      ...jobs.map(j => [j.title, j.company, j.location, j.type, j.salary, j.applicants, j.status])
    ].map(row => row.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'jobs.csv';
    a.click();
  };

  const getStatusBadge = (status: AdminJob['status']) => {
    const styles: Record<string, string> = {
      published: 'bg-green-100 text-green-700',
      pending: 'bg-amber-100 text-amber-700',
      rejected: 'bg-red-100 text-red-700',
      archived: 'bg-slate-100 text-slate-700',
      draft: 'bg-blue-100 text-blue-700',
      expired: 'bg-gray-100 text-gray-700',
      closed: 'bg-slate-100 text-slate-700'
    };
    const labels: Record<string, string> = {
      published: 'Publiée',
      pending: 'En attente',
      rejected: 'Refusée',
      archived: 'Archivée',
      draft: 'Brouillon',
      expired: 'Expirée',
      closed: 'Fermée'
    };
    return <Badge variant="secondary" className={styles[status] ?? ''}>{labels[status] ?? status}</Badge>;
  };

  const getTypeBadge = (type: string) => {
    const styles: Record<string, string> = {
      'full-time': 'bg-blue-100 text-blue-700',
      'part-time': 'bg-cyan-100 text-cyan-700',
      'internship': 'bg-purple-100 text-purple-700',
      'freelance': 'bg-orange-100 text-orange-700',
      'apprenticeship': 'bg-pink-100 text-pink-700'
    };
    return <Badge variant="secondary" className={styles[type] ?? ''}>{type || '—'}</Badge>;
  };

  return (
    <div className="space-y-6 p-1">
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

      <div className="flex flex-col sm:flex-row gap-4 justify-between">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder={`${t('common.search')}...`}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <div className="flex gap-2 flex-wrap">
          <div className="relative">
            <Button variant="outline" onClick={() => setShowFilters(!showFilters)}>
              <Filter className="w-4 h-4 mr-2" /> Filtres
            </Button>
            {showFilters && (
              <div className="absolute right-0 mt-2 w-48 bg-white border border-slate-200 rounded-lg shadow-lg py-2 z-10">
                {['pending', 'published', 'rejected', 'all'].map(status => (
                  <button
                    key={status}
                    onClick={() => { setFilterStatus(status); setShowFilters(false); setPage(1); }}
                    className={`w-full text-left px-4 py-2 text-sm hover:bg-slate-50 ${filterStatus === status ? 'bg-primary/10 text-primary' : ''}`}
                  >
                    {status === 'all' ? t('common.all') : status === 'published' ? t('jobs.published') : status === 'pending' ? (t('jobs.pending') || 'En attente') : status === 'rejected' ? 'Refusées' : status}
                  </button>
                ))}
              </div>
            )}
          </div>
          <Button variant="outline" onClick={exportData}>
            <Download className="w-4 h-4 mr-2" /> {t('common.export')}
          </Button>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-slate-900">Offres ({total})</h2>
        </div>

        <div className="overflow-x-auto">
          {isLoading ? (
            <PageLoader label="Chargement des offres…" className="py-16" />
          ) : (
            <table className="w-full">
              <thead className="bg-slate-50">
                <tr>
                  <th className="text-left p-4 text-sm font-medium text-slate-600">Offre</th>
                  <th className="text-left p-4 text-sm font-medium text-slate-600">Type</th>
                  <th className="text-left p-4 text-sm font-medium text-slate-600">Lieu</th>
                  <th className="text-left p-4 text-sm font-medium text-slate-600">Salaire</th>
                  <th className="text-left p-4 text-sm font-medium text-slate-600">Candidats</th>
                  <th className="text-left p-4 text-sm font-medium text-slate-600">Statut</th>
                  <th className="text-left p-4 text-sm font-medium text-slate-600">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredJobs.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="text-center py-10 text-slate-400">
                      Aucune offre trouvée
                    </td>
                  </tr>
                ) : filteredJobs.map((job) => (
                  <tr key={job.id} className="border-t border-slate-100 hover:bg-slate-50">
                    <td className="p-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-gradient-to-br from-primary to-accent rounded-xl flex items-center justify-center text-white font-bold text-sm">
                          {job.company.substring(0, 2).toUpperCase()}
                        </div>
                        <div>
                          <p className="font-medium text-slate-900">{job.title}</p>
                          <p className="text-sm text-slate-500 flex items-center gap-1">
                            {job.company}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="p-4">
                      {getTypeBadge(job.type)}
                    </td>
                    <td className="p-4">
                      <div className="flex items-center gap-1 text-sm text-slate-600">
                        <MapPin className="w-3.5 h-3.5" /> {job.location || '—'}
                      </div>
                    </td>
                    <td className="p-4">
                      <div className="flex items-center gap-1 text-sm text-slate-600">
                        <DollarSign className="w-3.5 h-3.5" /> {job.salary || '—'}
                      </div>
                    </td>
                    <td className="p-4 font-medium text-slate-900">
                      <div className="flex items-center gap-1">
                        <Users className="w-4 h-4 text-slate-400" /> {job.applicants}
                      </div>
                    </td>
                    <td className="p-4">
                      {getStatusBadge(job.status)}
                    </td>
                    <td className="p-4">
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => { setSelectedJob(job); setShowViewModal(true); }}
                          className="p-2 hover:bg-slate-100 rounded-lg"
                          title="Voir"
                        >
                          <Eye className="w-4 h-4 text-slate-600" />
                        </button>
                        {job.status === 'pending' && (
                          <>
                            <button
                              onClick={() => handleAccept(job)}
                              disabled={updateStatusMutation.isPending}
                              className="p-2 hover:bg-green-100 rounded-lg"
                              title="Accepter"
                            >
                              <CheckCircle className="w-4 h-4 text-green-600" />
                            </button>
                            <button
                              onClick={() => openRejectModal(job)}
                              className="p-2 hover:bg-red-100 rounded-lg"
                              title="Refuser"
                            >
                              <XCircle className="w-4 h-4 text-red-600" />
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        <div className="px-6 py-4 border-t border-slate-200 flex items-center justify-between">
          <p className="text-sm text-slate-600">
            Affichage {total === 0 ? 0 : rangeStart}-{rangeEnd} de {total} offres
          </p>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page <= 1}
            >
              <ChevronLeft className="w-4 h-4" />
            </Button>
            <span className="text-sm font-medium text-slate-700 px-2">
              Page {page} / {Math.max(1, totalPages)}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage(p => Math.min(totalPages, p + 1))}
              disabled={page >= totalPages || totalPages === 0}
            >
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </div>

      {showViewModal && selectedJob && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/50" onClick={() => setShowViewModal(false)} />
          <div className="relative bg-white rounded-xl shadow-2xl w-full max-w-2xl mx-4 p-6 max-h-[90vh] overflow-y-auto">
            <div className="flex items-start justify-between mb-6">
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 bg-gradient-to-br from-primary to-accent rounded-xl flex items-center justify-center text-primary-foreground font-bold text-xl">
                  {selectedJob.company.substring(0, 2).toUpperCase()}
                </div>
                <div>
                  <h2 className="text-xl font-semibold">{selectedJob.title}</h2>
                  <p className="text-slate-600">{selectedJob.company}</p>
                  <div className="flex gap-2 mt-2">
                    {getTypeBadge(selectedJob.type)}
                    {getStatusBadge(selectedJob.status)}
                  </div>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
              <div className="p-3 bg-slate-50 rounded-lg">
                <p className="text-sm text-slate-500">Lieu</p>
                <p className="font-medium flex items-center gap-1"><MapPin className="w-4 h-4" /> {selectedJob.location || '—'}</p>
              </div>
              <div className="p-3 bg-slate-50 rounded-lg">
                <p className="text-sm text-slate-500">Salaire</p>
                <p className="font-medium">{selectedJob.salary || '—'}</p>
              </div>
              <div className="p-3 bg-slate-50 rounded-lg">
                <p className="text-sm text-slate-500">Candidats</p>
                <p className="font-medium">{selectedJob.applicants}</p>
              </div>
              <div className="p-3 bg-slate-50 rounded-lg">
                <p className="text-sm text-slate-500">Date limite</p>
                <p className="font-medium">{selectedJob.deadline || '—'}</p>
              </div>
            </div>

            <div className="mb-6">
              <h3 className="font-medium text-slate-900 mb-2">Description</h3>
              <p className="text-slate-600">{selectedJob.description || '—'}</p>
            </div>

            {selectedJob.requirements && selectedJob.requirements.length > 0 && (
              <div className="mb-6">
                <h3 className="font-medium text-slate-900 mb-2">Compétences / Prérequis</h3>
                <ul className="list-disc list-inside text-slate-600 space-y-1">
                  {selectedJob.requirements.map((req, index) => (
                    <li key={index}>{req}</li>
                  ))}
                </ul>
              </div>
            )}

            {selectedJob.status === 'pending' && (
              <div className="flex gap-3 pt-4 border-t">
                <Button
                  onClick={() => handleAccept(selectedJob)}
                  disabled={updateStatusMutation.isPending}
                  className="bg-green-600 hover:bg-green-700"
                >
                  <CheckCircle className="w-4 h-4 mr-2" /> Accepter
                </Button>
                <Button
                  variant="outline"
                  onClick={() => openRejectModal(selectedJob)}
                  className="border-red-300 text-red-700 hover:bg-red-50"
                >
                  <XCircle className="w-4 h-4 mr-2" /> Refuser
                </Button>
              </div>
            )}

            <div className="flex justify-end gap-3 mt-4">
              <Button variant="outline" onClick={() => setShowViewModal(false)}>Fermer</Button>
            </div>
          </div>
        </div>
      )}

      {showRejectModal && selectedJob && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/50" onClick={() => { setShowRejectModal(false); setSelectedJob(null); }} />
          <div className="relative bg-white rounded-xl shadow-2xl w-full max-w-md mx-4 p-6">
            <h2 className="text-xl font-semibold mb-2">Refuser l&apos;offre</h2>
            <p className="text-slate-600 mb-4">
              Indiquez le motif de refus pour l&apos;offre <strong>{selectedJob.title}</strong>. L&apos;employeur en sera notifié.
            </p>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Motif de refus *</label>
                <textarea
                  value={rejectionReason}
                  onChange={(e) => setRejectionReason(e.target.value)}
                  rows={3}
                  className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Ex: Offre incomplète, description insuffisante..."
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Notes admin (optionnel)</label>
                <input
                  type="text"
                  value={adminNotes}
                  onChange={(e) => setAdminNotes(e.target.value)}
                  className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Notes internes"
                />
              </div>
            </div>
            <div className="flex justify-end gap-3 mt-6">
              <Button variant="outline" onClick={() => { setShowRejectModal(false); setRejectionReason(''); setAdminNotes(''); }}>Annuler</Button>
              <Button
                onClick={handleReject}
                disabled={updateStatusMutation.isPending}
                className="bg-red-600 hover:bg-red-700"
              >
                Refuser l&apos;offre
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
