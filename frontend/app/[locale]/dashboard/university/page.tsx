'use client';

import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { Skeleton } from '@/components/ui/skeleton';
import {
  GraduationCap,
  Users,
  Mail,
  CreditCard,
  Plus,
  TrendingUp,
  ChevronRight,
  BookOpen,
  Clock,
  CheckCircle2,
  AlertCircle,
} from 'lucide-react';
import { useUniversityDashboard, useUniversityStudents, useUniversityInvites } from '@/hooks/api/useUniversity';
import { useTranslation } from '@/contexts/LanguageContext';


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

export default function UniversityDashboardPage() {

  const router = useRouter();
  const pathname = usePathname();
  const locale = pathname?.split('/')[1] ?? 'en';
  const { t } = useTranslation();

  const { data, isLoading, isError } = useUniversityDashboard();
  const { data: studentsData } = useUniversityStudents({ limit: 5 });
  const { data: invitesData } = useUniversityInvites();
  const recentStudents = studentsData?.data ?? (Array.isArray(studentsData) ? studentsData : []);
  const recentInvites = Array.isArray(invitesData) ? invitesData.slice(0, 5) : invitesData?.data?.slice(0, 5) ?? [];

  if (isError) return <p className="text-destructive">Impossible de charger le tableau de bord</p>;
  if (isLoading || !data) return (
    <div className="space-y-6 p-6">
      <Skeleton className="h-8 w-64" />
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[1,2,3,4].map(i => <Skeleton key={i} className="h-24 rounded-xl" />)}
      </div>
      <Skeleton className="h-48 rounded-xl" />
    </div>
  );

  const stats = [
    {
      title: 'Étudiants',
      value: data.studentsCount ?? data.enrollmentsCount ?? 0,
      icon: GraduationCap,
      color: '#8b5cf6',
      isPositive: true,
    },
    {
      title: 'Membres actifs',
      value: data.activeMembers ?? data.staffCount ?? 0,
      icon: Users,
      color: '#3b82f6',
      isPositive: true,
    },
    {
      title: 'Cohortes',
      value: data.cohortsCount ?? 0,
      icon: BookOpen,
      color: '#10b981',
      isPositive: true,
    },
    {
      title: 'Invitations en attente',
      value: data.pendingInvites ?? 0,
      icon: Mail,
      color: '#f59e0b',
      isPositive: false,
    },
  ];

  const quickActions = [
    { title: 'Inviter un étudiant', icon: <Plus size={20} />, color: 'purple', onClick: () => router.push(`/${locale}/dashboard/university/invites`) },
    { title: 'Gérer les cohortes', icon: <Users size={20} />, color: 'blue', onClick: () => router.push(`/${locale}/dashboard/university/cohorts`) },
    { title: 'Gérer les licences', icon: <CreditCard size={20} />, color: 'green', onClick: () => router.push(`/${locale}/dashboard/university/licenses`) },
    { title: 'Voir les étudiants', icon: <GraduationCap size={20} />, color: 'orange', onClick: () => router.push(`/${locale}/dashboard/university/students`) },
  ];

  const getRelativeTime = (dateString: string): string => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffSec = Math.floor(diffMs / 1000);
    const diffMin = Math.floor(diffSec / 60);
    const diffHour = Math.floor(diffMin / 60);
    const diffDay = Math.floor(diffHour / 24);
    if (diffDay > 0) return `${diffDay}j`;
    if (diffHour > 0) return `${diffHour}h`;
    if (diffMin > 0) return `${diffMin}m`;
    return 'à l\'instant';
  };

  return (
    <div className="min-h-screen bg-muted/30 text-foreground w-full space-y-6 p-4 md:p-6">
      <motion.div
        className="bg-card rounded-2xl p-6 border border-border shadow-md relative overflow-hidden"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <p className="text-muted-foreground text-sm mb-1">{t('universityDashboard.title')}</p>
            <h1 className="text-2xl md:text-3xl font-bold text-foreground flex items-center gap-3">
              <GraduationCap className="w-8 h-8 text-primary" />
              {t('universityDashboard.welcome')}
            </h1>
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
              <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold ${
                stat.isPositive ? 'bg-emerald-500/10 text-emerald-600' : 'bg-amber-500/10 text-amber-600'
              }`}>
                {stat.isPositive ? <TrendingUp className="w-3 h-3" /> : <AlertCircle className="w-3 h-3" />}
              </span>
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
            <h2 className="text-xl font-bold text-foreground">{t('universityDashboard.licenses')}</h2>
            <Link href={`/${locale}/dashboard/university/licenses`} className="text-primary text-sm font-medium flex items-center gap-1 transition-colors hover:text-primary/80">
              Détails <ChevronRight className="w-4 h-4" />
            </Link>
          </div>
          {(data.licenses ?? []).length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <CreditCard className="w-12 h-12 text-muted-foreground mb-4" />
              <p className="text-muted-foreground">Aucune licence assignée pour le moment.</p>
              <p className="text-sm text-muted-foreground mt-1">Contactez l'administrateur pour obtenir des licences.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {(data.licenses ?? []).map((licenseRaw: Record<string, unknown>, index: number) => {
                const license = licenseRaw as { planName?: string; seatsUsed: number; seatsTotal: number; status: string };
                return (
                <motion.div
                  key={index}
                  className="flex items-center justify-between p-4 bg-muted/50 rounded-xl border border-border"
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.4 + index * 0.1 }}
                >
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-primary/10 text-primary">
                      <CreditCard className="w-5 h-5" />
                    </div>
                    <div>
                      <p className="font-semibold text-foreground">{license.planName || 'Plan Standard'}</p>
                      <p className="text-sm text-muted-foreground">
                        {license.seatsUsed} / {license.seatsTotal} sièges utilisés
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="w-32 h-2 bg-muted rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-primary rounded-full transition-all duration-500"
                        style={{ width: `${(license.seatsUsed / license.seatsTotal) * 100}%` }}
                      />
                    </div>
                    <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold ${
                      license.status === 'active' ? 'bg-emerald-500/10 text-emerald-600' : 'bg-amber-500/10 text-amber-600'
                    }`}>
                      {license.status === 'active' ? <CheckCircle2 className="w-3 h-3" /> : <Clock className="w-3 h-3" />}
                      {license.status}
                    </span>
                  </div>
                </motion.div>
                );
              })}
            </div>
          )}
        </motion.div>

        <motion.div
          className="bg-card rounded-2xl p-6 border border-border shadow-sm"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
        >
          <h2 className="text-xl font-bold text-foreground mb-4">{t('universityDashboard.quickActions')}</h2>
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



      {/* Recent Students */}
      <motion.div
        className="bg-card rounded-2xl p-6 border border-border shadow-sm"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.6 }}
      >
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-bold text-foreground">{t('universityDashboard.recentStudents')}</h2>
          <Link href={`/${locale}/dashboard/university/students`} className="text-primary text-sm font-medium flex items-center gap-1 transition-colors hover:text-primary/80">
            Voir tout <ChevronRight className="w-4 h-4" />
          </Link>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left p-3 text-sm font-medium text-muted-foreground">Étudiant</th>
                <th className="text-left p-3 text-sm font-medium text-muted-foreground">Programme</th>
                <th className="text-left p-3 text-sm font-medium text-muted-foreground">Statut</th>
                <th className="text-left p-3 text-sm font-medium text-muted-foreground">Progression</th>
                <th className="text-left p-3 text-sm font-medium text-muted-foreground">Inscrit</th>
              </tr>
            </thead>
            <tbody>
              {recentStudents.length === 0 ? (
                <tr>
                  <td colSpan={5} className="p-8 text-center text-muted-foreground">Aucun étudiant récent</td>
                </tr>
              ) : (
                recentStudents.map((student: any) => (
                  <tr key={student.enrollmentId} className="border-b border-border/50 hover:bg-muted/50">
                    <td className="p-3">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-gradient-to-br from-primary to-accent text-primary-foreground font-semibold text-sm">
                          {(student.fullName || student.email || '?').split(' ').map((n: string) => n[0]).filter(Boolean).join('').substring(0, 2).toUpperCase()}
                        </div>
                        <div>
                          <p className="font-medium text-foreground">{student.fullName || '-'}</p>
                          <p className="text-sm text-muted-foreground">{student.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="p-3 text-sm text-foreground">{student.program?.title || '-'}</td>
                    <td className="p-3">
                      <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold ${
                        student.status === 'active' ? 'bg-emerald-500/10 text-emerald-600' :
                        student.status === 'completed' ? 'bg-blue-500/10 text-blue-600' :
                        student.status === 'pending' ? 'bg-amber-500/10 text-amber-600' :
                        'bg-slate-500/10 text-slate-600'
                      }`}>
                        {student.status}
                      </span>
                    </td>
                    <td className="p-3">
                      <div className="flex items-center gap-2">
                        <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                          <div
                            className="h-full bg-gradient-to-r from-primary to-accent rounded-full transition-all"
                            style={{ width: `${student.progress}%` }}
                          />
                        </div>
                        <span className="text-sm font-medium text-foreground">{student.progress}%</span>
                      </div>
                    </td>
                    <td className="p-3 text-sm text-muted-foreground">
                      {student.enrolledAt ? getRelativeTime(student.enrolledAt) : '-'}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </motion.div>

      {/* Recent Invites */}
      <motion.div
        className="bg-card rounded-2xl p-6 border border-border shadow-sm"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.7 }}
      >
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-bold text-foreground">{t('universityDashboard.recentInvites')}</h2>
          <Link href={`/${locale}/dashboard/university/invites`} className="text-primary text-sm font-medium flex items-center gap-1 transition-colors hover:text-primary/80">
            Voir tout <ChevronRight className="w-4 h-4" />
          </Link>
        </div>
        <div className="space-y-3">
          {recentInvites.length === 0 ? (
            <p className="text-muted-foreground text-sm">Aucune invitation récente</p>
          ) : (
            recentInvites.map((invite: any) => (
              <div key={invite.id} className="flex items-center gap-4 p-4 bg-muted/50 rounded-xl border border-border">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-primary/10 text-primary">
                  <Mail className="w-5 h-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-foreground truncate">{invite.email}</p>
                  <p className="text-sm text-muted-foreground">
                    {invite.status === 'pending' ? 'En attente' : invite.status}
                    {invite.expiresAt && ` • Expire ${getRelativeTime(invite.expiresAt)}`}
                  </p>
                </div>
                <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold ${
                  invite.status === 'pending' ? 'bg-amber-500/10 text-amber-600' : 'bg-emerald-500/10 text-emerald-600'
                }`}>
                  {invite.status}
                </span>
              </div>
            ))
          )}
        </div>
      </motion.div>

    </div>
  );
}
