'use client';

import { useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { motion } from 'framer-motion';
import { BookOpen, Users, TrendingUp, ChevronRight, Search, Filter, AlertTriangle } from 'lucide-react';

const mockCourses = [
  { id: 'AZ-900', title: 'Azure Fundamentals AZ-900', enrolled: 24, completed: 8, progress: 68, level: 'Beginner' },
  { id: 'AWS-EC2', title: 'AWS EC2 Basics', enrolled: 18, completed: 5, progress: 45, level: 'Intermediate' },
  { id: 'GCP-COMPUTE', title: 'GCP Compute Engine', enrolled: 12, completed: 6, progress: 82, level: 'Advanced' },
  { id: 'AZ-104', title: 'Azure Administrator AZ-104', enrolled: 8, completed: 2, progress: 35, level: 'Advanced' },
  { id: 'AWS-S3', title: 'AWS S3 Storage', enrolled: 15, completed: 4, progress: 52, level: 'Intermediate' },
];

export default function InstructorCoursesPage() {
  const router = useRouter();
  const pathname = usePathname();
  const locale = pathname?.split('/')[1] ?? 'en';
  const [searchTerm, setSearchTerm] = useState('');
  const [filterLevel, setFilterLevel] = useState<string>('all');

  const filteredCourses = mockCourses.filter(course => {
    const matchesSearch = course.title.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesLevel = filterLevel === 'all' || course.level === filterLevel;
    return matchesSearch && matchesLevel;
  });

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
            <p className="text-slate-500 text-sm mb-1">Mes cours</p>
            <h1 className="text-2xl md:text-3xl font-bold text-foreground flex items-center gap-3">
              <BookOpen className="w-8 h-8 text-primary" />
              Cours assignés
            </h1>
          </div>
          <div className="flex items-center gap-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <input
                type="text"
                placeholder="Rechercher un cours..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 pr-4 py-2 rounded-xl border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 w-64"
              />
            </div>
            <select
              value={filterLevel}
              onChange={(e) => setFilterLevel(e.target.value)}
              className="px-4 py-2 rounded-xl border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
            >
              <option value="all">Tous niveaux</option>
              <option value="Beginner">Débutant</option>
              <option value="Intermediate">Intermédiaire</option>
              <option value="Advanced">Avancé</option>
            </select>
          </div>
        </div>
      </motion.div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredCourses.map((course, index) => (
          <motion.div
            key={course.id}
            className="bg-card rounded-2xl p-6 border border-border shadow-sm hover:shadow-lg hover:border-primary/30 transition-all cursor-pointer"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
            onClick={() => router.push(`/${locale}/dashboard/instructor/courses/${course.id}`)}
          >
            <div className="flex items-start justify-between mb-4">
              <div className="w-14 h-14 rounded-xl flex items-center justify-center bg-purple-500/10 text-purple-600">
                <BookOpen className="w-7 h-7" />
              </div>
              <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                course.level === 'Beginner' ? 'bg-emerald-500/10 text-emerald-600' :
                course.level === 'Intermediate' ? 'bg-amber-500/10 text-amber-600' :
                'bg-red-500/10 text-red-600'
              }`}>
                {course.level === 'Beginner' ? 'Débutant' :
                 course.level === 'Intermediate' ? 'Intermédiaire' : 'Avancé'}
              </span>
            </div>
            <h3 className="text-lg font-bold text-foreground mb-2">{course.title}</h3>
            <div className="space-y-3">
              <div className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Users className="w-4 h-4" />
                  <span>{course.enrolled} inscrits</span>
                </div>
                <div className="flex items-center gap-2 text-muted-foreground">
                  <TrendingUp className="w-4 h-4" />
                  <span>{course.completed} terminés</span>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-primary rounded-full transition-all duration-500"
                    style={{ width: `${course.progress}%` }}
                  />
                </div>
                <span className="text-sm font-semibold text-foreground">{course.progress}%</span>
              </div>
            </div>
            <div className="mt-4 pt-4 border-t border-border">
              <button className="flex items-center gap-2 text-primary text-sm font-medium hover:text-primary/80 transition-colors">
                Voir les détails <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </motion.div>
        ))}
      </div>

      {filteredCourses.length === 0 && (
        <div className="flex flex-col items-center justify-center py-12 bg-card rounded-2xl border border-border">
          <BookOpen className="w-12 h-12 text-muted-foreground mb-4" />
          <p className="text-muted-foreground">Aucun cours trouvé.</p>
        </div>
      )}
    </div>
  );
}
