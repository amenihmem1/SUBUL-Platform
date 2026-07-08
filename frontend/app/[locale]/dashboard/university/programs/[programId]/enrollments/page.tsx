'use client';

import { useState, useMemo } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
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
  ArrowLeft,
} from 'lucide-react';
import { Badge } from '@/components/ui';
import { Button } from '@/components/ui';
import { useToast } from '@/components/ui';
import { useConfirmDialog } from '@/components/ui';
import { useProgramEnrollments, useUpdateUniversityStudent, useRemoveUniversityStudent } from '@/hooks/api/useUniversity';
import { useTranslation } from '@/contexts/LanguageContext';

const ITEMS_PER_PAGE = 10;

interface Enrollment {
  id: string;
  enrollmentId?: string;
  userId?: number;
  status: string;
  progress?: number;
  enrolledAt?: string;
  completedAt?: string;
  user?: { id: number; email: string; fullName?: string };
}

export default function ProgramEnrollmentsPage() {
  const params = useParams();
  const locale = (params?.locale as string) || 'fr';
  const programId = params?.programId as string;
  const { showToast } = useToast();
  const { confirm, ConfirmDialogComponent } = useConfirmDialog();
  const { t } = useTranslation();

  const [currentPage, setCurrentPage] = useState(1);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [showFilters, setShowFilters] = useState(false);

  const { data: enrollmentsData, isLoading } = useProgramEnrollments(programId, {
    page: currentPage,
    limit: ITEMS_PER_PAGE,
  });

  const updateStudent = useUpdateUniversityStudent();
  const removeStudent = useRemoveUniversityStudent();

  const enrollments = useMemo(() => {
    return (Array.isArray(enrollmentsData) ? enrollmentsData : enrollmentsData?.data ?? []) as Enrollment[];
  }, [enrollmentsData]);
  
  const totalItems = enrollmentsData?.total ?? enrollments.length;
  const totalPages = Math.ceil(totalItems / ITEMS_PER_PAGE);

  // Client-side filtering
  const filteredEnrollments = useMemo(() => {
    let result = enrollments;
    
    if (filterStatus !== 'all') {
      result = result.filter(e => e.status === filterStatus);
    }
    
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      result = result.filter(e => 
        e.user?.email?.toLowerCase().includes(query) ||
        e.user?.fullName?.toLowerCase().includes(query)
      );
    }
    
    return result;
  }, [enrollments, filterStatus, searchQuery]);

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
      case 'active': return t('universityEnrollments.statusActive');
      case 'invited': return t('universityEnrollments.statusInvited');
      case 'pending': return t('universityEnrollments.statusPending');
      case 'completed': return t('universityEnrollments.statusCompleted');
      case 'inactive': return t('universityEnrollments.statusInactive');
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

  const handleRemoveFromProgram = (studentId: number, studentName: string) => {
    confirm({
      title: 'Retirer du programme ?',
      message: `Êtes-vous sûr de vouloir retirer ${studentName} de ce programme ?`,
      confirmLabel: 'Oui, retirer',
      cancelLabel: 'Non, annuler',
      onConfirm: async () => {
        try {
          await removeStudent.mutateAsync({ id: studentId, programId });
          showToast(`Étudiant retiré du programme avec succès.`, 'info');
        } catch (err) {
          console.error(err);
          showToast('Erreur lors du retrait du programme.', 'error');
        }
      },
    });
  };

  const handleUpdateStatus = async (studentId: number, currentStatus: string) => {
    const newStatus = currentStatus === 'active' ? 'inactive' : 'active';
    try {
      await updateStudent.mutateAsync({
        id: studentId,
        data: { enrollmentStatus: newStatus, programId },
      });
      showToast(`Statut mis à jour : ${newStatus === 'active' ? 'Actif' : 'Inactif'}`, 'success');
    } catch (err) {
      console.error(err);
      showToast('Erreur lors de la mise à jour du statut.', 'error');
    }
  };

  // Stats based on all enrollments (current page)
  const stats = {
    total: enrollments.length,
    active: enrollments.filter(e => e.status === 'active').length,
    completed: enrollments.filter(e => e.status === 'completed').length,
    pending: enrollments.filter(e => e.status === 'pending' || e.status === 'invited').length,
  };

  return (
    <div className="space-y-6 p-4 md:p-6">
      {ConfirmDialogComponent}

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <Button variant="ghost" size="sm" asChild>
              <Link href={`/${locale}/dashboard/university/programs`}>
                <ArrowLeft className="h-4 w-4 mr-1" />
                {t('universityPrograms.title')}
              </Link>
            </Button>
          </div>
          <h1 className="text-2xl md:text-3xl font-bold text-foreground">{t('universityEnrollments.title')}</h1>
          <p className="text-muted-foreground mt-1">{t('universityEnrollments.subtitle')}</p>
        </div>
      </div>

      {/* Stats cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <motion.div
          className="bg-card rounded-2xl p-6 border border-border shadow-sm"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <div className="flex items-start justify-between mb-4">
            <div className="w-14 h-14 rounded-xl flex items-center justify-center bg-purple-500/10 text-purple-600">
              <Users className="w-6 h-6" />
            </div>
          </div>
          <div>
            <h3 className="text-3xl font-extrabold tracking-tight text-foreground">
              {stats.total}
            </h3>
            <p className="text-muted-foreground text-sm mt-1">{t('universityEnrollments.totalEnrolled')}</p>
          </div>
        </motion.div>

        <motion.div
          className="bg-card rounded-2xl p-6 border border-border shadow-sm"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <div className="flex items-start justify-between mb-4">
            <div className="w-14 h-14 rounded-xl flex items-center justify-center bg-green-500/10 text-green-600">
              <CheckCircle className="w-6 h-6" />
            </div>
          </div>
          <div>
            <h3 className="text-3xl font-extrabold tracking-tight text-foreground">
              {stats.active}
            </h3>
            <p className="text-muted-foreground text-sm mt-1">{t('universityEnrollments.active')}</p>
          </div>
        </motion.div>

        <motion.div
          className="bg-card rounded-2xl p-6 border border-border shadow-sm"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <div className="flex items-start justify-between mb-4">
            <div className="w-14 h-14 rounded-xl flex items-center justify-center bg-blue-500/10 text-blue-600">
              <GraduationCap className="w-6 h-6" />
            </div>
          </div>
          <div>
            <h3 className="text-3xl font-extrabold tracking-tight text-foreground">
              {stats.completed}
            </h3>
            <p className="text-muted-foreground text-sm mt-1">{t('universityEnrollments.graduated')}</p>
          </div>
        </motion.div>

        <motion.div
          className="bg-card rounded-2xl p-6 border border-border shadow-sm"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <div className="flex items-start justify-between mb-4">
            <div className="w-14 h-14 rounded-xl flex items-center justify-center bg-amber-500/10 text-amber-600">
              <Clock className="w-6 h-6" />
            </div>
          </div>
          <div>
            <h3 className="text-3xl font-extrabold tracking-tight text-foreground">
              {stats.pending}
            </h3>
            <p className="text-muted-foreground text-sm mt-1">{t('universityEnrollments.pending')}</p>
          </div>
        </motion.div>
      </div>

      {/* Search and Filters */}
      <div className="bg-card rounded-2xl border border-border shadow-sm p-6">
        <div className="flex flex-col md:flex-row gap-4 mb-6">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder={t('universityEnrollments.searchPlaceholder') as string}
              value={searchQuery}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => { 
                setSearchQuery(e.target.value); 
                setCurrentPage(1); 
              }}
              className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div className="relative">
            <Button variant="outline" onClick={() => setShowFilters(!showFilters)}>
              <Filter className="w-4 h-4 mr-2" /> {t('common.filter')}
            </Button>
            {showFilters && (
              <div className="absolute right-0 mt-2 w-72 bg-white border border-slate-200 rounded-lg shadow-lg p-4 z-10">
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">{t('universityEnrollments.filterStatus')}</label>
                    <select
                      value={filterStatus}
                      onChange={(e: React.ChangeEvent<HTMLSelectElement>) => { 
                        setFilterStatus(e.target.value); 
                        setCurrentPage(1); 
                      }}
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm"
                    >
                      <option value="all">{t('universityEnrollments.allStatuses')}</option>
                      <option value="active">{t('universityEnrollments.statusActive')}</option>
                      <option value="invited">{t('universityEnrollments.statusInvited')}</option>
                      <option value="pending">{t('universityEnrollments.statusPending')}</option>
                      <option value="completed">{t('universityEnrollments.statusCompleted')}</option>
                      <option value="inactive">{t('universityEnrollments.statusInactive')}</option>
                    </select>
                  </div>
                  <Button size="sm" className="w-full" onClick={() => setShowFilters(false)}>
                    {t('common.apply')}
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Enrollments Table */}
        {isLoading ? (
          <div className="flex items-center justify-center h-64">
            <div className="w-6 h-6 border-2 border-violet-500 border-t-transparent rounded-full animate-spin mr-3" />
            {t('common.loading')}
          </div>
        ) : filteredEnrollments.length === 0 ? (
          <div className="text-center py-12">
            <Users className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground">{t('universityEnrollments.noEnrollments')}</p>
            <p className="text-sm text-muted-foreground mt-1">{t('universityEnrollments.noEnrollmentsHint')}</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-200">
                  <th className="text-left p-3 text-sm font-medium text-slate-600">Étudiant</th>
                  <th className="text-left p-3 text-sm font-medium text-slate-600">{t('universityEnrollments.filterStatus')}</th>
                  <th className="text-left p-3 text-sm font-medium text-slate-600">Progression</th>
                  <th className="text-left p-3 text-sm font-medium text-slate-600">Inscrit le</th>
                  <th className="text-left p-3 text-sm font-medium text-slate-600">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredEnrollments.map((enrollment: Enrollment) => (
                  <tr key={enrollment.enrollmentId || enrollment.id} className="border-b border-slate-100 hover:bg-slate-50">
                    <td className="p-3">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-gradient-to-br from-primary to-accent rounded-full flex items-center justify-center text-primary-foreground font-semibold text-sm">
                          {(enrollment.user?.fullName || enrollment.user?.email || '?').split(' ').map((n: string) => n[0]).join('').substring(0, 2).toUpperCase()}
                        </div>
                        <div>
                          <p className="font-medium text-slate-900">{enrollment.user?.fullName || '-'}</p>
                          <p className="text-sm text-slate-500">{enrollment.user?.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="p-3">
                      <Badge className={`${getStatusColor(enrollment.status)} flex items-center gap-1 w-fit`}>
                        {getStatusIcon(enrollment.status)}
                        {getStatusLabel(enrollment.status)}
                      </Badge>
                    </td>
                    <td className="p-3">
                      <div className="flex items-center gap-2">
                        <div className="w-20 bg-slate-200 rounded-full h-2">
                          <div
                            className={`${(enrollment.progress ?? 0) > 80 ? 'bg-red-500' : (enrollment.progress ?? 0) > 50 ? 'bg-yellow-500' : 'bg-green-500'} h-2 rounded-full transition-all`}
                            style={{ width: `${enrollment.progress ?? 0}%` }}
                          />
                        </div>
                        <span className="text-sm font-medium text-slate-700">{enrollment.progress ?? 0}%</span>
                      </div>
                    </td>
                    <td className="p-3 text-sm text-slate-600">
                      {formatDate(enrollment.enrolledAt)}
                    </td>
                    <td className="p-3">
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => handleUpdateStatus(enrollment.user?.id || enrollment.userId || 0, enrollment.status)}
                          className="p-2 hover:bg-amber-100 rounded-lg transition-colors"
                          title={enrollment.status === 'active' ? (t('universityEnrollments.deactivate') as string) : (t('universityEnrollments.activate') as string)}
                        >
                          {enrollment.status === 'active' ? (
                            <XCircle className="w-4 h-4 text-amber-600" />
                          ) : (
                            <CheckCircle className="w-4 h-4 text-green-600" />
                          )}
                        </button>
                        <button
                          onClick={() => handleRemoveFromProgram(
                            enrollment.user?.id || enrollment.userId || 0,
                            enrollment.user?.fullName || enrollment.user?.email || 'cet étudiant'
                          )}
                          className="p-2 hover:bg-red-100 rounded-lg transition-colors"
                          title={t('universityEnrollments.removeFromProgram') as string}
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
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between mt-4 pt-4 border-t border-slate-200">
            <p className="text-sm text-slate-600">
              Page {currentPage} sur {totalPages} ({totalItems} inscriptions)
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