'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { BarChart3, TrendingUp, Users, BookOpen, Award, Calendar, ChevronDown, AlertTriangle } from 'lucide-react';

const mockAnalyticsData = {
  enrollmentsByDay: [
    { date: '2026-03-15', count: 3 },
    { date: '2026-03-16', count: 5 },
    { date: '2026-03-17', count: 2 },
    { date: '2026-03-18', count: 4 },
    { date: '2026-03-19', count: 6 },
    { date: '2026-03-20', count: 8 },
    { date: '2026-03-21', count: 4 },
  ],
  completionsByDay: [
    { date: '2026-03-15', count: 1 },
    { date: '2026-03-16', count: 2 },
    { date: '2026-03-17', count: 0 },
    { date: '2026-03-18', count: 3 },
    { date: '2026-03-19', count: 2 },
    { date: '2026-03-20', count: 4 },
    { date: '2026-03-21', count: 2 },
  ],
  averageScores: [
    { courseId: 'AZ-900', courseTitle: 'Azure Fundamentals', average: 78 },
    { courseId: 'AWS-EC2', courseTitle: 'AWS EC2 Basics', average: 72 },
    { courseId: 'GCP-COMPUTE', courseTitle: 'GCP Compute Engine', average: 85 },
  ],
  topStudents: [
    { id: 1, name: 'Sara Idrissi', completedCourses: 3 },
    { id: 2, name: 'Fatima Zahra', completedCourses: 2 },
    { id: 3, name: 'Ahmed Benali', completedCourses: 1 },
    { id: 4, name: 'Youssef Alaoui', completedCourses: 1 },
    { id: 5, name: 'Layla Tahiri', completedCourses: 1 },
  ],
  summary: {
    totalEnrollments: 32,
    totalCompletions: 14,
    averageProgress: 67,
    averageScore: 78,
  }
};

export default function InstructorAnalyticsPage() {
  const [dateRange, setDateRange] = useState<string>('week');
  const [selectedCourse, setSelectedCourse] = useState<string>('all');

  const maxEnrollment = Math.max(...mockAnalyticsData.enrollmentsByDay.map(d => d.count));
  const maxCompletion = Math.max(...mockAnalyticsData.completionsByDay.map(d => d.count));
  const maxValue = Math.max(maxEnrollment, maxCompletion);

  const formatDate = (date: string) => {
    const d = new Date(date);
    return d.toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric' });
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
            <p className="text-slate-500 text-sm mb-1">Statistiques</p>
            <h1 className="text-2xl md:text-3xl font-bold text-foreground flex items-center gap-3">
              <BarChart3 className="w-8 h-8 text-primary" />
              Analytics
            </h1>
          </div>
          <div className="flex items-center gap-3">
            <select
              value={dateRange}
              onChange={(e) => setDateRange(e.target.value)}
              className="px-4 py-2 rounded-xl border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
            >
              <option value="week">Cette semaine</option>
              <option value="month">Ce mois</option>
              <option value="year">Cette année</option>
            </select>
            <select
              value={selectedCourse}
              onChange={(e) => setSelectedCourse(e.target.value)}
              className="px-4 py-2 rounded-xl border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
            >
              <option value="all">Tous les cours</option>
              <option value="AZ-900">Azure Fundamentals</option>
              <option value="AWS-EC2">AWS EC2 Basics</option>
              <option value="GCP-COMPUTE">GCP Compute Engine</option>
            </select>
          </div>
        </div>
      </motion.div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Inscriptions totales', value: mockAnalyticsData.summary.totalEnrollments, icon: Users, color: '#8b5cf6' },
          { label: 'Formations terminées', value: mockAnalyticsData.summary.totalCompletions, icon: Award, color: '#10b981' },
          { label: 'Progression moyenne', value: `${mockAnalyticsData.summary.averageProgress}%`, icon: TrendingUp, color: '#3b82f6' },
          { label: 'Score moyen', value: `${mockAnalyticsData.summary.averageScore}%`, icon: BookOpen, color: '#f59e0b' },
        ].map((stat, index) => (
          <motion.div
            key={index}
            className="bg-card rounded-xl p-6 border border-border"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
          >
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ background: `${stat.color}20`, color: stat.color }}>
                <stat.icon className="w-5 h-5" />
              </div>
              <span className="text-sm text-muted-foreground">{stat.label}</span>
            </div>
            <p className="text-2xl font-bold text-foreground">{stat.value}</p>
          </motion.div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <motion.div
          className="bg-card rounded-2xl p-6 border border-border shadow-sm"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-bold text-foreground">Inscriptions par jour</h2>
            <div className="flex items-center gap-4 text-sm">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-purple-500" />
                <span className="text-muted-foreground">Inscriptions</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-emerald-500" />
                <span className="text-muted-foreground">Terminées</span>
              </div>
            </div>
          </div>
          <div className="h-64 flex items-end justify-between gap-2">
            {mockAnalyticsData.enrollmentsByDay.map((day, index) => (
              <div key={index} className="flex-1 flex flex-col items-center gap-2">
                <div className="w-full flex flex-col gap-1" style={{ height: '180px' }}>
                  <motion.div
                    className="w-full bg-purple-500/20 rounded-t-md relative"
                    initial={{ height: 0 }}
                    animate={{ height: `${(day.count / maxValue) * 100}%` }}
                    transition={{ delay: index * 0.1, duration: 0.5 }}
                  >
                    <div className="absolute -top-6 left-1/2 -translate-x-1/2 text-xs font-medium text-purple-600">
                      {day.count}
                    </div>
                  </motion.div>
                  <motion.div
                    className="w-full bg-emerald-500/20 rounded-t-md relative"
                    initial={{ height: 0 }}
                    animate={{ height: `${(mockAnalyticsData.completionsByDay[index].count / maxValue) * 100}%` }}
                    transition={{ delay: index * 0.1 + 0.2, duration: 0.5 }}
                  >
                    <div className="absolute -top-6 left-1/2 -translate-x-1/2 text-xs font-medium text-emerald-600">
                      {mockAnalyticsData.completionsByDay[index].count}
                    </div>
                  </motion.div>
                </div>
                <span className="text-xs text-muted-foreground">{formatDate(day.date)}</span>
              </div>
            ))}
          </div>
        </motion.div>

        <motion.div
          className="bg-card rounded-2xl p-6 border border-border shadow-sm"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <h2 className="text-xl font-bold text-foreground mb-6">Score moyen par cours</h2>
          <div className="space-y-4">
            {mockAnalyticsData.averageScores.map((course, index) => (
              <div key={index} className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="font-medium text-foreground truncate pr-4">{course.courseTitle}</span>
                  <span className="font-semibold text-foreground">{course.average}%</span>
                </div>
                <div className="h-3 bg-muted rounded-full overflow-hidden">
                  <motion.div
                    className={`h-full rounded-full ${
                      course.average >= 75 ? 'bg-emerald-500' :
                      course.average >= 50 ? 'bg-amber-500' : 'bg-red-500'
                    }`}
                    initial={{ width: 0 }}
                    animate={{ width: `${course.average}%` }}
                    transition={{ delay: index * 0.2, duration: 0.8 }}
                  />
                </div>
              </div>
            ))}
          </div>
        </motion.div>
      </div>

      <motion.div
        className="bg-card rounded-2xl p-6 border border-border shadow-sm"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
      >
        <h2 className="text-xl font-bold text-foreground mb-6">Top 5 Étudiants</h2>
        <div className="space-y-3">
          {mockAnalyticsData.topStudents.map((student, index) => (
            <motion.div
              key={student.id}
              className="flex items-center gap-4 p-4 bg-muted/50 rounded-xl border border-border"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.5 + index * 0.1 }}
            >
              <div className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold text-sm ${
                index === 0 ? 'bg-amber-500/20 text-amber-600' :
                index === 1 ? 'bg-slate-400/20 text-slate-600' :
                index === 2 ? 'bg-orange-500/20 text-orange-600' :
                'bg-muted text-muted-foreground'
              }`}>
                #{index + 1}
              </div>
              <div className="flex-1">
                <p className="font-medium text-foreground">{student.name}</p>
              </div>
              <div className="flex items-center gap-2">
                <Award className="w-4 h-4 text-emerald-600" />
                <span className="text-sm font-semibold text-emerald-600">{student.completedCourses} terminés</span>
              </div>
            </motion.div>
          ))}
        </div>
      </motion.div>
    </div>
  );
}
