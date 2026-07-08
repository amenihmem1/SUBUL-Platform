'use client';

import { useState } from 'react';
import {
  UserPlus, Search, Plus, X, CheckCircle2, Mail,
  Eye, Edit2, Trash2, GraduationCap, Award,
  BookOpen, TrendingUp
} from 'lucide-react';
import { Badge } from '@/components/ui';
import { Button } from '@/components/ui';
import { useToast } from '@/components/ui';
import { useConfirmDialog } from '@/components/ui';
import { useTranslation } from '@/contexts/LanguageContext';
import {
  useEmployees,
  useCreateEmployee,
  useDeleteEmployee,
} from '@/hooks/api/useEmployer';
import type { Employee } from '@/services/employer';
import { LoadingRow } from '@/components/ui/loading';

export default function EmployesPage() {
  const { showToast } = useToast();
  const { confirm, ConfirmDialogComponent } = useConfirmDialog();
  const { t } = useTranslation();
  const [showForm, setShowForm] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterDepartement, setFilterDepartement] = useState('Tous');
  const [currentPage, setCurrentPage] = useState(1);
  const [limit] = useState(10);

  const { data: employeesData, isLoading } = useEmployees({ page: currentPage, limit });
  const createMutation = useCreateEmployee();
  const deleteMutation = useDeleteEmployee();

  const employees = employeesData?.data ?? [];
  const totalEmployees = employeesData?.total ?? 0;
  const totalPages = Math.ceil(totalEmployees / limit);

  const [newEmploye, setNewEmploye] = useState({
    name: '', email: '', position: '', department: ''
  });

  const departements = ['Tous', ...new Set(employees.map(e => e.department).filter(Boolean))];

  const handleAddEmploye = async () => {
    if (!newEmploye.name || !newEmploye.email) {
      showToast('Veuillez remplir le nom et l\'email', 'error');
      return;
    }
    try {
      await createMutation.mutateAsync({
        name: newEmploye.name,
        email: newEmploye.email,
        position: newEmploye.position || undefined,
        department: newEmploye.department || undefined,
      });
      setNewEmploye({ name: '', email: '', position: '', department: '' });
      setShowForm(false);
      showToast(`Invitation envoyée à ${newEmploye.name} (${newEmploye.email}).`, 'success');
    } catch (err) {
      console.error(err);
      showToast('Erreur lors de la création', 'error');
    }
  };

  const handleDeleteEmploye = (id: number) => {
    const employe = employees.find(e => e.id === id);
    confirm({
      title: 'Retirer cet employé ?',
      message: `Êtes-vous sûr de vouloir retirer ${employe?.name} de la liste des employés ? Il perdra son accès apprenant.`,
      confirmLabel: 'Oui, retirer',
      cancelLabel: 'Non, annuler',
      onConfirm: async () => {
        try {
          await deleteMutation.mutateAsync(id);
          showToast(`${employe?.name} retiré de la liste des employés.`, 'info');
        } catch (err) {
          console.error(err);
        }
      },
    });
  };

  const filteredEmployes = employees.filter((e) => {
    const matchesSearch = e.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      e.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (e.position?.toLowerCase().includes(searchQuery.toLowerCase()) ?? false);
    const matchesDept = filterDepartement === 'Tous' || e.department === filterDepartement;
    return matchesSearch && matchesDept;
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-100 text-green-700';
      case 'pending': return 'bg-yellow-100 text-yellow-700';
      case 'inactive': return 'bg-slate-100 text-slate-700';
      default: return 'bg-gray-100 text-gray-700';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'active': return 'Actif';
      case 'pending': return 'En attente';
      case 'inactive': return 'Inactif';
      default: return status;
    }
  };

  const totalActifs = employees.filter(e => e.learnerStatus === 'active').length;
  const totalCertifications = employees.reduce((acc, e) => acc + e.certifications, 0);
  const avgProgression = Math.round(
    employees.filter(e => e.learnerStatus === 'active').reduce((acc, e) => acc + e.progression, 0) /
    (totalActifs || 1)
  );

  return (
    <div className="w-full space-y-6">
      {ConfirmDialogComponent}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-black text-slate-900">Mes Employés</h1>
          <p className="text-slate-600 mt-1">Inscrivez vos employés comme apprenants sur la plateforme.</p>
        </div>
        <Button
          onClick={() => setShowForm(true)}
          className="bg-violet-600 hover:bg-violet-700 text-white flex items-center gap-2"
        >
          <UserPlus size={18} />
          Ajouter un employé
        </Button>
      </div>

      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/50" onClick={() => setShowForm(false)} />
          <div className="relative bg-white rounded-2xl shadow-xl border border-slate-200 p-6 w-full max-w-lg mx-4">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-semibold text-slate-900">Inscrire un nouvel employé</h2>
              <button onClick={() => setShowForm(false)} className="p-2 hover:bg-slate-100 rounded-lg">
                <X className="w-5 h-5 text-slate-500" />
              </button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Nom complet *</label>
                <input
                  type="text"
                  value={newEmploye.name}
                  onChange={(e) => setNewEmploye({ ...newEmploye, name: e.target.value })}
                  className="w-full px-4 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-violet-300 outline-none"
                  placeholder="Nom et prénom"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Email professionnel *</label>
                <input
                  type="email"
                  value={newEmploye.email}
                  onChange={(e) => setNewEmploye({ ...newEmploye, email: e.target.value })}
                  className="w-full px-4 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-violet-300 outline-none"
                  placeholder="email@company.com"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Poste</label>
                <input
                  type="text"
                  value={newEmploye.position}
                  onChange={(e) => setNewEmploye({ ...newEmploye, position: e.target.value })}
                  className="w-full px-4 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-violet-300 outline-none"
                  placeholder="Titre du poste"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Département</label>
                <input
                  type="text"
                  value={newEmploye.department}
                  onChange={(e) => setNewEmploye({ ...newEmploye, department: e.target.value })}
                  className="w-full px-4 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-violet-300 outline-none"
                  placeholder="Ex: Engineering, Marketing..."
                />
              </div>
            </div>
            <div className="flex justify-end mt-6 gap-3">
              <Button variant="outline" onClick={() => setShowForm(false)}>Annuler</Button>
              <Button onClick={handleAddEmploye} disabled={createMutation.isPending} className="bg-violet-600 hover:bg-violet-700 text-white flex items-center gap-2">
                <Mail size={18} />
                {createMutation.isPending ? 'Envoi...' : 'Envoyer l\'invitation'}
              </Button>
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-5">
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-lg bg-violet-50"><UserPlus className="w-6 h-6 text-violet-600" /></div>
            <div>
              <p className="text-2xl font-bold text-slate-900">{totalEmployees}</p>
              <p className="text-sm text-slate-600">Total employés</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-5">
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-lg bg-green-50"><GraduationCap className="w-6 h-6 text-green-600" /></div>
            <div>
              <p className="text-2xl font-bold text-slate-900">{totalActifs}</p>
              <p className="text-sm text-slate-600">Apprenants actifs</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-5">
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-lg bg-amber-50"><Award className="w-6 h-6 text-amber-600" /></div>
            <div>
              <p className="text-2xl font-bold text-slate-900">{totalCertifications}</p>
              <p className="text-sm text-slate-600">Certifications obtenues</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-5">
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-lg bg-blue-50"><TrendingUp className="w-6 h-6 text-blue-600" /></div>
            <div>
              <p className="text-2xl font-bold text-slate-900">{avgProgression}%</p>
              <p className="text-sm text-slate-600">Progression moyenne</p>
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
              placeholder="Rechercher un employé..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-violet-300 outline-none"
            />
          </div>
          <select
            value={filterDepartement}
            onChange={(e) => setFilterDepartement(e.target.value)}
            className="px-4 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-violet-300 outline-none"
          >
            {departements.map((d) => (
              <option key={d} value={d}>{d === 'Tous' ? 'Tous les départements' : d}</option>
            ))}
          </select>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-200">
                <th className="text-left p-3 text-sm font-medium text-slate-600">Employé</th>
                <th className="text-left p-3 text-sm font-medium text-slate-600">Poste</th>
                <th className="text-left p-3 text-sm font-medium text-slate-600">Département</th>
                <th className="text-left p-3 text-sm font-medium text-slate-600">Statut</th>
                <th className="text-left p-3 text-sm font-medium text-slate-600">Cours</th>
                <th className="text-left p-3 text-sm font-medium text-slate-600">Certifications</th>
                <th className="text-left p-3 text-sm font-medium text-slate-600">Progression</th>
                <th className="text-left p-3 text-sm font-medium text-slate-600">Actions</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <LoadingRow colSpan={8} />
              ) : filteredEmployes.length === 0 ? (
                <tr>
                  <td colSpan={8} className="p-8 text-center text-slate-500">Aucun employé trouvé</td>
                </tr>
              ) : filteredEmployes.map((employe) => (
                <tr key={employe.id} className="border-b border-slate-100 hover:bg-slate-50">
                  <td className="p-3">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 bg-violet-100 rounded-full flex items-center justify-center">
                        <span className="text-sm font-medium text-violet-700">
                          {employe.name.split(' ').map(n => n[0]).join('')}
                        </span>
                      </div>
                      <div>
                        <p className="font-medium text-slate-900">{employe.name}</p>
                        <p className="text-xs text-slate-500">{employe.email}</p>
                      </div>
                    </div>
                  </td>
                  <td className="p-3 text-sm text-slate-700">{employe.position ?? '-'}</td>
                  <td className="p-3">
                    <Badge variant="outline" className="text-xs">{employe.department ?? '-'}</Badge>
                  </td>
                  <td className="p-3">
                    <Badge className={getStatusColor(employe.learnerStatus)}>{getStatusLabel(employe.learnerStatus)}</Badge>
                  </td>
                  <td className="p-3">
                    <div className="flex items-center gap-2 text-sm">
                      <span className="text-blue-600 font-medium">{employe.coursesInProgress}</span>
                      <span className="text-slate-400">/</span>
                      <span className="text-green-600 font-medium">{employe.coursesCompleted}</span>
                    </div>
                    <p className="text-xs text-slate-400">en cours / terminés</p>
                  </td>
                  <td className="p-3">
                    <div className="flex items-center gap-1">
                      <Award className="w-4 h-4 text-amber-500" />
                      <span className="text-sm font-medium text-slate-900">{employe.certifications}</span>
                    </div>
                  </td>
                  <td className="p-3">
                    <div className="flex items-center gap-2">
                      <div className="flex-1 bg-slate-200 rounded-full h-2 w-20">
                        <div
                          className="bg-violet-500 h-2 rounded-full transition-all"
                          style={{ width: `${employe.progression}%` }}
                        />
                      </div>
                      <span className="text-xs font-medium text-slate-600">{employe.progression}%</span>
                    </div>
                  </td>
                  <td className="p-3">
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => showToast(`Profil de ${employe.name} ouvert.`, 'info')}
                        className="p-1.5 hover:bg-slate-100 rounded" title="Voir le profil"
                      >
                        <Eye className="w-4 h-4 text-slate-600" />
                      </button>
                      <button
                        onClick={() => showToast(`Email envoyé à ${employe.name} (${employe.email}).`, 'success')}
                        className="p-1.5 hover:bg-slate-100 rounded" title="Envoyer un email"
                      >
                        <Mail className="w-4 h-4 text-slate-600" />
                      </button>
                      <button
                        onClick={() => handleDeleteEmploye(employe.id)}
                        className="p-1.5 hover:bg-red-50 rounded"
                        title="Retirer"
                      >
                        <Trash2 className="w-4 h-4 text-red-500" />
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
              Page {currentPage} sur {totalPages} ({totalEmployees} résultats)
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

        {filteredEmployes.length === 0 && !isLoading && (
          <div className="text-center py-12 text-slate-500">
            <UserPlus className="w-12 h-12 mx-auto mb-3 text-slate-300" />
            <p className="font-medium">Aucun employé trouvé</p>
            <p className="text-sm">Ajoutez vos employés pour les inscrire comme apprenants.</p>
          </div>
        )}
      </div>
    </div>
  );
}
