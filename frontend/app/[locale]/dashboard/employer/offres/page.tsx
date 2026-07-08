'use client';

import { useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import {
  Briefcase, Search, Eye, Edit2, Trash2,
  MapPin, CheckCircle2, Clock
} from 'lucide-react';
import { Badge } from '@/components/ui';
import { Button } from '@/components/ui';
import { useToast } from '@/components/ui';
import { useConfirmDialog } from '@/components/ui';
import { useTranslation } from '@/contexts/LanguageContext';
import { useEmployerJobs } from '@/hooks/api/useEmployer';
import { useDeleteJob, type JobDto } from '@/hooks/api/useJobs';

export default function OffresPage() {
  const { t } = useTranslation();
  const { locale } = useParams();
  const { showToast } = useToast();
  const { confirm, ConfirmDialogComponent } = useConfirmDialog();
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState('Tous');
  const [currentPage, setCurrentPage] = useState(1);
  const [limit] = useState(10);

  const { data: jobsData, isLoading } = useEmployerJobs({ page: currentPage, limit });
  const deleteJob = useDeleteJob();

  const offres = jobsData?.data ?? [];
  const totalOffres = jobsData?.total ?? 0;
  const totalPages = Math.ceil(totalOffres / limit);

  const handleDeleteOffre = (id: string) => {
    const offre = offres.find(o => o.id === id);
    confirm({
      title: 'Supprimer cette offre ?',
      message: `Êtes-vous sûr de vouloir supprimer l'offre "${offre?.title}" ?`,
      confirmLabel: 'Oui, supprimer',
      cancelLabel: 'Non, annuler',
      onConfirm: async () => {
        try {
          await deleteJob.mutateAsync(id);
          showToast(`Offre "${offre?.title}" supprimée.`, 'info');
        } catch (err) {
          showToast('Erreur lors de la suppression', 'error');
        }
      },
    });
  };

  const filteredOffres = offres.filter((o) => {
    const matchesSearch = o.title?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = filterStatus === 'Tous' || o.status === filterStatus;
    return matchesSearch && matchesStatus;
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'published': return 'bg-green-100 text-green-700';
      case 'pending': return 'bg-yellow-100 text-yellow-700';
      case 'rejected': return 'bg-red-100 text-red-700';
      case 'archived': return 'bg-slate-100 text-slate-700';
      default: return 'bg-gray-100 text-gray-700';
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'CDI': return 'bg-blue-100 text-blue-700';
      case 'CDD': return 'bg-violet-100 text-violet-700';
      case 'Stage': return 'bg-amber-100 text-amber-700';
      case 'Freelance': return 'bg-emerald-100 text-emerald-700';
      default: return 'bg-gray-100 text-gray-700';
    }
  };

  return (
    <div className="w-full space-y-6">
      {ConfirmDialogComponent}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-black text-slate-900">{t('employerOffers.title')}</h1>
          <p className="text-slate-600 mt-1">{t('employerOffers.subtitle')}</p>
        </div>
        <Link
          href={`/${locale}/dashboard/employer/offres/new`}
          className="bg-violet-600 hover:bg-violet-700 text-white flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors"
        >
          {t('employerOffers.newOffer')}
        </Link>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-5">
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-lg bg-violet-50"><Briefcase className="w-6 h-6 text-violet-600" /></div>
            <div>
              <p className="text-2xl font-bold text-slate-900">{totalOffres}</p>
              <p className="text-sm text-slate-600">{t('employerOffers.totalOffers')}</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-5">
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-lg bg-green-50"><CheckCircle2 className="w-6 h-6 text-green-600" /></div>
            <div>
              <p className="text-2xl font-bold text-slate-900">{offres.filter((o) => o.status === 'published').length}</p>
              <p className="text-sm text-slate-600">{t('employerOffers.activeOffers')}</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-5">
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-lg bg-blue-50"><Clock className="w-6 h-6 text-blue-600" /></div>
            <div>
              <p className="text-2xl font-bold text-slate-900">{offres.filter((o) => o.status === 'pending').length}</p>
              <p className="text-sm text-slate-600">En attente de validation</p>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
        <div className="flex flex-col md:flex-row gap-4 mb-6">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder={t('employerOffers.searchPlaceholder') as string}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-violet-300 outline-none"
            />
          </div>
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="px-4 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-violet-300 outline-none"
          >
            <option value="Tous">{t('employerOffers.allStatuses')}</option>
            <option value="published">Publiées</option>
            <option value="pending">En attente</option>
            <option value="rejected">Refusées</option>
            <option value="archived">Archivées</option>
          </select>
        </div>

        <div className="space-y-4">
          {isLoading ? (
            <div className="space-y-4">
              {[1, 2, 3].map(i => (
                <div key={i} className="h-32 bg-slate-50 animate-pulse rounded-lg" />
              ))}
            </div>
          ) : filteredOffres.map((offre) => (
            <div key={offre.id} className="border border-slate-200 rounded-lg p-5 hover:shadow-md transition-all">
              <div className="flex items-start justify-between">
                <div className="flex-1 flex gap-4">
                  <div className="flex-shrink-0">
                    <div className="w-12 h-12 rounded-lg bg-violet-100 flex items-center justify-center">
                      <Briefcase className="w-6 h-6 text-violet-600" />
                    </div>
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="text-lg font-semibold text-slate-900">{offre.title}</h3>
                      <Badge className={getStatusColor(offre.status)}>{offre.status}</Badge>
                      <Badge className={getTypeColor(offre.contractType ?? '')}>{offre.contractType ?? '—'}</Badge>
                    </div>
                    <p className="text-sm text-slate-600 mb-3">{offre.description?.substring(0, 200)}{(offre.description?.length ?? 0) > 200 ? '...' : ''}</p>
                    <div className="flex flex-wrap items-center gap-4 text-sm text-slate-500">
                      <span className="flex items-center gap-1"><MapPin className="w-4 h-4" />{offre.location ?? '—'}</span>
                      <span className="flex items-center gap-1"><CheckCircle2 className="w-4 h-4" />{offre.salary ?? 'Non spécifié'}</span>
                      <span className="flex items-center gap-1"><Clock className="w-4 h-4" />{t('employerOffers.deadlineLabel')}: {offre.deadline ?? 'Sans limite'}</span>
                    </div>
                    <div className="flex flex-wrap gap-2 mt-3">
                      {offre.skills?.map((comp: string, i: number) => (
                        <span key={i} className="px-2 py-1 bg-slate-100 text-slate-600 rounded text-xs font-medium">{comp}</span>
                      ))}
                    </div>
                  </div>
                </div>
                  <div className="flex items-center gap-2 ml-4">
                  <button
                    onClick={() => showToast(`Détails de l'offre "${offre.title}".`, 'info')}
                    className="p-2 hover:bg-slate-100 rounded-lg"
                    title={t('employerOffers.view') as string}
                  >
                    <Eye className="w-4 h-4 text-slate-600" />
                  </button>
                  <Link
                    href={`/${locale}/dashboard/employer/offres/${offre.id}/edit`}
                    className="p-2 hover:bg-slate-100 rounded-lg"
                    title={t('employerOffers.edit') as string}
                  >
                    <Edit2 className="w-4 h-4 text-slate-600" />
                  </Link>
                  <button
                    onClick={() => handleDeleteOffre(offre.id)}
                    className="p-2 hover:bg-red-50 rounded-lg"
                    title={t('employerOffers.delete') as string}
                  >
                    <Trash2 className="w-4 h-4 text-red-500" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>

        {totalPages > 1 && (
          <div className="flex items-center justify-between mt-4 pt-4 border-t border-slate-200">
            <p className="text-sm text-slate-600">
              Page {currentPage} sur {totalPages} ({totalOffres} résultats)
            </p>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={currentPage === 1}
              >
                Précédent
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
              >
                Suivant
              </Button>
            </div>
          </div>
        )}

        {!isLoading && filteredOffres.length === 0 && (
          <div className="text-center py-12 text-slate-500">
            <Briefcase className="w-12 h-12 mx-auto mb-3 text-slate-300" />
            <p className="font-medium">{t('employerOffers.noResults')}</p>
            <p className="text-sm">{t('employerOffers.noResultsHint')}</p>
          </div>
        )}
      </div>
    </div>
  );
}
