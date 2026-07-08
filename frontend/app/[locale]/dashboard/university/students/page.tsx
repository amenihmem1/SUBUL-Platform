'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import {
  Search,
  Users,
  GraduationCap,
  Trash2,
  Filter,
  ChevronLeft,
  ChevronRight,
  CheckCircle,
  XCircle,
  Clock,
} from 'lucide-react';
import { Badge } from '@/components/ui';
import { Button } from '@/components/ui';
import { useToast } from '@/components/ui';
import { useConfirmDialog } from '@/components/ui';

import {
  useUniversityStudents,
  useUpdateMembership,
} from '@/hooks/api/useUniversity';
import { UniversityService } from '@/services/university';
import { LoadingRow } from '@/components/ui/loading';

const ITEMS_PER_PAGE = 10;

export default function UniversityStudentsPage() {

  const { showToast } = useToast();
  const { confirm, ConfirmDialogComponent } = useConfirmDialog();
  const [currentPage, setCurrentPage] = useState(1);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [showFilters, setShowFilters] = useState(false);

  const { data: studentsData, isLoading } = useUniversityStudents({
    page: currentPage,
    limit: ITEMS_PER_PAGE,
    status: filterStatus !== 'all' ? filterStatus : undefined,
    search: searchQuery || undefined,
  });
  const updateMembership = useUpdateMembership();

  const handleCsvImportScaffold = async () => {
    try {
      const r = (await UniversityService.csvImportStub()) as { message?: string };
      showToast(r.message || 'Import CSV — bientôt disponible.', 'info');
    } catch {
      showToast('Impossible de contacter le serveur pour l’import CSV.', 'error');
    }
  };

  const students: any[] = studentsData?.data ?? (Array.isArray(studentsData) ? studentsData : []);
  const totalStudents: number = studentsData?.total ?? students.length;
  const totalPages = Math.ceil(totalStudents / ITEMS_PER_PAGE);

  const handleRemoveStudent = (membershipId: string, studentName: string) => {
    confirm({
      title: 'Retirer cet étudiant ?',
      message: `Êtes-vous sûr de vouloir retirer ${studentName} ? Le siège sera libéré.`,
      confirmLabel: 'Oui, retirer',
      cancelLabel: 'Non, annuler',
      onConfirm: async () => {
        try {
          await updateMembership.mutateAsync({ id: membershipId, data: { status: 'removed' } });
          showToast(`Étudiant ${studentName} retiré avec succès.`, 'info');
        } catch (err) {
          console.error(err);
          showToast("Erreur lors du retrait de l'étudiant.", 'error');
        }
      },
    });
  };

  const handleUpdateStatus = async (membershipId: string, currentStatus: string) => {
    const newStatus = currentStatus === 'active' ? 'inactive' : 'active';
    try {
      await updateMembership.mutateAsync({ id: membershipId, data: { status: newStatus } });
      showToast(`Statut mis à jour : ${newStatus === 'active' ? 'Actif' : 'Inactif'}`, 'success');
    } catch (err) {
      console.error(err);
      showToast('Erreur lors de la mise à jour du statut.', 'error');
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-100 text-green-700';
      case 'invited': return 'bg-blue-100 text-blue-700';
      case 'pending': return 'bg-amber-100 text-amber-700';
      case 'completed': return 'bg-violet-100 text-violet-700';
      case 'inactive': return 'bg-slate-100 text-slate-700';
      default: return 'bg-gray-100 text-gray-700';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'active': return <CheckCircle className="w-3 h-3" />;
      case 'completed': return <CheckCircle className="w-3 h-3" />;
      case 'inactive': return <XCircle className="w-3 h-3" />;
      case 'invited': return <Clock className="w-3 h-3" />;
      case 'pending': return <Clock className="w-3 h-3" />;
      default: return null;
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'active': return 'Actif';
      case 'invited': return 'Invité';
      case 'pending': return 'En attente';
      case 'completed': return 'Terminé';
      case 'inactive': return 'Inactif';
      default: return status;
    }
  };

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return '-';
    return new Date(dateStr).toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  };

  const activeStudents = students.filter(s => s.status === 'active').length;
  const completedStudents = students.filter(s => s.status === 'completed').length;

  return (
    <div className="space-y-6">
      {ConfirmDialogComponent}

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-black text-slate-900">Étudiants</h1>
          <p className="text-slate-600 mt-1">Gérez les étudiants inscrits à vos programmes.</p>
        </div>
        <Button type="button" variant="outline" className="shrink-0" onClick={handleCsvImportScaffold}>
          Import CSV (aperçu)
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <motion.div
          className="bg-card rounded-2xl p-6 border border-border shadow-sm relative overflow-hidden transition-all duration-300 hover:-translate-y-1 hover:shadow-lg hover:border-primary/30"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <div className="flex items-start justify-between mb-4">
            <div className="w-14 h-14 rounded-xl flex items-center justify-center" style={{ background: '#8b5cf620', color: '#8b5cf6' }}>
              <Users className="w-6 h-6" />
            </div>
          </div>
          <div>
            <motion.h3
              className="text-3xl font-extrabold tracking-tight text-foreground"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.3 }}
            >
              {totalStudents}
            </motion.h3>
            <p className="text-muted-foreground text-sm mt-1">Total étudiants</p>
          </div>
        </motion.div>
        <motion.div
          className="bg-card rounded-2xl p-6 border border-border shadow-sm relative overflow-hidden transition-all duration-300 hover:-translate-y-1 hover:shadow-lg hover:border-primary/30"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <div className="flex items-start justify-between mb-4">
            <div className="w-14 h-14 rounded-xl flex items-center justify-center" style={{ background: '#10b98120', color: '#10b981' }}>
              <GraduationCap className="w-6 h-6" />
            </div>
          </div>
          <div>
            <motion.h3
              className="text-3xl font-extrabold tracking-tight text-foreground"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.4 }}
            >
              {activeStudents}
            </motion.h3>
            <p className="text-muted-foreground text-sm mt-1">Étudiants actifs</p>
          </div>
        </motion.div>
        <motion.div
          className="bg-card rounded-2xl p-6 border border-border shadow-sm relative overflow-hidden transition-all duration-300 hover:-translate-y-1 hover:shadow-lg hover:border-primary/30"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <div className="flex items-start justify-between mb-4">
            <div className="w-14 h-14 rounded-xl flex items-center justify-center" style={{ background: '#8b5cf620', color: '#8b5cf6' }}>
              <CheckCircle className="w-6 h-6" />
            </div>
          </div>
          <div>
            <motion.h3
              className="text-3xl font-extrabold tracking-tight text-foreground"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.5 }}
            >
              {completedStudents}
            </motion.h3>
            <p className="text-muted-foreground text-sm mt-1">Diplômés</p>
          </div>
        </motion.div>
      </div>

      <div className="bg-card rounded-2xl border border-border shadow-sm p-6">
        <div className="flex flex-col md:flex-row gap-4 mb-6">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="Rechercher par nom ou email..."
              value={searchQuery}
              onChange={(e) => { setSearchQuery(e.target.value); setCurrentPage(1); }}
              className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div className="relative">
            <Button variant="outline" onClick={() => setShowFilters(!showFilters)}>
              <Filter className="w-4 h-4 mr-2" /> Filtres
            </Button>
            {showFilters && (
              <div className="absolute right-0 mt-2 w-72 bg-white border border-slate-200 rounded-lg shadow-lg p-4 z-10">
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Statut</label>
                    <select
                      value={filterStatus}
                      onChange={(e) => { setFilterStatus(e.target.value); setCurrentPage(1); }}
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm"
                    >
                      <option value="all">Tous les statuts</option>
                      <option value="active">Actif</option>
                      <option value="invited">Invité</option>
                      <option value="pending">En attente</option>
                      <option value="completed">Terminé</option>
                      <option value="inactive">Inactif</option>
                    </select>
                  </div>
                  <Button size="sm" className="w-full" onClick={() => setShowFilters(false)}>
                    Appliquer
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-200">
                <th className="text-left p-3 text-sm font-medium text-slate-600">Étudiant</th>
                <th className="text-left p-3 text-sm font-medium text-slate-600">Programme</th>
                <th className="text-left p-3 text-sm font-medium text-slate-600">Statut</th>
                <th className="text-left p-3 text-sm font-medium text-slate-600">Progression</th>
                <th className="text-left p-3 text-sm font-medium text-slate-600">Inscrit le</th>
                <th className="text-left p-3 text-sm font-medium text-slate-600">Actions</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <LoadingRow colSpan={6} label="Chargement des étudiants…" />
              ) : students.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-slate-500">
                    Aucun étudiant trouvé
                  </td>
                </tr>
              ) : students.map((student) => (
                <tr key={`${student.id}-${student.enrollmentId}`} className="border-b border-slate-100 hover:bg-slate-50">
                  <td className="p-3">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-gradient-to-br from-primary to-accent rounded-full flex items-center justify-center text-primary-foreground font-semibold text-sm">
                        {(student.fullName || student.email || '?').split(' ').map((n: string) => n[0]).join('').substring(0, 2).toUpperCase()}
                      </div>
                      <div>
                        <p className="font-medium text-slate-900">{student.fullName || '-'}</p>
                        <p className="text-sm text-slate-500">{student.email}</p>
                      </div>
                    </div>
                  </td>
                  <td className="p-3">
                    <span className="text-sm text-slate-700">{student.program?.title || '-'}</span>
                  </td>
                  <td className="p-3">
                    <Badge className={`${getStatusColor(student.status)} flex items-center gap-1 w-fit`}>
                      {getStatusIcon(student.status)}
                      {getStatusLabel(student.status)}
                    </Badge>
                  </td>
                  <td className="p-3">
                    <div className="flex items-center gap-2">
                      <div className="w-20 bg-slate-200 rounded-full h-2">
                        <div
                          className="bg-gradient-to-r from-primary to-accent h-2 rounded-full transition-all"
                          style={{ width: `${student.progress}%` }}
                        />
                      </div>
                      <span className="text-sm font-medium text-slate-700">{student.progress}%</span>
                    </div>
                  </td>
                  <td className="p-3 text-sm text-slate-600">
                    {formatDate(student.enrolledAt)}
                  </td>
                  <td className="p-3">
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => handleUpdateStatus(student.membershipId ?? student.id, student.status)}
                        className="p-2 hover:bg-amber-100 rounded-lg transition-colors"
                        title={student.status === 'active' ? 'Désactiver' : 'Activer'}
                      >
                        {student.status === 'active' ? (
                          <XCircle className="w-4 h-4 text-amber-600" />
                        ) : (
                          <CheckCircle className="w-4 h-4 text-green-600" />
                        )}
                      </button>
                      <button
                        onClick={() => handleRemoveStudent(student.membershipId ?? student.id, student.fullName || student.email)}
                        className="p-2 hover:bg-red-100 rounded-lg transition-colors"
                        title="Retirer"
                      >
                        <Trash2 className="w-4 h-4 text-red-600" />
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
              Page {currentPage} sur {totalPages} ({totalStudents} étudiants)
            </p>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={currentPage === 1}
              >
                <ChevronLeft className="w-4 h-4" />
              </Button>
              <span className="text-sm font-medium text-slate-700 px-2">
                {currentPage} / {totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
              >
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
