'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { ClipboardList, CheckCircle2, Clock, XCircle, ChevronLeft, ChevronRight, Eye, Filter, Search, AlertTriangle } from 'lucide-react';

const mockAssessments = [
  { id: 1, courseId: 'AZ-900', courseTitle: 'Azure Fundamentals', studentId: 1, studentName: 'Ahmed Benali', score: 85, completedAt: '2026-03-21T10:30:00', status: 'pending' as const },
  { id: 2, courseId: 'AWS-EC2', courseTitle: 'AWS EC2 Basics', studentId: 2, studentName: 'Fatima Zahra', score: 92, completedAt: '2026-03-21T09:15:00', status: 'reviewed' as const },
  { id: 3, courseId: 'GCP-COMPUTE', courseTitle: 'GCP Compute Engine', studentId: 3, studentName: 'Karim Hamdani', score: 78, completedAt: '2026-03-21T08:45:00', status: 'pending' as const },
  { id: 4, courseId: 'AZ-900', courseTitle: 'Azure Fundamentals', studentId: 4, studentName: 'Youssef Alaoui', score: 45, completedAt: '2026-03-20T16:20:00', status: 'failed' as const },
  { id: 5, courseId: 'AZ-104', courseTitle: 'Azure Administrator', studentId: 5, studentName: 'Sara Idrissi', score: 95, completedAt: '2026-03-20T14:00:00', status: 'passed' as const },
  { id: 6, courseId: 'AWS-S3', courseTitle: 'AWS S3 Storage', studentId: 6, studentName: 'Omar Benjelloun', score: 68, completedAt: '2026-03-20T11:30:00', status: 'pending' as const },
  { id: 7, courseId: 'AZ-900', courseTitle: 'Azure Fundamentals', studentId: 7, studentName: 'Layla Tahiri', score: 88, completedAt: '2026-03-19T15:00:00', status: 'pending' as const },
  { id: 8, courseId: 'GCP-COMPUTE', courseTitle: 'GCP Compute Engine', studentId: 8, studentName: 'Hamza Fassi', score: 55, completedAt: '2026-03-19T09:30:00', status: 'pending' as const },
];

const ITEMS_PER_PAGE = 5;

export default function InstructorAssessmentsPage() {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [currentPage, setCurrentPage] = useState(1);

  const filteredAssessments = mockAssessments.filter(assessment => {
    const matchesSearch = 
      assessment.studentName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      assessment.courseTitle.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = filterStatus === 'all' || assessment.status === filterStatus;
    return matchesSearch && matchesStatus;
  });

  const totalPages = Math.ceil(filteredAssessments.length / ITEMS_PER_PAGE);
  const paginatedAssessments = filteredAssessments.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  );

  const formatDate = (date: string) => {
    const d = new Date(date);
    return d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return { icon: Clock, className: 'bg-amber-500/10 text-amber-600', label: 'En attente' };
      case 'reviewed':
        return { icon: Eye, className: 'bg-blue-500/10 text-blue-600', label: 'Revu' };
      case 'passed':
        return { icon: CheckCircle2, className: 'bg-emerald-500/10 text-emerald-600', label: 'Réussi' };
      case 'failed':
        return { icon: XCircle, className: 'bg-red-500/10 text-red-600', label: 'Échoué' };
      default:
        return { icon: Clock, className: 'bg-slate-500/10 text-slate-600', label: status };
    }
  };

  const pendingCount = mockAssessments.filter(a => a.status === 'pending').length;

  return (
    <div className="min-h-screen bg-muted/30 text-foreground w-full space-y-6 p-1">
      <div className="mb-6 p-4 bg-amber-50 border border-amber-200 rounded-xl flex items-center gap-3">
        <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0" />
        <div>
          <p className="text-sm font-medium text-amber-800">Module Instructeur - Bientôt disponible</p>
          <p className="text-xs text-amber-600">Les données affichées sont des exemples de démonstration.</p>
        </div>
      </div>

      <motion.div
        className="bg-card rounded-2xl p-8 border border-border shadow-md"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <p className="text-slate-500 text-sm mb-1">Évaluations</p>
            <h1 className="text-2xl md:text-3xl font-bold text-foreground flex items-center gap-3">
              <ClipboardList className="w-8 h-8 text-primary" />
              Quiz et Examens
              {pendingCount > 0 && (
                <span className="px-3 py-1 rounded-full text-sm font-semibold bg-amber-500/10 text-amber-600">
                  {pendingCount} en attente
                </span>
              )}
            </h1>
          </div>
          <div className="flex items-center gap-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <input
                type="text"
                placeholder="Rechercher..."
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value);
                  setCurrentPage(1);
                }}
                className="pl-10 pr-4 py-2 rounded-xl border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 w-64"
              />
            </div>
            <select
              value={filterStatus}
              onChange={(e) => {
                setFilterStatus(e.target.value);
                setCurrentPage(1);
              }}
              className="px-4 py-2 rounded-xl border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
            >
              <option value="all">Tous</option>
              <option value="pending">En attente</option>
              <option value="reviewed">Revu</option>
              <option value="passed">Réussi</option>
              <option value="failed">Échoué</option>
            </select>
          </div>
        </div>
      </motion.div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'En attente', count: mockAssessments.filter(a => a.status === 'pending').length, color: 'amber' },
          { label: 'Revus', count: mockAssessments.filter(a => a.status === 'reviewed').length, color: 'blue' },
          { label: 'Réussis', count: mockAssessments.filter(a => a.status === 'passed').length, color: 'emerald' },
          { label: 'Échoués', count: mockAssessments.filter(a => a.status === 'failed').length, color: 'red' },
        ].map((stat, index) => (
          <motion.div
            key={index}
            className="bg-card rounded-xl p-4 border border-border"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
          >
            <p className="text-sm text-muted-foreground">{stat.label}</p>
            <p className={`text-2xl font-bold text-${stat.color}-600`}>{stat.count}</p>
          </motion.div>
        ))}
      </div>

      <motion.div
        className="bg-card rounded-2xl border border-border shadow-sm overflow-hidden"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
      >
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border bg-muted/50">
                <th className="text-left p-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Étudiant</th>
                <th className="text-left p-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Cours</th>
                <th className="text-left p-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Score</th>
                <th className="text-left p-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Date</th>
                <th className="text-left p-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Status</th>
                <th className="text-left p-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody>
              {paginatedAssessments.map((assessment, index) => {
                const statusBadge = getStatusBadge(assessment.status);
                const StatusIcon = statusBadge.icon;
                return (
                  <motion.tr
                    key={assessment.id}
                    className="border-b border-border/50 hover:bg-muted/30 transition-colors"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: index * 0.05 }}
                  >
                    <td className="p-4">
                      <p className="font-medium text-foreground">{assessment.studentName}</p>
                    </td>
                    <td className="p-4 text-sm text-muted-foreground">
                      {assessment.courseTitle}
                    </td>
                    <td className="p-4">
                      <div className="flex items-center gap-2">
                        <div className="w-12 h-12 rounded-lg flex items-center justify-center font-bold text-sm bg-primary/10 text-primary">
                          {assessment.score}%
                        </div>
                      </div>
                    </td>
                    <td className="p-4 text-sm text-muted-foreground">
                      {formatDate(assessment.completedAt)}
                    </td>
                    <td className="p-4">
                      <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold ${statusBadge.className}`}>
                        <StatusIcon className="w-3 h-3" />
                        {statusBadge.label}
                      </span>
                    </td>
                    <td className="p-4">
                      <div className="flex items-center gap-2">
                        <button className="p-2 hover:bg-muted rounded-lg transition-colors">
                          <Eye className="w-4 h-4 text-muted-foreground" />
                        </button>
                      </div>
                    </td>
                  </motion.tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {filteredAssessments.length === 0 && (
          <div className="flex flex-col items-center justify-center py-12">
            <ClipboardList className="w-12 h-12 text-muted-foreground mb-4" />
            <p className="text-muted-foreground">Aucune évaluation trouvée.</p>
          </div>
        )}

        {totalPages > 1 && (
          <div className="flex items-center justify-between p-4 border-t border-border">
            <p className="text-sm text-muted-foreground">
              Affichage {((currentPage - 1) * ITEMS_PER_PAGE) + 1} - {Math.min(currentPage * ITEMS_PER_PAGE, filteredAssessments.length)} sur {filteredAssessments.length}
            </p>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="p-2 rounded-lg border border-border hover:bg-muted disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
                <button
                  key={page}
                  onClick={() => setCurrentPage(page)}
                  className={`w-8 h-8 rounded-lg text-sm font-medium transition-colors ${
                    currentPage === page
                      ? 'bg-primary text-primary-foreground'
                      : 'border border-border hover:bg-muted'
                  }`}
                >
                  {page}
                </button>
              ))}
              <button
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                className="p-2 rounded-lg border border-border hover:bg-muted disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </motion.div>
    </div>
  );
}
