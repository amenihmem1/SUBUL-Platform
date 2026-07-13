'use client';

import {
  Home,
  Award,
  Briefcase,
  TrendingUp,
  User,
  Users,
  Building2,
  LogOut,
  LayoutDashboard,
  GraduationCap,
  ClipboardList,
  FileText,
  CreditCard,
  MessageSquare,
  Cog,
  ChevronRight,
  Terminal,
  Target,
  Flag,
  ChevronLeft,
  CalendarCheck,
  UserPlus,
  BarChart3,
  ExternalLink,
  TicketPercent,
  Lock,
  Gift,
  Sparkles,
  CloudCog,
  Bot,
  ClipboardCheck,
  type LucideIcon,
} from 'lucide-react';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import { useTranslation } from '@/contexts/LanguageContext';
import { useAuth } from '@/hooks/useAuth';
import { useContentAccess } from '@/hooks/api/useContentAccess';
import { useQuery } from '@tanstack/react-query';
import { getSubscriptionStatus } from '@/services/subscriptions';
import { cn } from '@/lib/utils';
import { localeFromPathname } from '@/lib/i18n/config';
import { ENABLE_LEARNER_CHECKOUT_UPGRADE_CTAS } from '@/lib/config/commerce';

type Role = 'admin' | 'student' | 'employer' | 'university' | 'instructor' | 'commercial';

const SUBUL_IN_EXTENSION_URL =
  'https://chromewebstore.google.com/detail/linkedin-ai-agent/ncmgnneponjfombocccihkmcnnjopjob';

type SidebarNavItem = {
  id: string;
  icon: LucideIcon;
  labelKey: string;
  href?: string;
  externalHref?: string;
  section?: string;
  disabled?: boolean;
  children?: SidebarNavItem[];
};

interface SidebarProps {
  role: Role;
  open: boolean;
  toggle: () => void;
}

export default function Sidebar({ role, open, toggle }: SidebarProps) {
  const { t } = useTranslation();
  const pathname = usePathname();
  const [currentSearch, setCurrentSearch] = useState('');
  const { logout } = useAuth();

  const locale = localeFromPathname(pathname);

  const { data: contentAccess } = useContentAccess();
  const isFree = role === 'student' && (contentAccess?.isFree ?? true);
  const { data: subscriptionStatus } = useQuery({
    queryKey: ['subscription-status'],
    queryFn: getSubscriptionStatus,
    enabled: role === 'student',
    staleTime: 30_000,
  });
  const paidPlanSlug = (subscriptionStatus?.planSlug || '').toLowerCase();
  const isActivePaid = subscriptionStatus?.kind === 'paid_active';
  const isPremium = role === 'student' && isActivePaid && paidPlanSlug === 'premium';
  const isStandard = role === 'student' && isActivePaid && paidPlanSlug === 'standard';

  const { dir } = useTranslation();
  const isRTL = dir === 'rtl';

  const createLocalizedUrl = (path: string) => `/${locale}${path}`;
  const createCoachUrl = (basePath: string, coachPath: string, extraParams?: Record<string, string>) => {
    const params = new URLSearchParams({ path: coachPath });
    Object.entries(extraParams || {}).forEach(([key, value]) => params.set(key, value));
    return `${createLocalizedUrl(basePath)}?${params.toString()}`;
  };
  const createCoachReportUrl = (basePath: string, sessionId: string, view: string) => {
    const params = new URLSearchParams({ reportSession: sessionId, view });
    return `${createLocalizedUrl(basePath)}?${params.toString()}`;
  };

  useEffect(() => {
    const syncSearch = () => setCurrentSearch(window.location.search);
    syncSearch();
    window.addEventListener('popstate', syncSearch);
    return () => window.removeEventListener('popstate', syncSearch);
  }, [pathname]);

  const syncSearchAfterNavigation = () => {
    window.setTimeout(() => setCurrentSearch(window.location.search), 80);
  };

  const currentSearchParams = new URLSearchParams(currentSearch);
  const selectedCoachSessionId = currentSearchParams.get('reportSession') || currentSearchParams.get('sessionId') || '';
  const selectedHrCoachSessionId = pathname.includes('/dashboard/learner/hr-coach') ? selectedCoachSessionId : '';
  const selectedTechnicalCoachSessionId = pathname.includes('/dashboard/learner/technical-coach') ? selectedCoachSessionId : '';

  const navConfig: Record<Role, SidebarNavItem[]> = {
    admin: [
      { id: 'dashboard', labelKey: 'navigation.dashboard', icon: Home, href: createLocalizedUrl('/dashboard/admin') },
      { id: 'courses', labelKey: 'navigation.courses', icon: GraduationCap, href: createLocalizedUrl('/dashboard/admin/courses') },
      { id: 'labs', labelKey: 'navigation.labs', icon: Terminal, href: createLocalizedUrl('/dashboard/admin/labs') },
      { id: 'lab-access', labelKey: 'navigation.labAccess', icon: CloudCog, href: createLocalizedUrl('/dashboard/admin/labs/access') },
      { id: 'quiz-feedback', labelKey: 'navigation.quizFeedback', icon: Flag, href: createLocalizedUrl('/dashboard/admin/quiz-feedback') },
      { id: 'certifications', labelKey: 'navigation.certifications', icon: Award, href: createLocalizedUrl('/dashboard/admin/certifications') },
      { id: 'users', labelKey: 'navigation.users', icon: Users, href: createLocalizedUrl('/dashboard/admin/users') },
      { id: 'hrCalendar', labelKey: 'navigation.hrCoachCalendar', icon: CalendarCheck, href: createLocalizedUrl('/dashboard/admin/hr-calendar') },
      { id: 'hrResults', labelKey: 'navigation.hrCoachResults', icon: Bot, href: createLocalizedUrl('/dashboard/admin/hr-results') },
      { id: 'technicalResults', labelKey: 'navigation.technicalCoachResults', icon: ClipboardCheck, href: createLocalizedUrl('/dashboard/admin/technical-results') },
      { id: 'recruiters', labelKey: 'navigation.candidates', icon: Briefcase, href: createLocalizedUrl('/dashboard/admin/recruiters') },
      { id: 'universities', labelKey: 'navigation.universities', icon: Building2, href: createLocalizedUrl('/dashboard/admin/universities') },
      { id: 'agentUsage', labelKey: 'navigation.agentUsage', icon: BarChart3, href: createLocalizedUrl('/dashboard/admin/agent-usage') },
      { id: 'progression', labelKey: 'navigation.progression', icon: BarChart3, href: createLocalizedUrl('/dashboard/admin/progression') },
      { id: 'assessments', labelKey: 'navigation.assessments', icon: ClipboardList, href: createLocalizedUrl('/dashboard/admin/assessments') },
      { id: 'instructors', labelKey: 'navigation.instructors', icon: Building2, href: createLocalizedUrl('/dashboard/admin/instructors') },
      { id: 'jobs', labelKey: 'navigation.jobs', icon: Briefcase, href: createLocalizedUrl('/dashboard/admin/jobs') },
      { id: 'payments', labelKey: 'navigation.payments', icon: CreditCard, href: createLocalizedUrl('/dashboard/admin/payments') },
      { id: 'promoCodes', labelKey: 'navigation.promoCodes', icon: TicketPercent, href: createLocalizedUrl('/dashboard/admin/promo-codes') },
      { id: 'commercials', labelKey: 'navigation.commercials', icon: UserPlus, href: createLocalizedUrl('/dashboard/admin/commercials') },
      { id: 'devis', labelKey: 'navigation.devis', icon: FileText, href: createLocalizedUrl('/dashboard/admin/devis') },
      { id: 'learners', labelKey: 'navigation.learners', icon: Users, href: createLocalizedUrl('/dashboard/admin/learners') },
      { id: 'contentImportHub', labelKey: 'navigation.contentImportHub', icon: FileText, href: createLocalizedUrl('/dashboard/admin/content/import') },
      { id: 'practiceExams', labelKey: 'navigation.practiceExams', icon: ClipboardList, href: createLocalizedUrl('/dashboard/admin/content/practice-exams') },
      { id: 'certificationPaths', labelKey: 'navigation.certificationPaths', icon: Target, href: createLocalizedUrl('/dashboard/admin/content/certification-paths') },
      { id: 'contentIndexing', labelKey: 'navigation.contentIndexing', icon: Sparkles, href: createLocalizedUrl('/dashboard/admin/content/indexing') },
      { id: 'manualPayments', labelKey: 'navigation.manualPayments', icon: Building2, href: createLocalizedUrl('/dashboard/admin/manual-payments') },
      { id: 'referrals', labelKey: 'navigation.referrals', icon: Gift, href: createLocalizedUrl('/dashboard/admin/referrals') },
      { id: 'feedback', labelKey: 'navigation.feedback', icon: MessageSquare, href: createLocalizedUrl('/dashboard/admin/feedback') },
      { id: 'analytics', labelKey: 'navigation.analytics', icon: TrendingUp, href: createLocalizedUrl('/dashboard/admin/analytics') },
      { id: 'settings', labelKey: 'navigation.settings', icon: Cog, href: createLocalizedUrl('/dashboard/admin/settings') },
    ],
    student: [
      { id: 'dashboard', icon: LayoutDashboard, labelKey: 'navigation.dashboard', href: createLocalizedUrl('/dashboard/learner'), section: 'main' },
      { id: 'goals', icon: Flag, labelKey: 'navigation.myGoals', href: createLocalizedUrl('/dashboard/learner/goals'), section: 'learning' },
      { id: 'roadmap', icon: Target, labelKey: 'navigation.roadmap', href: createLocalizedUrl('/dashboard/learner/roadmap'), section: 'learning' },
      { id: 'cours', icon: GraduationCap, labelKey: 'navigation.courses', href: createLocalizedUrl('/dashboard/learner/cours'), section: 'learning' },
      { id: 'labs', icon: Terminal, labelKey: 'navigation.labs', href: createLocalizedUrl('/dashboard/learner/labs'), section: 'learning' },
      {
        id: 'subul-hr-coach',
        icon: Bot,
        labelKey: 'navigation.subulHrCoach',
        href: createLocalizedUrl('/dashboard/learner/hr-coach'),
        section: 'career',
        children: [
          { id: 'hr-interview', icon: Bot, labelKey: 'navigation.coachInterview', href: createCoachUrl('/dashboard/learner/hr-coach', '/') },
          { id: 'hr-analytics', icon: BarChart3, labelKey: 'navigation.analytics', href: createCoachUrl('/dashboard/learner/hr-coach', '/dashboard') },
          {
            id: 'hr-dashboard-rh',
            icon: LayoutDashboard,
            labelKey: 'navigation.hrDashboardRh',
            href: selectedHrCoachSessionId ? createCoachReportUrl('/dashboard/learner/hr-coach', selectedHrCoachSessionId, 'rh') : undefined,
            disabled: !selectedHrCoachSessionId,
          },
          {
            id: 'hr-dashboard-insight',
            icon: BarChart3,
            labelKey: 'navigation.hrDashboardInsight',
            href: selectedHrCoachSessionId ? createCoachReportUrl('/dashboard/learner/hr-coach', selectedHrCoachSessionId, 'insights') : undefined,
            disabled: !selectedHrCoachSessionId,
          },
          { id: 'hr-history', icon: FileText, labelKey: 'navigation.coachHistory', href: createCoachUrl('/dashboard/learner/hr-coach', '/history') },
          { id: 'hr-calendar', icon: CalendarCheck, labelKey: 'navigation.coachCalendar', href: createCoachUrl('/dashboard/learner/hr-coach', '/calendar') },
          { id: 'hr-help', icon: MessageSquare, labelKey: 'navigation.coachHelp', href: createCoachUrl('/dashboard/learner/hr-coach', '/help') },
        ],
      },
      {
        id: 'subul-technical-coach',
        icon: Terminal,
        labelKey: 'navigation.subulTechnicalCoach',
        href: createLocalizedUrl('/dashboard/learner/technical-coach'),
        section: 'career',
        children: [
          { id: 'technical-interview', icon: Terminal, labelKey: 'navigation.coachInterview', href: createCoachUrl('/dashboard/learner/technical-coach', '/') },
          { id: 'technical-analytics', icon: BarChart3, labelKey: 'navigation.analytics', href: createCoachUrl('/dashboard/learner/technical-coach', '/dashboard') },
          {
            id: 'technical-dashboard-report',
            icon: LayoutDashboard,
            labelKey: 'navigation.technicalDashboard',
            href: selectedTechnicalCoachSessionId ? createCoachReportUrl('/dashboard/learner/technical-coach', selectedTechnicalCoachSessionId, 'report') : undefined,
            disabled: !selectedTechnicalCoachSessionId,
          },
          {
            id: 'technical-dashboard-insight',
            icon: BarChart3,
            labelKey: 'navigation.technicalDashboardInsight',
            href: selectedTechnicalCoachSessionId ? createCoachReportUrl('/dashboard/learner/technical-coach', selectedTechnicalCoachSessionId, 'insights') : undefined,
            disabled: !selectedTechnicalCoachSessionId,
          },
          { id: 'technical-history', icon: FileText, labelKey: 'navigation.coachHistory', href: createCoachUrl('/dashboard/learner/technical-coach', '/history') },
          { id: 'technical-help', icon: MessageSquare, labelKey: 'navigation.coachHelp', href: createCoachUrl('/dashboard/learner/technical-coach', '/help') },
        ],
      },
      { id: 'subul-in', icon: ExternalLink, labelKey: 'navigation.subulIn', externalHref: SUBUL_IN_EXTENSION_URL, section: 'career' },
      { id: 'certifications', icon: Award, labelKey: 'navigation.myCertifications', href: createLocalizedUrl('/dashboard/learner/certifications'), section: 'career' },
      { id: 'emploi', icon: Briefcase, labelKey: 'navigation.jobs', href: createLocalizedUrl('/dashboard/learner/emploi'), section: 'career' },
      { id: 'paymentRequests', icon: CreditCard, labelKey: 'navigation.paymentRequests', href: createLocalizedUrl('/dashboard/learner/payment-requests'), section: 'career' },
      { id: 'referral', icon: Gift, labelKey: 'navigation.referral', href: createLocalizedUrl('/dashboard/learner/referral'), section: 'career' },
    ],
    employer: [
      { id: 'dashboard', icon: LayoutDashboard, labelKey: 'navigation.dashboard', href: createLocalizedUrl('/dashboard/employer') },
      { id: 'certifies', icon: Award, labelKey: 'navigation.certifiedLearners', href: createLocalizedUrl('/dashboard/employer/certifies') },
      { id: 'offres', icon: Briefcase, labelKey: 'navigation.jobOffers', href: createLocalizedUrl('/dashboard/employer/offres') },
      { id: 'candidats', icon: Users, labelKey: 'navigation.candidates', href: createLocalizedUrl('/dashboard/employer/candidats') },
      { id: 'entretiens', icon: CalendarCheck, labelKey: 'navigation.interviews', href: createLocalizedUrl('/dashboard/employer/entretiens') },
      { id: 'employes', icon: UserPlus, labelKey: 'navigation.employees', href: createLocalizedUrl('/dashboard/employer/employes') },
      { id: 'settings', icon: Cog, labelKey: 'navigation.settings', href: createLocalizedUrl('/dashboard/employer/settings') },
    ],
    university: [
      { id: 'dashboard', icon: LayoutDashboard, labelKey: 'navigation.dashboard', href: createLocalizedUrl('/dashboard/university') },
      { id: 'programs', icon: GraduationCap, labelKey: 'navigation.programs', href: createLocalizedUrl('/dashboard/university/programs') },
      { id: 'students', icon: Users, labelKey: 'navigation.students', href: createLocalizedUrl('/dashboard/university/students') },
      { id: 'invites', icon: UserPlus, labelKey: 'navigation.invites', href: createLocalizedUrl('/dashboard/university/invites') },
      { id: 'licenses', icon: CreditCard, labelKey: 'navigation.licenses', href: createLocalizedUrl('/dashboard/university/licenses') },
      { id: 'settings', icon: Cog, labelKey: 'navigation.settings', href: createLocalizedUrl('/dashboard/university/settings') },
    ],
    instructor: [
      { id: 'dashboard', icon: LayoutDashboard, labelKey: 'navigation.dashboard', href: createLocalizedUrl('/dashboard/instructor') },
      { id: 'courses', icon: GraduationCap, labelKey: 'navigation.myCourses', href: createLocalizedUrl('/dashboard/instructor/courses') },
      { id: 'students', icon: Users, labelKey: 'navigation.students', href: createLocalizedUrl('/dashboard/instructor/students') },
      { id: 'assessments', icon: ClipboardList, labelKey: 'navigation.assessments', href: createLocalizedUrl('/dashboard/instructor/assessments') },
      { id: 'analytics', icon: TrendingUp, labelKey: 'navigation.analytics', href: createLocalizedUrl('/dashboard/instructor/analytics') },
      { id: 'messages', icon: MessageSquare, labelKey: 'navigation.messages', href: createLocalizedUrl('/dashboard/instructor/messages') },
      { id: 'settings', icon: Cog, labelKey: 'navigation.settings', href: createLocalizedUrl('/dashboard/instructor/settings') },
    ],
    commercial: [
      { id: 'dashboard', icon: LayoutDashboard, labelKey: 'navigation.dashboard', href: createLocalizedUrl('/dashboard/commercial') },
      { id: 'codes', icon: TicketPercent, labelKey: 'navigation.promoCodes', href: createLocalizedUrl('/dashboard/commercial/codes') },
      { id: 'referrals', icon: Users, labelKey: 'navigation.referrals', href: createLocalizedUrl('/dashboard/commercial/referrals') },
    ],
  };

  const items = navConfig[role];

  const sectionLabels: Record<string, string> = {
    learning: t('navigation.sectionLearning') as string,
    career: t('navigation.sectionCareer') as string,
  };

  const isActive = (item: SidebarNavItem) => {
    if (item.children?.some(isActive)) return true;
    if (item.externalHref || !item.href || item.disabled) return false;
    const itemUrl = new URL(item.href, 'http://subul.local');
    const itemPath = itemUrl.pathname;
    const itemCoachPath = itemUrl.searchParams.get('path');
    const currentSearchParams = new URLSearchParams(currentSearch);
    const currentCoachPath = currentSearchParams.get('path');
    const pathMatches = item.id === 'dashboard'
      ? pathname === itemPath
      : pathname === itemPath || pathname.startsWith(itemPath + '/');

    if (!pathMatches) return false;
    const itemExtraParamKeys = Array.from(itemUrl.searchParams.keys()).filter((key) => key !== 'path');
    if (itemCoachPath === null) {
      if (!itemExtraParamKeys.length) return true;
      return itemExtraParamKeys.every((key) => currentSearchParams.get(key) === itemUrl.searchParams.get(key));
    }
    if ((currentCoachPath || '/') !== itemCoachPath) return false;

    for (const key of itemExtraParamKeys) {
      if (currentSearchParams.get(key) !== itemUrl.searchParams.get(key)) return false;
    }
    if (!itemExtraParamKeys.length && currentSearchParams.has('open')) return false;
    return true;
  };

  const renderItem = (item: SidebarNavItem) => {
    const Icon = item.icon;
    const active = isActive(item);
    const label = t(item.labelKey) as string;
    /** Free-tier learners: allow core learning + HR Coach + Subul In + payment tracking. */
    const isLocked =
      isFree &&
      role === 'student' &&
      !['dashboard', 'goals', 'roadmap', 'cours', 'labs', 'subul-hr-coach', 'subul-technical-coach', 'subul-in', 'paymentRequests'].includes(item.id);
    const isExternal = Boolean(item.externalHref);
    const isItemDisabled = Boolean(item.disabled);

    const itemContent = (
      <>
        {/* Active left bar */}
        {active && open && (
          <span
            className={cn(
              'absolute top-1/2 -translate-y-1/2 h-5 w-0.5 rounded-full',
              isRTL ? 'right-0' : 'left-0',
            )}
            style={{ background: 'linear-gradient(to bottom, #7c3aed, #f43f5e)' }}
          />
        )}

        {/* Icon container */}
        <span
          className={cn(
            'flex h-8 w-8 shrink-0 items-center justify-center rounded-lg transition-all duration-200',
            active
              ? 'shadow-sm'
              : 'group-hover:bg-violet-50',
          )}
          style={
            active
              ? { background: 'linear-gradient(135deg, rgba(124,58,237,0.15) 0%, rgba(244,63,94,0.10) 100%)' }
              : undefined
          }
        >
          <Icon
            className={cn(
              'transition-colors duration-200',
              open ? 'h-[17px] w-[17px]' : 'h-[18px] w-[18px]',
              active ? 'text-violet-600' : 'text-muted-foreground group-hover:text-violet-600',
              (isLocked || isItemDisabled) && 'text-muted-foreground/50',
            )}
          />
        </span>

        {/* Label */}
        {open && (
          <span
            className={cn(
              'flex-1 truncate text-[13.5px] font-medium leading-none tracking-[-0.01em] transition-colors duration-200',
              active ? 'text-violet-700 font-semibold' : 'text-muted-foreground group-hover:text-foreground',
              (isLocked || isItemDisabled) && 'text-muted-foreground/50',
            )}
          >
            {label}
          </span>
        )}

        {/* Locked badge */}
        {open && (isLocked || isItemDisabled) && (
          <Lock className="ml-auto h-3.5 w-3.5 shrink-0 text-rose-400/60" />
        )}

        {/* External link badge */}
        {open && isExternal && !isLocked && (
          <span className="ml-auto flex h-4 w-4 items-center justify-center rounded text-muted-foreground/40">
            <ExternalLink className="h-3 w-3" />
          </span>
        )}

        {/* Collapsed active dot */}
        {!open && active && (
          <span
            className="absolute -right-0.5 top-1/2 h-1.5 w-1.5 -translate-y-1/2 rounded-full"
            style={{ background: 'linear-gradient(135deg, #7c3aed, #f43f5e)' }}
          />
        )}
      </>
    );

    const baseClasses = cn(
      'group relative flex w-full items-center rounded-xl transition-all duration-200 outline-none focus-visible:ring-2 focus-visible:ring-violet-500',
      isRTL ? 'flex-row-reverse' : '',
      open ? 'gap-2.5 px-2 py-1.5' : 'justify-center p-1.5',
      active
        ? 'bg-gradient-to-r from-violet-50 to-rose-50/40'
        : isLocked || isItemDisabled
          ? 'cursor-not-allowed opacity-60'
          : 'hover:bg-muted/50',
    );

    if (isItemDisabled) {
      return (
        <button key={item.id} className={baseClasses} title={!open ? label : undefined} disabled>
          {itemContent}
        </button>
      );
    }

    if (isLocked) {
      const lockedToast =
        item.id === 'certifications'
          ? String(t('subscription.toastLockedSidebarCertifications'))
          : String(t('subscription.toastLockedSidebarPaidFeature'));
      return (
        <button
          key={item.id}
          className={baseClasses}
          title={!open ? label : undefined}
          onClick={() =>
            import('sonner').then((m) => m.toast.error(lockedToast, { id: `locked-${item.id}` }))
          }
        >
          {itemContent}
        </button>
      );
    }

    if (isExternal && item.externalHref) {
      return (
        <a
          key={item.id}
          href={item.externalHref}
          target="_blank"
          rel="noopener noreferrer"
          className={baseClasses}
          title={!open ? label : undefined}
        >
          {itemContent}
        </a>
      );
    }

    return (
      <Link key={item.id} href={item.href!} className={baseClasses} title={!open ? label : undefined} onClick={syncSearchAfterNavigation}>
        {itemContent}
      </Link>
    );
  };

  const renderCoachGroup = (item: SidebarNavItem) => {
    if (!item.children?.length) return renderItem(item);

    const Icon = item.icon;
    const active = isActive(item);
    const label = t(item.labelKey) as string;

    if (!open) {
      return (
        <Link
          key={item.id}
          href={item.href!}
          onClick={syncSearchAfterNavigation}
          className={cn(
            'group relative flex w-full items-center justify-center rounded-xl p-1.5 transition-all duration-200 outline-none focus-visible:ring-2 focus-visible:ring-violet-500',
            active ? 'bg-gradient-to-r from-violet-50 to-rose-50/40' : 'hover:bg-muted/50',
          )}
          title={label}
        >
          <span
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg transition-all duration-200"
            style={
              active
                ? { background: 'linear-gradient(135deg, rgba(124,58,237,0.15) 0%, rgba(244,63,94,0.10) 100%)' }
                : undefined
            }
          >
            <Icon className={cn('h-[18px] w-[18px]', active ? 'text-violet-600' : 'text-muted-foreground group-hover:text-violet-600')} />
          </span>
        </Link>
      );
    }

    return (
      <div key={item.id} className="rounded-2xl border border-violet-100/70 bg-white/60 p-1.5 shadow-sm">
        <Link
          href={item.href!}
          onClick={syncSearchAfterNavigation}
          className={cn(
            'group relative flex w-full items-center gap-2.5 rounded-xl px-2 py-1.5 transition-all duration-200 outline-none focus-visible:ring-2 focus-visible:ring-violet-500',
            active ? 'bg-gradient-to-r from-violet-50 to-rose-50/40' : 'hover:bg-muted/50',
            isRTL && 'flex-row-reverse',
          )}
        >
          <span
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg shadow-sm"
            style={{ background: 'linear-gradient(135deg, rgba(124,58,237,0.15) 0%, rgba(244,63,94,0.10) 100%)' }}
          >
            <Icon className="h-[17px] w-[17px] text-violet-600" />
          </span>
          <span className="flex-1 truncate text-[13.5px] font-semibold leading-none tracking-[-0.01em] text-violet-800">
            {label}
          </span>
        </Link>
        <div className={cn('mt-1.5 space-y-0.5', isRTL ? 'pr-0' : 'pl-3')}>
          {item.children.map((child) => {
            const ChildIcon = child.icon;
            const childActive = isActive(child);
            const childLabel = t(child.labelKey) as string;
            const childDisabled = Boolean(child.disabled);
            const childClassName = cn(
              'group flex min-h-8 items-center gap-2 rounded-lg px-2 text-[12.5px] font-medium transition-all duration-200',
              childActive
                ? 'bg-violet-100/80 text-violet-700'
                : childDisabled
                  ? 'cursor-not-allowed text-muted-foreground/45 opacity-70'
                  : 'text-muted-foreground hover:bg-muted/60 hover:text-foreground',
              isRTL && 'flex-row-reverse',
            );

            if (childDisabled || !child.href) {
              return (
                <button key={child.id} type="button" className={childClassName} disabled>
                  <ChildIcon className="h-3.5 w-3.5 shrink-0" />
                  <span className="truncate">{childLabel}</span>
                  {open && <Lock className="ml-auto h-3 w-3 shrink-0 text-rose-400/60" />}
                </button>
              );
            }

            return (
              <Link
                key={child.id}
                href={child.href!}
                onClick={syncSearchAfterNavigation}
                className={childClassName}
              >
                <ChildIcon className="h-3.5 w-3.5 shrink-0" />
                <span className="truncate">{childLabel}</span>
              </Link>
            );
          })}
        </div>
      </div>
    );
  };

  const renderGroupedItems = () => {
    if (role !== 'student') {
      return <div className="space-y-0.5">{items.map(renderItem)}</div>;
    }

    const groups: { section: string; items: SidebarNavItem[] }[] = [];
    let currentSection = '';
    for (const item of items) {
      const s = item.section || '';
      if (s !== currentSection) {
        groups.push({ section: s, items: [item] });
        currentSection = s;
      } else {
        groups[groups.length - 1].items.push(item);
      }
    }

    return (
      <div className="space-y-1">
        {groups.map((group) => (
          <div key={group.section || 'main'}>
            {group.section && group.section !== 'main' && (
              <div className={cn('pb-1', open ? 'px-2 pt-5' : 'pt-4 flex justify-center')}>
                {open ? (
                  <span className="text-[10.5px] font-semibold uppercase tracking-[0.1em] text-muted-foreground/50 select-none">
                    {sectionLabels[group.section] || group.section}
                  </span>
                ) : (
                  <span
                    className="block h-px w-5 rounded-full"
                    style={{ background: 'linear-gradient(to right, #7c3aed30, #f43f5e20)' }}
                  />
                )}
              </div>
            )}
            <div className="space-y-1">{group.items.map((item) => (item.children?.length ? renderCoachGroup(item) : renderItem(item)))}</div>
          </div>
        ))}
      </div>
    );
  };

  return (
    <aside
      className={cn(
        'fixed top-0 z-50 flex h-screen flex-col bg-gradient-to-b from-white to-slate-50 transition-all duration-300 ease-spring lg:translate-x-0',
        isRTL ? 'right-0 border-l border-border/50' : 'left-0 border-r border-border/50',
        open ? 'w-[250px] translate-x-0 shadow-[0_24px_65px_-55px_rgba(15,23,42,0.35)]' : 'w-[78px] -translate-x-full lg:translate-x-0',
      )}
    >
      {/* Header */}
      <div
        className={cn(
          'flex h-14 shrink-0 items-center border-b border-border/50',
          open ? (isRTL ? 'flex-row-reverse justify-between px-4' : 'justify-between px-4') : 'justify-center px-2',
        )}
      >
        {/* Logo */}
        <Link
          href={`/${locale}`}
          className={cn(
            'flex min-w-0 items-center gap-2.5 rounded-lg p-0.5 transition-opacity hover:opacity-80',
            isRTL && 'flex-row-reverse',
          )}
        >
          <div
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg shadow-sm"
            style={{ background: 'linear-gradient(135deg, #7c3aed 0%, #f43f5e 100%)' }}
          >
            <span className="text-[15px] font-black leading-none text-white tracking-tighter">S</span>
          </div>
          {open && (
            <span className="truncate text-[15px] font-bold tracking-tight text-foreground">
              {t('navigation.logoWordmark') as string}
            </span>
          )}
        </Link>

        {/* Collapse toggle */}
        {open && (
          <button
            onClick={toggle}
            className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500"
            aria-label={t('sidebar.collapse') as string}
          >
            {isRTL ? <ChevronRight className="h-3.5 w-3.5" /> : <ChevronLeft className="h-3.5 w-3.5" />}
          </button>
        )}

        {/* Expand toggle */}
        {!open && (
          <button
            onClick={toggle}
            className="absolute -right-3 top-4 flex h-6 w-6 items-center justify-center rounded-full border border-border/70 bg-card text-muted-foreground shadow-sm transition-colors hover:border-violet-200 hover:text-violet-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500"
            aria-label={t('sidebar.expand') as string}
          >
            {isRTL ? <ChevronLeft className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
          </button>
        )}
      </div>

      {/* Navigation */}
      <nav
        id="sidebar-nav"
        role="navigation"
        aria-label={t('sidebar.navigation') as string}
        className={cn(
          'flex-1 overflow-y-auto overflow-x-hidden',
          open ? 'px-3 py-4' : 'px-1.5 py-4 flex flex-col items-center',
          // Custom thin scrollbar
          '[&::-webkit-scrollbar]:w-[3px]',
          '[&::-webkit-scrollbar-track]:bg-transparent',
          '[&::-webkit-scrollbar-thumb]:rounded-full',
          '[&::-webkit-scrollbar-thumb]:bg-violet-200/60',
          'hover:[&::-webkit-scrollbar-thumb]:bg-violet-300',
        )}
      >
        {renderGroupedItems()}
        {ENABLE_LEARNER_CHECKOUT_UPGRADE_CTAS && role === 'student' && open && isFree && (
          <div className="mt-4 rounded-2xl border border-violet-200 bg-gradient-to-br from-violet-50 via-fuchsia-50/60 to-white p-3 shadow-sm">
            <p className="inline-flex items-center gap-1 rounded-full bg-white/80 px-2 py-0.5 text-[10px] font-bold text-violet-700">
              <Sparkles className="h-3 w-3" />
              {t('sidebarCard.freeTitle') as string}
            </p>
            <p className="mt-2 text-[11px] leading-relaxed text-slate-600">
              {t('sidebarCard.freeDescPre') as string}{' '}
              <span className="font-semibold text-violet-700">Standard</span>{' '}
              {t('sidebarCard.freeDescMid') as string}{' '}
              <span className="font-semibold text-fuchsia-700">Premium</span>{' '}
              {t('sidebarCard.freeDescPost') as string}
            </p>
            <div className="mt-2.5 flex flex-col gap-1.5">
              <Link
                href={createLocalizedUrl('/checkout?plan=standard&cycle=monthly&mode=upgrade&source=sidebar-free-standard')}
                className="inline-flex h-8 w-full items-center justify-center rounded-xl bg-gradient-to-r from-violet-600 to-fuchsia-600 text-xs font-bold text-white hover:from-violet-700 hover:to-fuchsia-700"
              >
                {t('sidebarCard.upgradeToStandard') as string}
              </Link>
              <Link
                href={createLocalizedUrl('/checkout?plan=premium&cycle=monthly&mode=upgrade&source=sidebar-free-premium')}
                className="inline-flex h-7 w-full items-center justify-center rounded-xl border border-violet-200 bg-white/60 text-[11px] font-semibold text-violet-700 hover:border-violet-300 hover:bg-violet-50"
              >
                {t('sidebarCard.viewPremium') as string}
              </Link>
            </div>
          </div>
        )}

        {ENABLE_LEARNER_CHECKOUT_UPGRADE_CTAS && role === 'student' && open && isStandard && (
          <div className="mt-4 rounded-2xl border border-violet-200 bg-gradient-to-br from-violet-50 via-fuchsia-50/70 to-white p-3 shadow-sm">
            <p className="inline-flex items-center gap-1 rounded-full bg-white/80 px-2 py-0.5 text-[10px] font-bold text-violet-700">
              <Sparkles className="h-3 w-3" />
              {t('sidebarCard.standardTitle') as string}
            </p>
            <p className="mt-2 text-[11px] leading-relaxed text-slate-600">
              {t('sidebarCard.standardDescription') as string}
            </p>
            <Link
              href={createLocalizedUrl('/checkout?plan=premium&cycle=monthly&mode=upgrade&source=sidebar-standard-soft-upgrade')}
              className="mt-2 inline-flex h-8 w-full items-center justify-center rounded-xl bg-gradient-to-r from-violet-600 to-fuchsia-600 text-xs font-bold text-white hover:from-violet-700 hover:to-fuchsia-700"
            >
              {t('sidebarCard.standardCta') as string}
            </Link>
          </div>
        )}

        {role === 'student' && open && isPremium && (
          <div className="mt-4 rounded-2xl border border-violet-200 bg-gradient-to-br from-violet-50 via-fuchsia-50/50 to-white p-3 shadow-sm">
            <div className="flex items-center justify-between gap-2">
              <p className="text-xs font-bold text-violet-900">{t('sidebarCard.premiumAccountTitle') as string}</p>
              <span className="inline-flex items-center rounded-full bg-gradient-to-r from-violet-600 to-fuchsia-600 px-2 py-0.5 text-[10px] font-bold text-white">
                {t('sidebarCard.premiumBadge') as string}
              </span>
            </div>
            <p className="mt-2 text-[11px] leading-relaxed text-slate-600">
              {t('sidebarCard.premiumAccountDescription') as string}
            </p>
          </div>
        )}
      </nav>

      {/* Footer */}
      <div
        className={cn(
          'shrink-0 border-t border-border/50',
          open ? 'p-3 space-y-0.5' : 'p-1.5 flex flex-col items-center space-y-0.5',
        )}
      >
        {/* Profile */}
        <Link
          href={createLocalizedUrl(
            role === 'admin'
              ? '/dashboard/admin/profile'
              : role === 'employer'
                ? '/dashboard/employer/settings'
                : role === 'university'
                  ? '/dashboard/university/settings'
                  : '/dashboard/learner/profile',
          )}
          className={cn(
            'group relative flex w-full items-center rounded-xl transition-all duration-200 hover:bg-muted/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500',
            isRTL && 'flex-row-reverse',
            open ? 'gap-2.5 px-2 py-1.5' : 'justify-center p-1.5',
          )}
          title={!open ? (t('common.profile') as string) : undefined}
        >
          {/* Avatar */}
          <span
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg transition-all duration-200 group-hover:opacity-90"
            style={{ background: 'linear-gradient(135deg, rgba(124,58,237,0.15) 0%, rgba(244,63,94,0.10) 100%)' }}
          >
            <User className="h-[17px] w-[17px] text-violet-600" />
          </span>
          {open && (
            <span className="truncate text-[13.5px] font-medium tracking-[-0.01em] text-muted-foreground transition-colors group-hover:text-foreground">
              {t('common.profile') as string}
            </span>
          )}
        </Link>

        {/* Logout */}
        <button
          onClick={logout}
          className={cn(
            'group relative flex w-full items-center rounded-xl transition-all duration-200 hover:bg-rose-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-400',
            isRTL && 'flex-row-reverse',
            open ? 'gap-2.5 px-2 py-1.5' : 'justify-center p-1.5',
          )}
          title={!open ? (t('common.logout') as string) : undefined}
        >
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg transition-colors group-hover:bg-rose-100/60">
            <LogOut className="h-[17px] w-[17px] text-rose-400 transition-colors group-hover:text-rose-500" />
          </span>
          {open && (
            <span className="truncate text-[13.5px] font-medium tracking-[-0.01em] text-rose-400 transition-colors group-hover:text-rose-500">
              {t('common.logout') as string}
            </span>
          )}
        </button>
      </div>
    </aside>
  );
}
