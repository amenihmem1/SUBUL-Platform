import {
  LayoutDashboard,
  BookOpen,
  GraduationCap,
  FileText,
  Award,
  ClipboardList,
  Briefcase,
  Edit,
  Home,
  Users,
  Building2,
  CreditCard,
  MessageSquare,
  Cog,
  TrendingUp,
  BarChart3,
  LucideIcon,
  CalendarCheck,
  UserPlus,
  Tag,
  Terminal,
  ExternalLink,
} from 'lucide-react';

const SUBUL_IN_EXTENSION_URL =
  'https://chromewebstore.google.com/detail/linkedin-ai-agent/ncmgnneponjfombocccihkmcnnjopjob';

export type UserRole = 'admin' | 'student' | 'instructor' | 'employer' | 'university';

export interface MenuItem {
  id: string;
  icon: LucideIcon;
  labelKey: string; // Translation key
  /** Internal dashboard path */
  href?: string;
  /** External URL (e.g. Chrome Web Store) */
  externalHref?: string;
}

export interface RoleConfig {
  role: UserRole;
  title: string;
  subtitleKey: string; // Translation key for subtitle
  basePath: string;
  menuItems: MenuItem[];
  theme: {
    primary: string;
    gradient: string;
    logoGradient: string;
  };
}

// Student/Learner Menu Configuration (all routes must exist to avoid 404s)
const studentMenu: MenuItem[] = [
  { id: 'dashboard', icon: LayoutDashboard, labelKey: 'navigation.dashboard', href: '/dashboard/learner' },
  { id: 'cours', icon: BookOpen, labelKey: 'navigation.myCourses', href: '/dashboard/learner/cours' },
  { id: 'subul-technical-coach', icon: Terminal, labelKey: 'navigation.subulTechnicalCoach', href: '/dashboard/learner/technical-coach' },
  {
    id: 'subul-in',
    icon: ExternalLink,
    labelKey: 'navigation.subulIn',
    externalHref: SUBUL_IN_EXTENSION_URL,
  },
  { id: 'certifications', icon: Award, labelKey: 'navigation.myCertifications', href: '/dashboard/learner/certifications' },
  { id: 'progression', icon: FileText, labelKey: 'navigation.progression', href: '/dashboard/learner/roadmap' },
  { id: 'emploi', icon: Briefcase, labelKey: 'navigation.jobs', href: '/dashboard/learner/emploi' },
];

const adminMenu: MenuItem[] = [
  { id: 'dashboard', icon: Home, labelKey: 'navigation.dashboard', href: '/dashboard/admin' },
  { id: 'courses', icon: GraduationCap, labelKey: 'navigation.courses', href: '/dashboard/admin/courses' },
  { id: 'tracks', icon: Tag, labelKey: 'navigation.tracks', href: '/dashboard/admin/tracks' },
  { id: 'progression', icon: BarChart3, labelKey: 'navigation.progression', href: '/dashboard/admin/progression' },
  { id: 'certifications', icon: Award, labelKey: 'navigation.certifications', href: '/dashboard/admin/certifications' },
  { id: 'users', icon: Users, labelKey: 'navigation.users', href: '/dashboard/admin/users' },
  { id: 'entreprises', icon: Building2, labelKey: 'navigation.companies', href: '/dashboard/admin/companies' },
  { id: 'jobs', icon: Briefcase, labelKey: 'navigation.jobs', href: '/dashboard/admin/jobs' },
  { id: 'payments', icon: CreditCard, labelKey: 'navigation.payments', href: '/dashboard/admin/payments' },
  { id: 'feedback', icon: MessageSquare, labelKey: 'navigation.feedback', href: '/dashboard/admin/feedback' },
  { id: 'analytics', icon: TrendingUp, labelKey: 'navigation.analytics', href: '/dashboard/admin/analytics' },
  { id: 'settings', icon: Cog, labelKey: 'navigation.settings', href: '/dashboard/admin/settings' },
];

const instructorMenu: MenuItem[] = [
  { id: 'dashboard', icon: LayoutDashboard, labelKey: 'navigation.dashboard', href: '/dashboard/instructor' },
  { id: 'courses', icon: BookOpen, labelKey: 'navigation.myCourses', href: '/dashboard/instructor/courses' },
  { id: 'students', icon: Users, labelKey: 'navigation.users', href: '/dashboard/instructor/students' },
  { id: 'analytics', icon: TrendingUp, labelKey: 'navigation.analytics', href: '/dashboard/instructor/analytics' },
  { id: 'assessments', icon: ClipboardList, labelKey: 'navigation.exams', href: '/dashboard/instructor/assessments' },
  { id: 'messages', icon: MessageSquare, labelKey: 'navigation.feedback', href: '/dashboard/instructor/messages' },
  { id: 'settings', icon: Cog, labelKey: 'navigation.settings', href: '/dashboard/instructor/settings' },
];

const employerMenu: MenuItem[] = [
  { id: 'dashboard', icon: LayoutDashboard, labelKey: 'navigation.dashboard', href: '/dashboard/employer' },
  { id: 'certifies', icon: Award, labelKey: 'navigation.certifiedLearners', href: '/dashboard/employer/certifies' },
  { id: 'offres', icon: Briefcase, labelKey: 'navigation.jobs', href: '/dashboard/employer/offres' },
  { id: 'candidats', icon: Users, labelKey: 'navigation.candidates', href: '/dashboard/employer/candidats' },
  { id: 'entretiens', icon: CalendarCheck, labelKey: 'navigation.interviews', href: '/dashboard/employer/entretiens' },
  { id: 'employes', icon: UserPlus, labelKey: 'navigation.employees', href: '/dashboard/employer/employes' },
  { id: 'settings', icon: Cog, labelKey: 'navigation.settings', href: '/dashboard/employer/settings' },
];

const universityMenu: MenuItem[] = [
  { id: 'dashboard', icon: LayoutDashboard, labelKey: 'navigation.dashboard', href: '/dashboard/university' },
  { id: 'programs', icon: GraduationCap, labelKey: 'navigation.courses', href: '/dashboard/university/programs' },
  { id: 'students', icon: Users, labelKey: 'navigation.students', href: '/dashboard/university/students' },
  { id: 'invites', icon: UserPlus, labelKey: 'navigation.users', href: '/dashboard/university/invites' },
  { id: 'licenses', icon: CreditCard, labelKey: 'navigation.payments', href: '/dashboard/university/licenses' },
];

// Role Configurations (unified brand palette: primary → accent)
export const roleConfigs: Record<UserRole, RoleConfig> = {
  student: {
    role: 'student',
    title: 'Subul',
    subtitleKey: 'roles.student',
    basePath: '/dashboard/learner',
    menuItems: studentMenu,
    theme: {
      primary: 'primary',
      gradient: 'from-primary to-accent',
      logoGradient: 'from-primary to-accent',
    },
  },
  admin: {
    role: 'admin',
    title: 'SUBUL',
    subtitleKey: 'roles.admin',
    basePath: '/dashboard/admin',
    menuItems: adminMenu,
    theme: {
      primary: 'primary',
      gradient: 'from-primary to-accent',
      logoGradient: 'from-primary to-accent',
    },
  },
  instructor: {
    role: 'instructor',
    title: 'Subul',
    subtitleKey: 'roles.instructor',
    basePath: '/dashboard/instructor',
    menuItems: instructorMenu,
    theme: {
      primary: 'primary',
      gradient: 'from-primary to-accent',
      logoGradient: 'from-primary to-accent',
    },
  },
  employer: {
    role: 'employer',
    title: 'Subul',
    subtitleKey: 'roles.employer',
    basePath: '/dashboard/employer',
    menuItems: employerMenu,
    theme: {
      primary: 'primary',
      gradient: 'from-primary to-accent',
      logoGradient: 'from-primary to-accent',
    },
  },
  university: {
    role: 'university',
    title: 'Subul',
    subtitleKey: 'roles.university',
    basePath: '/dashboard/university',
    menuItems: universityMenu,
    theme: {
      primary: 'primary',
      gradient: 'from-primary to-accent',
      logoGradient: 'from-primary to-accent',
    },
  },
};

export function getRoleConfig(role: UserRole): RoleConfig {
  return roleConfigs[role] || roleConfigs.student;
}
