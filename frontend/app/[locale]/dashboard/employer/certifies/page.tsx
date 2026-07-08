'use client';

import { useState } from 'react';
import {
  Award, Search, Filter, Eye, Mail, Download,
  ChevronDown, Star, BookOpen, Calendar, Plus, X
} from 'lucide-react';
import { Badge } from '@/components/ui';
import { Button } from '@/components/ui';
import { useToast } from '@/components/ui';
import { useTranslation } from '@/contexts/LanguageContext';
import {
  useCertifiedLearners,
  useCreateCertifiedLearner,
  useDeleteCertifiedLearner,
} from '@/hooks/api/useEmployer';
import { LoadingRow } from '@/components/ui/loading';

const LEVELS = ['Tous', 'beginner', 'intermediate', 'advanced', 'expert'];
const LEVEL_LABELS: Record<string, string> = {
  Tous: 'Tous',
  beginner: 'Débutant',
  intermediate: 'Intermédiaire',
  advanced: 'Avancé',
  expert: 'Expert',
};
const LEVEL_COLORS: Record<string, string> = {
  beginner: 'bg-gray-100 text-gray-700',
  intermediate: 'bg-blue-100 text-blue-700',
  advanced: 'bg-violet-100 text-violet-700',
  expert: 'bg-amber-100 text-amber-700',
};

export default function CertifiedLearnersPage() {
  const { showToast } = useToast();
  const { t } = useTranslation();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDomain, setSelectedDomain] = useState('Tous');
  const [selectedNiveau, setSelectedNiveau] = useState('Tous');
  const [currentPage, setCurrentPage] = useState(1);
  const [limit] = useState(10);
  const [showForm, setShowForm] = useState(false);

  const { data: learnersData, isLoading } = useCertifiedLearners({
    page: currentPage,
    limit,
    domain: selectedDomain !== 'Tous' ? selectedDomain : undefined,
    level: selectedNiveau !== 'Tous' ? selectedNiveau : undefined,
  });
  const createMutation = useCreateCertifiedLearner();
  const deleteMutation = useDeleteCertifiedLearner();

  const certifiedLearners = learnersData?.data ?? [];
  const totalLearners = learnersData?.total ?? 0;
  const totalPages = Math.ceil(totalLearners / limit);

  const domains = ['Tous', ...new Set(certifiedLearners.map(l => l.domain).filter(Boolean))];

  const [newLearner, setNewLearner] = useState({
    name: '', email: '', certification: '', domain: '', score: 0, level: 'intermediate', available: true
  });

  const filteredLearners = certifiedLearners.filter((learner) => {
    const matchesSearch = learner.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      learner.certification.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesDomain = selectedDomain === 'Tous' || learner.domain === selectedDomain;
    const matchesNiveau = selectedNiveau === 'Tous' || learner.level === selectedNiveau;
    return matchesSearch && matchesDomain && matchesNiveau;
  });

  const getScoreColor = (score: number) => {
    if (score >= 90) return 'text-green-600';
    if (score >= 80) return 'text-blue-600';
    if (score >= 70) return 'text-yellow-600';
    return 'text-red-600';
  };

  const handleAddLearner = async () => {
    if (!newLearner.name || !newLearner.email || !newLearner.certification) {
      showToast('Veuillez remplir les champs obligatoires', 'error');
      return;
    }
    try {
      await createMutation.mutateAsync({
        name: newLearner.name,
        email: newLearner.email,
        certification: newLearner.certification,
        domain: newLearner.domain || undefined,
        score: newLearner.score,
        level: newLearner.level,
        available: newLearner.available,
      });
      setNewLearner({ name: '', email: '', certification: '', domain: '', score: 0, level: 'intermediate', available: true });
      setShowForm(false);
      showToast(`Apprenant certifié "${newLearner.name}" ajouté.`, 'success');
    } catch (err) {
      console.error(err);
      showToast('Erreur lors de la création', 'error');
    }
  };

  const handleDeleteLearner = (id: number) => {
    const learner = certifiedLearners.find(l => l.id === id);
    if (!window.confirm(`Supprimer ${learner?.name} ?`)) return;
    deleteMutation.mutate(id, {
      onSuccess: () => showToast('Apprenant supprimé', 'info'),
      onError: () => showToast('Erreur', 'error'),
    });
  };

  const totalAvailable = certifiedLearners.filter(l => l.available).length;
  const totalExperts = certifiedLearners.filter(l => l.level === 'expert').length;

  return (
    <div className="w-full space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-black text-slate-900">{t('certifiedLearners.title')}</h1>
          <p className="text-slate-600 mt-1">{t('certifiedLearners.subtitle')}</p>
        </div>
        <Button
          onClick={() => setShowForm(true)}
          className="bg-violet-600 hover:bg-violet-700 text-white flex items-center gap-2"
        >
          <Plus size={18} />
          Ajouter un certifié
        </Button>
      </div>

      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/50" onClick={() => setShowForm(false)} />
          <div className="relative bg-white rounded-2xl shadow-xl border border-slate-200 p-6 w-full max-w-lg mx-4">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-semibold text-slate-900">Ajouter un certifié</h2>
              <button onClick={() => setShowForm(false)} className="p-2 hover:bg-slate-100 rounded-lg">
                <X className="w-5 h-5 text-slate-500" />
              </button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Nom complet *</label>
                <input
                  type="text"
                  value={newLearner.name}
                  onChange={(e) => setNewLearner({ ...newLearner, name: e.target.value })}
                  className="w-full px-4 py-2 border rounded-lg text-sm"
                  placeholder="Nom et prénom"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Email *</label>
                <input
                  type="email"
                  value={newLearner.email}
                  onChange={(e) => setNewLearner({ ...newLearner, email: e.target.value })}
                  className="w-full px-4 py-2 border rounded-lg text-sm"
                  placeholder="email@example.com"
                />
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-slate-700 mb-1">Certification *</label>
                <input
                  type="text"
                  value={newLearner.certification}
                  onChange={(e) => setNewLearner({ ...newLearner, certification: e.target.value })}
                  className="w-full px-4 py-2 border rounded-lg text-sm"
                  placeholder="Nom de la certification"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Domaine</label>
                <input
                  type="text"
                  value={newLearner.domain}
                  onChange={(e) => setNewLearner({ ...newLearner, domain: e.target.value })}
                  className="w-full px-4 py-2 border rounded-lg text-sm"
                  placeholder="Ex: Data Science"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Score (%)</label>
                <input
                  type="number"
                  min="0"
                  max="100"
                  value={newLearner.score}
                  onChange={(e) => setNewLearner({ ...newLearner, score: parseInt(e.target.value) || 0 })}
                  className="w-full px-4 py-2 border rounded-lg text-sm"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Niveau</label>
                <select
                  value={newLearner.level}
                  onChange={(e) => setNewLearner({ ...newLearner, level: e.target.value })}
                  className="w-full px-4 py-2 border rounded-lg text-sm"
                >
                  <option value="beginner">Débutant</option>
                  <option value="intermediate">Intermédiaire</option>
                  <option value="advanced">Avancé</option>
                  <option value="expert">Expert</option>
                </select>
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="available"
                  checked={newLearner.available}
                  onChange={(e) => setNewLearner({ ...newLearner, available: e.target.checked })}
                  className="w-4 h-4"
                />
                <label htmlFor="available" className="text-sm text-slate-700">Disponible</label>
              </div>
            </div>
            <div className="flex justify-end mt-6 gap-3">
              <Button variant="outline" onClick={() => setShowForm(false)}>Annuler</Button>
              <Button onClick={handleAddLearner} disabled={createMutation.isPending} className="bg-violet-600 hover:bg-violet-700 text-white">
                {createMutation.isPending ? 'Ajout...' : 'Ajouter'}
              </Button>
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-5">
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-lg bg-violet-50">
              <Award className="w-6 h-6 text-violet-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-slate-900">{totalLearners}</p>
              <p className="text-sm text-slate-600">{t('certifiedLearners.totalCertified')}</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-5">
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-lg bg-green-50">
              <Star className="w-6 h-6 text-green-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-slate-900">{totalAvailable}</p>
              <p className="text-sm text-slate-600">{t('certifiedLearners.available')}</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-5">
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-lg bg-amber-50">
              <BookOpen className="w-6 h-6 text-amber-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-slate-900">{totalExperts}</p>
              <p className="text-sm text-slate-600">{t('certifiedLearners.experts')}</p>
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
              placeholder={t('certifiedLearners.searchPlaceholder') as string}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-violet-300 outline-none"
            />
          </div>
          <select
            value={selectedDomain}
            onChange={(e) => { setSelectedDomain(e.target.value); setCurrentPage(1); }}
            className="px-4 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-violet-300 outline-none"
          >
            {domains.map((d) => (
              <option key={d} value={d}>{d}</option>
            ))}
          </select>
          <select
            value={selectedNiveau}
            onChange={(e) => { setSelectedNiveau(e.target.value); setCurrentPage(1); }}
            className="px-4 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-violet-300 outline-none"
          >
            {LEVELS.map((n) => (
              <option key={n} value={n}>{LEVEL_LABELS[n]}</option>
            ))}
          </select>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-200">
                <th className="text-left p-3 text-sm font-medium text-slate-600">{t('certifiedLearners.learner')}</th>
                <th className="text-left p-3 text-sm font-medium text-slate-600">{t('certifiedLearners.certification')}</th>
                <th className="text-left p-3 text-sm font-medium text-slate-600">{t('certifiedLearners.domain')}</th>
                <th className="text-left p-3 text-sm font-medium text-slate-600">{t('certifiedLearners.level')}</th>
                <th className="text-left p-3 text-sm font-medium text-slate-600">{t('certifiedLearners.score')}</th>
                <th className="text-left p-3 text-sm font-medium text-slate-600">{t('certifiedLearners.availability')}</th>
                <th className="text-left p-3 text-sm font-medium text-slate-600">{t('certifiedLearners.actions')}</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <LoadingRow colSpan={7} />
              ) : filteredLearners.length === 0 ? (
                <tr>
                  <td colSpan={7} className="p-8 text-center text-slate-500">Aucun certifié trouvé</td>
                </tr>
              ) : filteredLearners.map((learner) => (
                <tr key={learner.id} className="border-b border-slate-100 hover:bg-slate-50">
                  <td className="p-3">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 bg-violet-100 rounded-full flex items-center justify-center">
                        <span className="text-sm font-medium text-violet-700">
                          {learner.name.split(' ').map(n => n[0]).join('')}
                        </span>
                      </div>
                      <div>
                        <p className="font-medium text-slate-900">{learner.name}</p>
                        <p className="text-xs text-slate-500">{learner.email}</p>
                      </div>
                    </div>
                  </td>
                  <td className="p-3">
                    <p className="text-sm font-medium text-slate-800">{learner.certification}</p>
                    <p className="text-xs text-slate-500 flex items-center gap-1">
                      <Calendar className="w-3 h-3" /> {new Date(learner.obtainedAt).toLocaleDateString('fr-FR')}
                    </p>
                  </td>
                  <td className="p-3">
                    <span className="text-sm text-slate-700">{learner.domain ?? '-'}</span>
                  </td>
                  <td className="p-3">
                    <Badge className={LEVEL_COLORS[learner.level] ?? ''}>{LEVEL_LABELS[learner.level] ?? learner.level}</Badge>
                  </td>
                  <td className="p-3">
                    <span className={`text-sm font-bold ${getScoreColor(learner.score)}`}>{learner.score}%</span>
                  </td>
                  <td className="p-3">
                    <Badge className={learner.available ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}>
                      {learner.available ? t('certifiedLearners.availableStatus') : t('certifiedLearners.unavailableStatus')}
                    </Badge>
                  </td>
                  <td className="p-3">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => showToast(`Profil de ${learner.name} ouvert.`, 'info')}
                        className="p-1.5 hover:bg-slate-100 rounded" title={t('certifiedLearners.viewProfile') as string}
                      >
                        <Eye className="w-4 h-4 text-slate-600" />
                      </button>
                      <button
                        onClick={() => showToast(`Email envoyé à ${learner.name} (${learner.email}).`, 'success')}
                        className="p-1.5 hover:bg-slate-100 rounded" title={t('certifiedLearners.contact') as string}
                      >
                        <Mail className="w-4 h-4 text-slate-600" />
                      </button>
                      <button
                        onClick={() => handleDeleteLearner(learner.id)}
                        className="p-1.5 hover:bg-red-50 rounded"
                        title="Supprimer"
                      >
                        <X className="w-4 h-4 text-red-500" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {totalPages > 1 && (
          <div className="flex items-center justify-between mt-4 pt-4 border-t border-slate-200">
            <p className="text-sm text-slate-600">
              Page {currentPage} sur {totalPages} ({totalLearners} résultats)
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

        {filteredLearners.length === 0 && !isLoading && (
          <div className="text-center py-12 text-slate-500">
            <Award className="w-12 h-12 mx-auto mb-3 text-slate-300" />
            <p className="font-medium">{t('certifiedLearners.noResults')}</p>
            <p className="text-sm">{t('certifiedLearners.noResultsHint')}</p>
          </div>
        )}
      </div>
    </div>
  );
}
