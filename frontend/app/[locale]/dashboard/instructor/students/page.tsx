'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { Users, Search, Mail, BookOpen, ChevronLeft, ChevronRight, Eye, Filter, AlertTriangle } from 'lucide-react';

const mockStudents = [
  { id: 1, fullName: 'Ahmed Benali', email: 'ahmed.benali@email.com', enrolledCourses: 2, completedCourses: 1, averageProgress: 68, lastActivity: '2026-03-21T10:30:00' },
  { id: 2, fullName: 'Fatima Zahra', email: 'fatima.zahra@email.com', enrolledCourses: 3, completedCourses: 2, averageProgress: 85, lastActivity: '2026-03-21T09:15:00' },
  { id: 3, fullName: 'Karim Hamdani', email: 'karim.hamdani@email.com', enrolledCourses: 1, completedCourses: 0, averageProgress: 42, lastActivity: '2026-03-21T08:45:00' },
  { id: 4, fullName: 'Youssef Alaoui', email: 'youssef.alaoui@email.com', enrolledCourses: 2, completedCourses: 1, averageProgress: 55, lastActivity: '2026-03-20T16:20:00' },
  { id: 5, fullName: 'Sara Idrissi', email: 'sara.idrissi@email.com', enrolledCourses: 3, completedCourses: 3, averageProgress: 100, lastActivity: '2026-03-20T14:00:00' },
  { id: 6, fullName: 'Omar Benjelloun', email: 'omar.benjelloun@email.com', enrolledCourses: 1, completedCourses: 0, averageProgress: 25, lastActivity: '2026-03-19T11:30:00' },
  { id: 7, fullName: 'Layla Tahiri', email: 'layla.tahiri@email.com', enrolledCourses: 2, completedCourses: 1, averageProgress: 72, lastActivity: '2026-03-19T09:00:00' },
  { id: 8, fullName: 'Hamza Fassi', email: 'hamza.fassi@email.com', enrolledCourses: 1, completedCourses: 0, averageProgress: 38, lastActivity: '2026-03-18T15:45:00' },
];

const ITEMS_PER_PAGE = 5;

export default function InstructorStudentsPage() {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [currentPage, setCurrentPage] = useState(1);

  const filteredStudents = mockStudents.filter(student => {
    const matchesSearch = 
      student.fullName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      student.email.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = 
      filterStatus === 'all' ||
      (filterStatus === 'active' && student.averageProgress > 50) ||
      (filterStatus === 'inactive' && student.averageProgress <= 50);
    return matchesSearch && matchesStatus;
  });

  const totalPages = Math.ceil(filteredStudents.length / ITEMS_PER_PAGE);
  const paginatedStudents = filteredStudents.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  );

  const formatLastActivity = (date: string) => {
    const d = new Date(date);
    return d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });
  };

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
            <p className="text-slate-500 text-sm mb-1">Mes étudiants</p>
            <h1 className="text-2xl md:text-3xl font-bold text-foreground flex items-center gap-3">
              <Users className="w-8 h-8 text-primary" />
              Gestion des étudiants
            </h1>
          </div>
          <div className="flex items-center gap-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <input
                type="text"
                placeholder="Rechercher un étudiant..."
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
              <option value="all">Tous les status</option>
              <option value="active">Actifs</option>
              <option value="inactive">Inactifs</option>
            </select>
          </div>
        </div>
      </motion.div>

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
                <th className="text-left p-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Progression</th>
                <th className="text-left p-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Dernière activité</th>
                <th className="text-left p-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody>
              {paginatedStudents.map((student, index) => (
                <motion.tr
                  key={student.id}
                  className="border-b border-border/50 hover:bg-muted/30 transition-colors"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: index * 0.05 }}
                >
                  <td className="p-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl flex items-center justify-center font-semibold text-sm bg-primary text-primary-foreground">
                        {student.fullName.split(' ').map(n => n[0]).join('')}
                      </div>
                      <div>
                        <p className="font-medium text-foreground">{student.fullName}</p>
                        <p className="text-sm text-muted-foreground">{student.email}</p>
                      </div>
                    </div>
                  </td>
                  <td className="p-4">
                    <div className="flex items-center gap-4 text-sm">
                      <div className="flex items-center gap-1">
                        <BookOpen className="w-4 h-4 text-muted-foreground" />
                        <span>{student.enrolledCourses}</span>
                      </div>
                      <span className="text-muted-foreground">/</span>
                      <span className="text-emerald-600">{student.completedCourses}</span>
                    </div>
                  </td>
                  <td className="p-4">
                    <div className="flex items-center gap-2">
                      <div className="w-24 h-2 bg-muted rounded-full overflow-hidden">
                        <div 
                          className={`h-full rounded-full transition-all ${
                            student.averageProgress >= 75 ? 'bg-emerald-500' :
                            student.averageProgress >= 50 ? 'bg-amber-500' : 'bg-red-500'
                          }`}
                          style={{ width: `${student.averageProgress}%` }}
                        />
                      </div>
                      <span className="text-sm font-medium">{student.averageProgress}%</span>
                    </div>
                  </td>
                  <td className="p-4 text-sm text-muted-foreground">
                    {formatLastActivity(student.lastActivity)}
                  </td>
                  <td className="p-4">
                    <button className="p-2 hover:bg-muted rounded-lg transition-colors">
                      <Eye className="w-4 h-4 text-muted-foreground" />
                    </button>
                  </td>
                </motion.tr>
              ))}
            </tbody>
          </table>
        </div>

        {filteredStudents.length === 0 && (
          <div className="flex flex-col items-center justify-center py-12">
            <Users className="w-12 h-12 text-muted-foreground mb-4" />
            <p className="text-muted-foreground">Aucun étudiant trouvé.</p>
          </div>
        )}

        {totalPages > 1 && (
          <div className="flex items-center justify-between p-4 border-t border-border">
            <p className="text-sm text-muted-foreground">
              Affichage {((currentPage - 1) * ITEMS_PER_PAGE) + 1} - {Math.min(currentPage * ITEMS_PER_PAGE, filteredStudents.length)} sur {filteredStudents.length}
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
