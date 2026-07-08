'use client';

import { useState, useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { motion } from 'framer-motion';
import { 
  LayoutDashboard, 
  Users, 
  BookOpen, 
  ClipboardList,
  TrendingUp,
  MessageSquare,
  Plus,
  ChevronRight,
  Clock,
  CheckCircle2,
  AlertCircle,
  BarChart3
} from 'lucide-react';
import { useToast } from '@/components/ui';

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.1 }
  }
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.5 } }
};

const mockDashboardData = {
  totalStudents: 47,
  activeCourses: 5,
  pendingAssessments: 12,
  unreadMessages: 3,
  recentActivity: [
    { id: 1, type: 'enrollment' as const, description: 'Ahmed Benali s\'est inscrit au cours AZ-900', timestamp: '2026-03-21T10:30:00' },
    { id: 2, type: 'completion' as const, description: 'Fatima Zahra a terminé le cours Azure Fundamentals', timestamp: '2026-03-21T09:15:00' },
    { id: 3, type: 'assessment' as const, description: 'Nouveau quiz soumis par Karim Hamdani', timestamp: '2026-03-21T08:45:00' },
    { id: 4, type: 'enrollment' as const, description: 'Youssef Alaoui s\'est inscrit au cours AWS EC2', timestamp: '2026-03-20T16:20:00' },
    { id: 5, type: 'completion' as const, description: 'Sara Idrissi a terminé le quiz GCP Compute', timestamp: '2026-03-20T14:00:00' },
  ]
};

export default function InstructorDashboardPage() {
  const router = useRouter();
  const pathname = usePathname();
  const locale = pathname?.split('/')[1] ?? 'en';
  const { showToast } = useToast();
  const [dateFilter, setDateFilter] = useState<'today' | 'week' | 'month'>('week');

  const data = mockDashboardData;

  const stats = [
    {
      title: 'Étudiants',
      value: data.totalStudents,
      icon: Users,
      color: '#8b5cf6',
      change: '+12%',
      isPositive: true,
    },
    {
      title: 'Cours actifs',
      value: data.activeCourses,
      icon: BookOpen,
      color: '#3b82f6',
      change: '',
      isPositive: true,
    },
    {
      title: 'Évaluations en attente',
      value: data.pendingAssessments,
      icon: ClipboardList,
      color: '#f59e0b',
      change: '',
      isPositive: false,
    },
    {
      title: 'Messages non lus',
      value: data.unreadMessages,
      icon: MessageSquare,
      color: '#10b981',
      change: '',
      isPositive: true,
    },
  ];

  const quickActions = [
    { title: 'Voir mes cours', icon: <BookOpen size={20} />, color: 'purple', onClick: () => router.push(`/${locale}/dashboard/instructor/courses`) },
    { title: 'Gérer les étudiants', icon: <Users size={20} />, color: 'blue', onClick: () => router.push(`/${locale}/dashboard/instructor/students`) },
    { title: 'Évaluer les quiz', icon: <ClipboardList size={20} />, color: 'orange', onClick: () => router.push(`/${locale}/dashboard/instructor/assessments`) },
    { title: 'Voir les analytics', icon: <BarChart3 size={20} />, color: 'green', onClick: () => router.push(`/${locale}/dashboard/instructor/analytics`) },
  ];

  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'enrollment':
        return Users;
      case 'completion':
        return CheckCircle2;
      case 'assessment':
        return ClipboardList;
      default:
        return Clock;
    }
  };

  const getActivityColor = (type: string) => {
    switch (type) {
      case 'enrollment':
        return 'bg-blue-500/10 text-blue-600';
      case 'completion':
        return 'bg-emerald-500/10 text-emerald-600';
      case 'assessment':
        return 'bg-amber-500/10 text-amber-600';
      default:
        return 'bg-slate-500/10 text-slate-600';
    }
  };

  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffHours / 24);
    
    if (diffHours < 1) return 'À l\'instant';
    if (diffHours < 24) return `Il y a ${diffHours}h`;
    if (diffDays < 7) return `Il y a ${diffDays}j`;
    return date.toLocaleDateString('fr-FR');
  };

  return (
    <div className="min-h-screen bg-muted/30 text-foreground w-full space-y-6 p-1">
      <motion.div
        className="bg-card rounded-2xl p-8 border border-border shadow-md relative overflow-hidden"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <p className="text-slate-500 text-sm mb-1">Espace Instructeur</p>
            <h1 className="text-2xl md:text-3xl font-bold text-foreground flex items-center gap-3">
              <span className="text-3xl">&#128218;</span>
              Bienvenue, Instructeur !
            </h1>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex gap-2 p-1 rounded-xl border border-border bg-muted/50 w-fit">
              {(['today', 'week', 'month'] as const).map((filter) => (
                <button
                  key={filter}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-all cursor-pointer border-none ${
                    dateFilter === filter
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-transparent text-muted-foreground'
                  }`}
                  onClick={() => setDateFilter(filter)}
                >
                  {filter === 'today' ? "Aujourd'hui" : filter === 'week' ? 'Cette semaine' : 'Ce mois'}
                </button>
              ))}
            </div>
          </div>
        </div>
      </motion.div>

      <motion.div
        className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6"
        variants={containerVariants}
        initial="hidden"
        animate="visible"
      >
        {stats.map((stat, index) => (
          <motion.div
            key={index}
            className="bg-card rounded-2xl p-6 border border-border shadow-sm relative overflow-hidden transition-all duration-300 hover:-translate-y-1 hover:shadow-lg hover:border-primary/30"
            variants={itemVariants}
            whileHover="hover"
            initial="rest"
          >
            <div className="flex items-start justify-between mb-4">
              <div className="w-14 h-14 rounded-xl flex items-center justify-center" style={{ background: `${stat.color}20`, color: stat.color }}>
                <stat.icon className="w-6 h-6" />
              </div>
              {stat.change && (
                <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold ${
                  stat.isPositive ? 'bg-emerald-500/10 text-emerald-600' : 'bg-amber-500/10 text-amber-600'
                }`}>
                  {stat.isPositive ? <TrendingUp className="w-3 h-3" /> : <AlertCircle className="w-3 h-3" />}
                  {stat.change}
                </span>
              )}
            </div>
            <div>
              <motion.h3
                className="text-3xl font-extrabold tracking-tight text-foreground"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.3 + index * 0.1 }}
              >
                {stat.value}
              </motion.h3>
              <p className="text-slate-500 text-sm mt-1">{stat.title}</p>
            </div>
          </motion.div>
        ))}
      </motion.div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <motion.div
          className="lg:col-span-2 bg-card rounded-2xl p-6 border border-border shadow-sm"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-bold text-foreground">Activité récente</h2>
            <button className="text-primary text-sm font-medium flex items-center gap-1 transition-colors hover:text-primary/80">
              Voir tout <ChevronRight className="w-4 h-4" />
            </button>
          </div>
          <div className="flex flex-col gap-3">
            {data.recentActivity.map((activity, index) => {
              const Icon = getActivityIcon(activity.type);
              return (
                <motion.div
                  key={activity.id}
                  className="flex items-center gap-4 p-4 bg-muted/50 rounded-xl transition-all cursor-pointer border border-transparent hover:bg-muted hover:border-border hover:translate-x-1"
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.4 + index * 0.1 }}
                >
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${getActivityColor(activity.type)}`}>
                    <Icon className="w-5 h-5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground">{activity.description}</p>
                  </div>
                  <span className="text-xs text-muted-foreground whitespace-nowrap">
                    {formatTimestamp(activity.timestamp)}
                  </span>
                </motion.div>
              );
            })}
          </div>
        </motion.div>

        <motion.div
          className="bg-card rounded-2xl p-6 border border-border shadow-sm"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
        >
          <h2 className="text-xl font-bold text-foreground mb-4">Actions rapides</h2>
          <div className="space-y-3">
            {quickActions.map((action, index) => (
              <motion.button
                key={index}
                className="flex items-center gap-3 w-full p-4 bg-muted/50 border border-border rounded-xl text-foreground font-medium transition-all cursor-pointer hover:bg-muted hover:border-primary/30 hover:translate-x-1 hover:shadow-md"
                onClick={action.onClick}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.5 + index * 0.1 }}
                whileHover={{ x: 4 }}
              >
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${
                  action.color === 'purple' ? 'bg-purple-500/10 text-purple-600' :
                  action.color === 'blue' ? 'bg-blue-500/10 text-blue-600' :
                  action.color === 'green' ? 'bg-emerald-500/10 text-emerald-600' :
                  'bg-amber-500/10 text-amber-600'
                }`}>
                  {action.icon}
                </div>
                <span className="text-sm font-medium">{action.title}</span>
                <ChevronRight className="w-4 h-4 ml-auto text-slate-500" />
              </motion.button>
            ))}
          </div>
        </motion.div>
      </div>

      <motion.div
        className="bg-card rounded-2xl p-6 border border-border shadow-sm"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5 }}
      >
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-bold text-foreground">Performance des cours</h2>
          <button className="text-primary text-sm font-medium flex items-center gap-1 transition-colors hover:text-primary/80">
            Détails <ChevronRight className="w-4 h-4" />
          </button>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[
            { title: 'AZ-900 Azure Fundamentals', enrolled: 24, progress: 68 },
            { title: 'AWS EC2 Basics', enrolled: 18, progress: 45 },
            { title: 'GCP Compute Engine', enrolled: 12, progress: 82 },
          ].map((course, index) => (
            <motion.div
              key={index}
              className="p-4 bg-muted/50 rounded-xl border border-border"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.6 + index * 0.1 }}
            >
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-purple-500/10 text-purple-600">
                  <BookOpen className="w-5 h-5" />
                </div>
                <span className="text-sm text-muted-foreground">{course.enrolled} inscrits</span>
              </div>
              <p className="font-semibold text-foreground mb-2 truncate">{course.title}</p>
              <div className="flex items-center gap-2">
                <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-primary rounded-full transition-all duration-500"
                    style={{ width: `${course.progress}%` }}
                  />
                </div>
                <span className="text-sm font-medium text-foreground">{course.progress}%</span>
              </div>
            </motion.div>
          ))}
        </div>
      </motion.div>
    </div>
  );
}
