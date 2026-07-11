'use client';

import Link from 'next/link';
import { useRouter, usePathname } from 'next/navigation';
import { useState, useEffect } from 'react';
import { toast } from 'sonner';

import {
  Bell,
  Settings,
  ChevronDown,
  User,
  LogOut,
  Moon,
  Sun,
} from 'lucide-react';
import LanguageSwitcher from '@/components/shared/LanguageSwitcher';
import { useTranslation } from '@/contexts/LanguageContext';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { useNotifications } from '@/contexts/NotificationsContext';
import { localeFromPathname } from '@/lib/i18n/config';

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

interface DashboardHeaderProps {
  userName: string;
  role: 'admin' | 'student' | 'employer' | 'university' | 'instructor' | 'commercial';
  showSearch?: boolean; // kept for API compat, unused
}

const pageTitles: Record<string, { titleKey: string; subtitleKey: string }> = {
  '/dashboard/learner': { titleKey: 'navbar.studentTitle', subtitleKey: '' },
  '/dashboard/learner/goals': { titleKey: 'navigation.myGoals', subtitleKey: '' },
  '/dashboard/learner/roadmap': { titleKey: 'navigation.roadmap', subtitleKey: '' },
  '/dashboard/learner/cours': { titleKey: 'learnerCourses.myCourses', subtitleKey: '' },
  '/dashboard/learner/labs/aws-ec2': { titleKey: 'navigation.awsEc2', subtitleKey: '' },
  '/dashboard/learner/labs/azure-az900': { titleKey: 'navigation.azureAz900', subtitleKey: '' },
  '/dashboard/learner/labs': { titleKey: 'navigation.labs', subtitleKey: '' },
  '/dashboard/learner/hr-coach': { titleKey: 'navigation.subulHrCoach', subtitleKey: '' },
  '/dashboard/learner/technical-coach': { titleKey: 'navigation.subulTechnicalCoach', subtitleKey: '' },
  '/dashboard/learner/examens': { titleKey: 'learnerExams.title', subtitleKey: 'learnerExams.subtitle' },
  '/dashboard/learner/certifications': { titleKey: 'learnerCertifications.hub', subtitleKey: '' },
  '/dashboard/learner/emploi': { titleKey: 'navigation.jobs', subtitleKey: 'learnerJobs.subtitle' },
  '/dashboard/learner/profile': { titleKey: 'common.profile', subtitleKey: '' },

  '/dashboard/admin': {
    titleKey: 'adminDashboard.title',
    subtitleKey: 'adminDashboard.subtitle',
  },
  '/dashboard/admin/payments': {
    titleKey: 'payments.title',
    subtitleKey: 'payments.subtitle',
  },
  '/dashboard/admin/users': {
    titleKey: 'users.title',
    subtitleKey: 'users.subtitle',
  },
  '/dashboard/admin/hr-calendar': {
    titleKey: 'adminHrCalendar.title',
    subtitleKey: 'adminHrCalendar.subtitle',
  },
  '/dashboard/admin/analytics': {
    titleKey: 'analytics.title',
    subtitleKey: 'analytics.subtitle',
  },
  '/dashboard/admin/courses': {
    titleKey: 'courses.title',
    subtitleKey: 'courses.subtitle',
  },
  '/dashboard/admin/certifications': {
    titleKey: 'certifications.title',
    subtitleKey: 'certifications.subtitle',
  },
  '/dashboard/admin/content/indexing': {
    titleKey: 'navigation.contentIndexing',
    subtitleKey: 'adminDashboard.subtitle',
  },
  '/dashboard/admin/content/import': {
    titleKey: 'navigation.contentImportHub',
    subtitleKey: 'adminDashboard.subtitle',
  },
  '/dashboard/admin/content/practice-exams': {
    titleKey: 'navigation.practiceExams',
    subtitleKey: 'adminDashboard.subtitle',
  },
  '/dashboard/admin/content/certification-paths': {
    titleKey: 'navigation.certificationPaths',
    subtitleKey: 'adminDashboard.subtitle',
  },
  '/dashboard/admin/instructors': {
    titleKey: 'instructors.title',
    subtitleKey: 'instructors.subtitle',
  },
  '/dashboard/admin/feedback': {
    titleKey: 'feedback.title',
    subtitleKey: 'feedback.subtitle',
  },
  '/dashboard/admin/settings': {
    titleKey: 'settings.title',
    subtitleKey: 'settings.subtitle',
  },
  '/dashboard/admin/progression': {
    titleKey: 'progression.title',
    subtitleKey: 'progression.subtitle',
  },
  '/dashboard/admin/jobs': {
    titleKey: 'jobs.title',
    subtitleKey: 'jobs.subtitle',
  },
  '/dashboard/admin/companies': {
    titleKey: 'companies.title',
    subtitleKey: 'companies.subtitle',
  },
  '/dashboard/university': {
    titleKey: 'universityDashboard.title',
    subtitleKey: '',
  },
  '/dashboard/university/programs': {
    titleKey: 'universityPrograms.title',
    subtitleKey: '',
  },
  '/dashboard/university/students': {
    titleKey: 'universityStudents.title',
    subtitleKey: '',
  },
  '/dashboard/university/invites': {
    titleKey: 'universityInvites.title',
    subtitleKey: '',
  },
  '/dashboard/university/licenses': {
    titleKey: 'universityLicenses.title',
    subtitleKey: '',
  },
};

export default function DashboardHeader({ userName, role }: DashboardHeaderProps) {
  const { t } = useTranslation();
  const router = useRouter();
  const pathname = usePathname();
  const { logout } = useAuth();
  const { lastNotification } = useNotifications();
  const [hasUnread, setHasUnread] = useState(false);
  const [theme, setTheme] = useState<'light' | 'dark'>('light');

  useEffect(() => {
    if (lastNotification) {
      setHasUnread(true);
      toast.success(`${lastNotification.title}: ${lastNotification.message}`);
    }
  }, [lastNotification]);

  useEffect(() => {
    const storedTheme = window.localStorage.getItem('subul-theme');
    const nextTheme = storedTheme === 'dark' || storedTheme === 'light' ? storedTheme : 'light';
    setTheme(nextTheme);
    document.documentElement.dataset.theme = nextTheme;
    window.localStorage.setItem('report-dashboard-theme', nextTheme);
  }, []);

  const toggleTheme = () => {
    const nextTheme = theme === 'dark' ? 'light' : 'dark';
    setTheme(nextTheme);
    document.documentElement.dataset.theme = nextTheme;
    window.localStorage.setItem('subul-theme', nextTheme);
    window.localStorage.setItem('report-dashboard-theme', nextTheme);
    window.dispatchEvent(new CustomEvent('SUBUL_PLATFORM_THEME_CHANGE', { detail: { theme: nextTheme } }));
  };

  const locale = localeFromPathname(pathname);

  const getPathWithoutLocale = () => {
    const segments = pathname.split('/');
    if (segments[1] && (segments[1] === 'fr' || segments[1] === 'en')) {
      return '/' + segments.slice(2).join('/');
    }
    return pathname;
  };

  const getCurrentPageInfo = () => {
    const pathWithoutLocale = getPathWithoutLocale();

    const matched = Object.entries(pageTitles)
      .filter(([path]) => pathWithoutLocale.startsWith(path))
      .sort((a, b) => b[0].length - a[0].length)[0];

    if (matched) {
      const [, { titleKey, subtitleKey }] = matched;
      return {
        title: t(titleKey) as string,
        subtitle: t(subtitleKey) as string,
      };
    }

    return {
      title: t('dashboard.title') as string,
      subtitle: '',
    };
  };

  const { title, subtitle } = getCurrentPageInfo();

  const learnerRootPath = `/${locale}/dashboard/learner`;
  const isLearnerRoot = role === 'student' && pathname === learnerRootPath;
  const showDynamicTitle = (role === 'admin' || role === 'student' || role === 'university' || role === 'instructor') && !isLearnerRoot;

  const createLocalizedUrl = (path: string) => {
    return `/${locale}${path}`;
  };

  const initials = userName
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase();

  return (
    <header className="sticky top-0 z-30 border-b border-violet-100/70 bg-white/90 backdrop-blur-md">
      <div className="flex flex-col items-start justify-between gap-2 px-4 py-2.5 sm:flex-row sm:items-center sm:gap-3 sm:px-5 lg:px-6">
        {showDynamicTitle && (
          <div className="flex-1 min-w-0">
            <h1 className="text-lg font-semibold text-foreground truncate">{title}</h1>
            {subtitle && (
              <p className="text-muted-foreground mt-0.5 text-sm truncate">{subtitle}</p>
            )}
          </div>
        )}

        <div className={`flex items-center gap-1.5 sm:gap-2 lg:gap-4 ${showDynamicTitle ? 'ml-auto' : 'ml-0 w-full justify-end'}`}>
          <LanguageSwitcher variant="compact" />

          <Button
            variant="ghost"
            size="icon"
            className="rounded-xl border border-slate-200 bg-white hover:bg-violet-50"
            onClick={toggleTheme}
            aria-label={theme === 'dark' ? t('common.lightMode') : t('common.darkMode')}
            title={theme === 'dark' ? t('common.lightMode') : t('common.darkMode')}
          >
            {theme === 'dark' ? (
              <Sun className="w-3.5 h-3.5 sm:w-4 sm:h-4 lg:w-5 lg:h-5 text-muted-foreground" aria-hidden="true" />
            ) : (
              <Moon className="w-3.5 h-3.5 sm:w-4 sm:h-4 lg:w-5 lg:h-5 text-muted-foreground" aria-hidden="true" />
            )}
          </Button>

          <Button
            variant="ghost"
            size="icon"
            className="relative rounded-xl border border-slate-200 bg-white hover:bg-violet-50"
            onClick={() => setHasUnread(false)}
            aria-label={t('notifications.markAsRead')}
            aria-pressed={hasUnread}
          >
            <Bell className="w-3.5 h-3.5 sm:w-4 sm:h-4 lg:w-5 lg:h-5 text-muted-foreground" aria-hidden="true" />
            {hasUnread && (
              <span className="absolute top-0.5 sm:top-1 right-0.5 sm:right-1 w-1.5 h-1.5 sm:w-2 sm:h-2 bg-destructive rounded-full" aria-label={t('notifications.unread')} />
            )}
          </Button>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                className="h-auto rounded-xl border border-slate-200 bg-white p-1.5 sm:p-2"
              >
                <div className="w-6 h-6 sm:w-7 sm:h-7 lg:w-8 lg:h-8 bg-primary rounded-full flex items-center justify-center text-primary-foreground text-xs sm:text-sm font-medium shrink-0">
                  {initials}
                </div>
                <div className="text-left hidden md:block">
                  <p className="text-xs sm:text-sm font-medium text-foreground truncate max-w-[80px] sm:max-w-[120px]">{userName}</p>
                  <p className="text-xs text-muted-foreground capitalize">{t(`roles.${role}`) as string}</p>
                </div>
                <ChevronDown className="w-3 h-3 sm:w-3.5 sm:h-3.5 lg:w-4 lg:h-4 shrink-0" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-44 sm:w-48">
              <DropdownMenuItem asChild>
                <Link
                  href={createLocalizedUrl(
                    role === 'admin'
                      ? '/dashboard/admin/profile'
                      : role === 'employer'
                        ? '/dashboard/employer/settings'
                        : role === 'university'
                          ? '/dashboard/university/settings'
                          : '/dashboard/learner/profile'
                  )}
                  className="flex gap-2 cursor-pointer"
                >
                  <User className="w-3.5 h-3.5 sm:w-4 sm:h-4" /> {t('common.profile') as string}
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link
                  href={createLocalizedUrl(
                    role === 'admin'
                      ? '/dashboard/admin/settings'
                      : role === 'employer'
                        ? '/dashboard/employer/settings'
                        : role === 'university'
                          ? '/dashboard/university/settings'
                          : '/dashboard/learner/profile'
                  )}
                  className="flex gap-2 cursor-pointer"
                >
                  <Settings className="w-3.5 h-3.5 sm:w-4 sm:h-4" /> {t('common.settings') as string}
                </Link>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={logout}
                className="text-destructive focus:text-destructive focus:bg-destructive/10 cursor-pointer"
              >
                <LogOut className="w-3.5 h-3.5 sm:w-4 sm:h-4" /> {t('common.logout') as string}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  );
}
