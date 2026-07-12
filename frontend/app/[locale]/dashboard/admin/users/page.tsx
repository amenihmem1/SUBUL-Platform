'use client';

import { useState, useEffect, useMemo, type ElementType, type FormEvent } from 'react';
import { motion } from 'framer-motion';
import {
  Search,
  Plus,
  Edit2,
  Trash2,
  Eye,
  Filter,
  Clock,
  ChevronLeft,
  ChevronRight,
  CheckCircle,
  XCircle,
  Users,
  UserCheck,
  Building2,
  TrendingUp,
  Loader2,
  Crown,
  Mail,
  MailCheck,
  UserRound,
  Phone,
  LockKeyhole,
  ShieldCheck,
  X,
} from 'lucide-react';
import { Badge, Button, useToast } from '@/components/ui';
import { cn } from '@/lib/utils';
import { useTranslation } from '@/contexts/LanguageContext';
import { normalizeApiError } from '@/lib/errors/normalizeApiError';

import ViewUserModal from '@/components/modals/Admin/users/ViewUserModal';
import DeleteUserModal from '@/components/modals/Admin/users/DeleteUserModal';
import ManageSubscriptionModal from '@/components/modals/Admin/users/ManageSubscriptionModal';
import {
  useAdminUsers,
  useAdminStats,
  useCreateAdminUser,
  useDeleteAdminUser,
  useUpdateAdminUser,
  useUpdateAdminUserStatus,
  useVerifyAdminUserEmail,
} from '@/hooks/api/useAdmin';
import { useAdminUserSubscriptions } from '@/hooks/api/useAdminSubscriptions';
import { formatLastActive } from '@/lib/formatLastActive';
import {
  adminSubscriptionEndDate,
  adminSubscriptionUiStatus,
  pickLatestUserSubscriptionForUser,
} from '@/lib/admin/userSubscriptionDisplay';
import { isUniversityCampusAccountRole, shouldShowLearnerSubscriptionAdminUi } from '@/lib/roles';


export interface UserData {
  id: number;
  name: string;
  email: string;
  phone: string;
  /** Normalized API role; may include values beyond the primary union (e.g. future roles). */
  role: string;
  status: 'active' | 'inactive' | 'suspended' | 'pending';
  joinDate: string;
  courses: number;
  progress: number;
  avatar: string;
  lastActive: string;
  lastActivity?: string;
  institutionalLearnerAccess?: boolean;
}

const ITEMS_PER_PAGE = 10;

type UserFormMode = 'create' | 'edit';

type UserFormState = {
  fullName: string;
  email: string;
  phone: string;
  role: string;
  password: string;
  confirmPassword: string;
};

const emptyUserForm: UserFormState = {
  fullName: '',
  email: '',
  phone: '',
  role: 'learner',
  password: '',
  confirmPassword: '',
};

const userRoleOptions = [
  { value: 'learner', labelKey: 'users.learner', fallback: 'Apprenant' },
  { value: 'student', labelKey: 'users.student', fallback: 'Etudiant' },
  { value: 'instructor', labelKey: 'users.instructor', fallback: 'Instructeur' },
  { value: 'employer', labelKey: 'users.employer', fallback: 'Employeur' },
  { value: 'university', labelKey: 'roles.university', fallback: 'Universite' },
  { value: 'admin', labelKey: 'users.admin', fallback: 'Administrateur' },
  { value: 'commercial', labelKey: 'users.commercial', fallback: 'Commercial' },
];

const usersPageCopy = {
  fr: {
    emailVerified: 'Email verifie avec succes',
    searchUser: 'Rechercher un utilisateur...',
    unknownRole: 'Role inconnu',
    modalCreateEyebrow: 'Nouvel utilisateur',
    modalEditEyebrow: 'Modifier utilisateur',
    modalCreateTitle: 'Ajouter utilisateur',
    modalEditTitle: 'Modifier',
    close: 'Fermer',
    fullName: 'Nom complet',
    fullNamePlaceholder: 'Ameni Hmem',
    email: 'Email',
    emailPlaceholder: 'ameni@example.com',
    phone: 'Telephone',
    phonePlaceholder: '+216 00 000 000',
    role: 'Role',
    password: 'Mot de passe',
    confirmPassword: 'Confirmer le mot de passe',
    cancel: 'Annuler',
    save: 'Enregistrer',
    missingRequired: 'Nom, email et role sont obligatoires.',
    passwordTooShort: 'Le mot de passe doit contenir au moins 8 caracteres.',
    passwordMismatch: 'Les mots de passe ne correspondent pas.',
  },
  en: {
    emailVerified: 'Email verified successfully',
    searchUser: 'Search user...',
    unknownRole: 'Unknown role',
    modalCreateEyebrow: 'New user',
    modalEditEyebrow: 'Edit user',
    modalCreateTitle: 'Add user',
    modalEditTitle: 'Edit',
    close: 'Close',
    fullName: 'Full name',
    fullNamePlaceholder: 'Ameni Hmem',
    email: 'Email',
    emailPlaceholder: 'ameni@example.com',
    phone: 'Phone',
    phonePlaceholder: '+216 00 000 000',
    role: 'Role',
    password: 'Password',
    confirmPassword: 'Confirm password',
    cancel: 'Cancel',
    save: 'Save',
    missingRequired: 'Name, email and role are required.',
    passwordTooShort: 'Password must contain at least 8 characters.',
    passwordMismatch: 'Passwords do not match.',
  },
} as const;

export default function AdminUsers() {
  const { t, locale } = useTranslation();
  const copy = usersPageCopy[locale === 'fr' ? 'fr' : 'en'];
  const { showToast } = useToast();
  const [searchQuery, setSearchQuery] = useState('');
  const [filterRole, setFilterRole] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [showFilters, setShowFilters] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);

  const [showViewModal, setShowViewModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showSubscriptionModal, setShowSubscriptionModal] = useState(false);
  const [showUserFormModal, setShowUserFormModal] = useState(false);
  const [userFormMode, setUserFormMode] = useState<UserFormMode>('create');
  const [userForm, setUserForm] = useState<UserFormState>(emptyUserForm);
  const [selectedUser, setSelectedUser] = useState<UserData | null>(null);
  const [statusPendingUserId, setStatusPendingUserId] = useState<number | null>(null);

  const queryParams = useMemo(() => ({
    page: currentPage,
    limit: ITEMS_PER_PAGE,
    search: searchQuery || undefined,
    role: filterRole !== 'all' ? filterRole : undefined,
    status: filterStatus !== 'all' ? filterStatus : undefined,
  }), [currentPage, searchQuery, filterRole, filterStatus]);

  const { data: paginatedData, isLoading, isFetching } = useAdminUsers(queryParams);
  const { data: statsData } = useAdminStats();
  const { data: subsData } = useAdminUserSubscriptions();

  const users = paginatedData?.data ?? [];
  const totalUsers = paginatedData?.total ?? 0;
  const totalPages = paginatedData?.totalPages ?? 1;

  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, filterRole, filterStatus]);

  const deleteUser = useDeleteAdminUser();
  const createUser = useCreateAdminUser();
  const updateUser = useUpdateAdminUser();
  const updateStatus = useUpdateAdminUserStatus();
  const verifyEmail = useVerifyAdminUserEmail();
  const [verifyPendingUserId, setVerifyPendingUserId] = useState<number | null>(null);

  const totalUsersNum = (statsData?.totalUsers ?? 0) > 0
    ? (statsData?.totalUsers ?? 0)
    : totalUsers;
  const activeUsersNum = statsData?.activeUsers ?? users.filter(u => u.status === 'active').length;
  const employerUsersNum =
    statsData?.employerUsers ?? users.filter(u => u.role === 'employer').length;
  const activePercent = totalUsersNum > 0 ? (activeUsersNum / totalUsersNum) * 100 : 0;
  const employerPercent = totalUsersNum > 0 ? (employerUsersNum / totalUsersNum) * 100 : 0;

  const stats = [
    { label: t('users.totalUsers'), value: totalUsersNum, change: '', icon: Users, color: 'bg-primary/10 text-primary' },
    { label: t('users.activeUsers'), value: activeUsersNum, change: `${activePercent.toFixed(1)}%`, icon: UserCheck, color: 'bg-green-50 text-green-700' },
    { label: t('users.employers'), value: employerUsersNum, change: `${employerPercent.toFixed(1)}%`, icon: Building2, color: 'bg-amber-50 text-amber-700' },
  ];

  const handleDelete = async () => {
    if (!selectedUser) return;
    try {
      await deleteUser.mutateAsync(selectedUser.id);
      showToast(t('users.userDeleted'), 'success');
      setShowDeleteModal(false);
      setSelectedUser(null);
    } catch (err) {
      const { key } = normalizeApiError(err);
      showToast(t(key), 'error');
    }
  };

  const handleToggleStatus = async (id: number, currentStatus: string) => {
    const newStatus = currentStatus === 'active' ? 'inactive' : 'active';
    setStatusPendingUserId(id);
    try {
      await updateStatus.mutateAsync({ id, status: newStatus });
      showToast(t('users.userUpdated'), 'success');
    } catch (err) {
      const { key } = normalizeApiError(err);
      showToast(t(key), 'error');
    } finally {
      setStatusPendingUserId(null);
    }
  };

  const handleVerifyEmail = async (id: number) => {
    setVerifyPendingUserId(id);
    try {
      await verifyEmail.mutateAsync(id);
      showToast(copy.emailVerified, 'success');
    } catch (err) {
      const { key } = normalizeApiError(err);
      showToast(t(key), 'error');
    } finally {
      setVerifyPendingUserId(null);
    }
  };

  const openCreateUserModal = () => {
    setSelectedUser(null);
    setUserForm(emptyUserForm);
    setUserFormMode('create');
    setShowUserFormModal(true);
  };

  const openEditUserModal = (user: UserData) => {
    setSelectedUser(user);
    setUserForm({
      fullName: user.name,
      email: user.email,
      phone: user.phone || '',
      role: user.role || 'learner',
      password: '',
      confirmPassword: '',
    });
    setUserFormMode('edit');
    setShowUserFormModal(true);
  };

  const handleUserFormSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const fullName = userForm.fullName.trim();
    const email = userForm.email.trim();
    const phone = userForm.phone.trim();

    if (!fullName || !email || !userForm.role) {
      showToast(copy.missingRequired, 'error');
      return;
    }

    if (userFormMode === 'create') {
      if (userForm.password.length < 8) {
        showToast(copy.passwordTooShort, 'error');
        return;
      }
      if (userForm.password !== userForm.confirmPassword) {
        showToast(copy.passwordMismatch, 'error');
        return;
      }
    }

    try {
      if (userFormMode === 'create') {
        await createUser.mutateAsync({
          fullName,
          email,
          phone: phone || undefined,
          role: userForm.role,
          password: userForm.password,
        });
        showToast(t('users.userCreated'), 'success');
      } else if (selectedUser) {
        await updateUser.mutateAsync({
          id: selectedUser.id,
          data: {
            fullName,
            email,
            phone: phone || undefined,
            role: userForm.role,
          },
        });
        showToast(t('users.userUpdated'), 'success');
      }
      setShowUserFormModal(false);
      setSelectedUser(null);
      setUserForm(emptyUserForm);
    } catch (err) {
      const { key } = normalizeApiError(err);
      showToast(t(key), 'error');
    }
  };

  const getRoleColor = (role: string): string => {
    switch (role) {
      case 'learner': return 'bg-blue-100 text-blue-700';
      case 'student': return 'bg-cyan-100 text-cyan-700';
      case 'admin': return 'bg-purple-100 text-purple-700';
      case 'employer': return 'bg-orange-100 text-orange-700';
      case 'instructor': return 'bg-indigo-100 text-indigo-700';
      case 'university':
      case 'university_owner':
        return 'bg-emerald-100 text-emerald-700';
      case 'commercial': return 'bg-violet-100 text-violet-800';
      default: return 'bg-slate-100 text-slate-700';
    }
  };

  const getStatusColor = (status: string): string => {
    switch (status) {
      case 'active': return 'bg-green-100 text-green-700';
      case 'inactive': return 'bg-slate-100 text-slate-700';
      case 'suspended': return 'bg-red-100 text-red-700';
      case 'pending': return 'bg-amber-100 text-amber-700';
      default: return 'bg-slate-100 text-slate-700';
    }
  };

  const getSubStatusColor = (status: string): string => {
    switch (status) {
      case 'active': return 'bg-green-100 text-green-700';
      case 'expired': return 'bg-red-100 text-red-700';
      case 'cancelled': return 'bg-slate-100 text-slate-700';
      case 'pending_payment': return 'bg-amber-100 text-amber-700';
      default: return 'bg-slate-100 text-slate-700';
    }
  };

  const getRoleLabel = (role: string): string => {
    switch (role) {
      case 'learner': return String(t('users.learner') || 'Learner');
      case 'student': return String(t('users.student') || 'Student');
      case 'admin': return String(t('users.admin') || 'Admin');
      case 'employer': return String(t('users.employer') || 'Employer');
      case 'instructor': return String(t('users.instructor') || 'Instructor');
      case 'university':
      case 'university_owner':
        return String(t('roles.university') || 'University');
      case 'commercial': return String(t('users.commercial') || 'Commercial');
      default: return role || String(t('users.unknownRole') || copy.unknownRole);
    }
  };

  return (
    <div className="space-y-6 p-1">
      <motion.div
        className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        {stats.map((stat, index) => {
          const StatIcon = stat.icon;
          return (
          <motion.div
            key={index}
            className="bg-card rounded-2xl p-6 border border-border shadow-sm transition-all hover:-translate-y-1 hover:shadow-lg"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
            whileHover={{ scale: 1.02 }}
          >
            <div className="flex items-start justify-between mb-4">
              <div className={`w-14 h-14 rounded-xl flex items-center justify-center ${stat.color}`}>
                <StatIcon className="w-6 h-6" />
              </div>
              <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-600">
                <TrendingUp className="w-3 h-3" />
                {stat.change}
              </span>
            </div>
            <div className="flex items-end justify-between">
              <div>
                <motion.h3
                  className="text-3xl font-extrabold tracking-tight text-foreground"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.3 + index * 0.1 }}
                >
                  {stat.value}
                </motion.h3>
                <p className="text-slate-500 text-sm mt-1">{stat.label}</p>
              </div>
            </div>
          </motion.div>
          );
        })}
      </motion.div>

      <div className="flex flex-col sm:flex-row gap-4 justify-between">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder={String(t('users.searchPlaceholder') || copy.searchUser)}
            value={searchQuery}
            onChange={(e) => { setSearchQuery(e.target.value); }}
            className="w-full pl-10 pr-4 py-2.5 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <div className="flex gap-2 flex-wrap">
          <div className="relative">
            <Button variant="outline" onClick={() => setShowFilters(!showFilters)}>
              <Filter className="w-4 h-4 mr-2" /> {String(t('common.filter'))}
            </Button>
            {showFilters && (
              <div className="absolute right-0 mt-2 w-64 bg-white border border-slate-200 rounded-lg shadow-lg p-4 z-10">
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">{String(t('common.role'))}</label>
                    <select
                      value={filterRole}
                      onChange={(e) => { setFilterRole(e.target.value); }}
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm"
                    >
                      <option value="all">{t('common.all')}</option>
                      <option value="learner">{t('users.learner')}</option>
                      <option value="student">{t('users.student')}</option>
                      <option value="admin">{String(t('users.admin') || 'Admin')}</option>
                      <option value="employer">{t('users.employer')}</option>
                      <option value="instructor">{t('users.instructor')}</option>
                      <option value="university">{String(t('roles.university') || 'University')}</option>
                      <option value="commercial">{String(t('users.commercial') || 'Commercial')}</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">{String(t('common.status'))}</label>
                    <select
                      value={filterStatus}
                      onChange={(e) => { setFilterStatus(e.target.value); }}
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm"
                    >
                      <option value="all">{t('common.all')}</option>
                      <option value="active">{t('common.active')}</option>
                      <option value="inactive">{t('common.inactive')}</option>
                      <option value="pending">{t('users.pending')}</option>
                      <option value="suspended">{t('users.suspended')}</option>
                    </select>
                  </div>
                  <Button size="sm" className="w-full" onClick={() => setShowFilters(false)}>{t('common.apply')}</Button>
                </div>
              </div>
            )}
          </div>
          <Button className="bg-primary hover:bg-primary/90" onClick={openCreateUserModal}>
            <Plus className="w-4 h-4 mr-2" /> {String(t('users.addUser'))}
          </Button>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-slate-900">{String(t('users.title'))} ({totalUsers})</h2>
          {isFetching && !isLoading && (
            <div className="flex items-center gap-2 text-xs text-slate-500">
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
              Actualisation...
            </div>
          )}
        </div>

        <div className="overflow-x-auto">
          {isLoading ? (
            <div className="flex items-center justify-center py-16 text-slate-500">
              <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mr-3" />
              {String(t('common.loading'))}
            </div>
          ) : (
            <table className="w-full min-w-[1120px] border-collapse border border-border">
              <thead className="bg-muted/40">
                <tr>
                  <th className="border-b border-r border-border p-4 text-left text-sm font-medium text-muted-foreground">{String(t('users.userName'))}</th>
                  <th className="border-b border-r border-border p-4 text-left text-sm font-medium text-muted-foreground">{String(t('common.role'))}</th>
                  <th className="border-b border-r border-border p-4 text-left text-sm font-medium text-muted-foreground">{String(t('common.status'))}</th>
                  <th className="border-b border-r border-border p-4 text-left text-sm font-medium text-muted-foreground">Abonnement</th>
                  <th className="border-b border-r border-border p-4 text-left text-sm font-medium text-muted-foreground">{String(t('progression.courses'))}</th>
                  <th className="border-b border-r border-border p-4 text-left text-sm font-medium text-muted-foreground">{String(t('progression.progressLabel'))}</th>
                  <th className="border-b border-r border-border p-4 text-left text-sm font-medium text-muted-foreground">{String(t('users.lastActivity'))}</th>
                  <th className="border-b border-border p-4 text-center text-sm font-medium text-muted-foreground">{String(t('common.actions'))}</th>
                </tr>
              </thead>
              <tbody>
                {users.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="text-center py-10 text-slate-400">
                      {String(t('users.noUsers'))}
                    </td>
                  </tr>
                ) : users.map((user) => (
                  <tr key={user.id} className="bg-background transition even:bg-muted/20 hover:bg-muted/40">
                    <td className="border-b border-r border-border/70 p-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-gradient-to-br from-primary to-accent rounded-full flex items-center justify-center text-primary-foreground font-semibold text-sm">
                          {user.avatar}
                        </div>
                        <div>
                          <p className="font-medium text-slate-900">{user.name}</p>
                          <p className="text-sm text-slate-500">{user.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="border-b border-r border-border/70 p-4">
                      <Badge variant="secondary" className={getRoleColor(user.role)}>{getRoleLabel(user.role)}</Badge>
                    </td>
                    <td className="border-b border-r border-border/70 p-4">
                      <Badge variant="secondary" className={getStatusColor(user.status)}>{user.status}</Badge>
                    </td>
                    <td className="border-b border-r border-border/70 p-4">
                      {(() => {
                        if (isUniversityCampusAccountRole(user.role)) {
                          return (
                            <span className="text-xs text-slate-600 font-medium">
                              {String(t('users.subscriptionUniversityCampus'))}
                            </span>
                          );
                        }
                        if (!shouldShowLearnerSubscriptionAdminUi(user.role, { institutionalLearnerAccess: user.institutionalLearnerAccess })) {
                          return (
                            <span className="text-xs text-slate-400 italic">
                              {user.institutionalLearnerAccess
                                ? String(t('users.subscriptionViaInstitution'))
                                : String(t('users.subscriptionNotApplicable'))}
                            </span>
                          );
                        }
                        const userSub = pickLatestUserSubscriptionForUser(subsData, user.id);
                        if (!userSub) return <Badge variant="secondary" className="bg-slate-100 text-slate-400 font-normal italic">Aucun</Badge>;

                        const ui = adminSubscriptionUiStatus(userSub);
                        const displayStatus = ui === 'active' ? 'ACTIF' : 'EXPIRÉ';
                        const endDisp = adminSubscriptionEndDate(userSub);

                        return (
                          <div className="flex flex-col gap-1">
                            <div className="flex items-center gap-1.5">
                              <Badge variant="secondary" className={cn(getSubStatusColor(ui), "px-2 py-0 h-5 text-[10px] font-bold uppercase tracking-tight")}>
                                {displayStatus}
                              </Badge>
                              <span className="text-[11px] font-semibold text-slate-700 truncate max-w-[80px]">
                                {userSub.plan?.name || '—'}
                              </span>
                            </div>
                            {endDisp && (
                              <span className="text-[10px] text-slate-400 flex items-center gap-1 ml-1">
                                <Clock className="w-2.5 h-2.5" />
                                {new Date(endDisp).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })}
                              </span>
                            )}
                          </div>
                        );
                      })()}
                    </td>
                    <td className="border-b border-r border-border/70 p-4 font-medium text-slate-900">{user.courses}</td>
                    <td className="border-b border-r border-border/70 p-4">
                      <div className="flex items-center gap-2">
                        <div className="w-20 bg-slate-200 rounded-full h-2">
                          <div
                            className="bg-gradient-to-r from-primary to-accent h-2 rounded-full"
                            style={{ width: `${user.progress}%` }}
                          />
                        </div>
                        <span className="text-sm font-medium text-slate-700">{user.progress}%</span>
                      </div>
                    </td>
                    <td className="border-b border-r border-border/70 p-4">
                      <div className="flex items-center gap-1 text-sm text-slate-600">
                        <Clock className="w-3.5 h-3.5" />
                        {formatLastActive(user.lastActivity, t)}
                      </div>
                    </td>
                    <td className="border-b border-border/70 p-4">
                      <div className="flex items-center justify-center gap-1">
                        <button
                          onClick={() => { setSelectedUser(user); setShowViewModal(true); }}
                          className="p-2 hover:bg-slate-100 rounded-lg"
                          title={String(t('common.view'))}
                        >
                          <Eye className="w-4 h-4 text-slate-600" />
                        </button>
                        <button
                          onClick={() => openEditUserModal(user)}
                          className="p-2 hover:bg-slate-100 rounded-lg inline-flex items-center justify-center"
                          title={String(t('common.edit'))}
                        >
                          <Edit2 className="w-4 h-4 text-slate-500" />
                        </button>
                        <button
                          onClick={() => handleToggleStatus(user.id, user.status)}
                          className="p-2 hover:bg-amber-100 rounded-lg"
                          title={user.status === 'active' ? String(t('users.deactivate')) : String(t('users.activate'))}
                          disabled={statusPendingUserId === user.id || deleteUser.isPending}
                        >
                          {statusPendingUserId === user.id ? (
                            <Loader2 className="w-4 h-4 text-amber-600 animate-spin" />
                          ) : user.status === 'active' ? (
                            <XCircle className="w-4 h-4 text-amber-600" />
                          ) : (
                            <CheckCircle className="w-4 h-4 text-green-600" />
                          )}
                        </button>
                        <button
                          onClick={() => { setSelectedUser(user); setShowDeleteModal(true); }}
                          className="p-2 hover:bg-red-100 rounded-lg"
                          title={String(t('common.delete'))}
                          disabled={deleteUser.isPending || statusPendingUserId === user.id}
                        >
                          {deleteUser.isPending && selectedUser?.id === user.id ? (
                            <Loader2 className="w-4 h-4 text-red-600 animate-spin" />
                          ) : (
                            <Trash2 className="w-4 h-4 text-red-600" />
                          )}
                        </button>
                        {shouldShowLearnerSubscriptionAdminUi(user.role, { institutionalLearnerAccess: user.institutionalLearnerAccess }) && (
                        <button
                          onClick={() => { setSelectedUser(user); setShowSubscriptionModal(true); }}
                          className="p-2 hover:bg-purple-100 rounded-lg ml-1"
                          title="Gérer l'abonnement"
                        >
                          <Crown className="w-4 h-4 text-purple-600" />
                        </button>
                        )}
                        <button
                          onClick={() => handleVerifyEmail(user.id)}
                          className={cn(
                            "p-2 rounded-lg transition-colors",
                            verifyPendingUserId === user.id
                              ? "bg-blue-100"
                              : "hover:bg-blue-100"
                          )}
                          title="Vérifier l'email"
                          disabled={verifyPendingUserId === user.id || verifyEmail.isPending}
                        >
                          {verifyPendingUserId === user.id ? (
                            <Loader2 className="w-4 h-4 text-blue-600 animate-spin" />
                          ) : (
                            <MailCheck className="w-4 h-4 text-blue-600" />
                          )}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        <div className="px-6 py-4 border-t border-slate-200 flex items-center justify-between">
          <p className="text-sm text-slate-600">
            Affichage {totalUsers === 0 ? 0 : ((currentPage - 1) * ITEMS_PER_PAGE) + 1}-{Math.min(currentPage * ITEMS_PER_PAGE, totalUsers)} de {totalUsers} utilisateurs
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
              Page {currentPage} / {Math.max(1, totalPages)}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages || totalPages === 0}
            >
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </div>

      <ViewUserModal
        user={selectedUser}
        onClose={() => setShowViewModal(false)}
        onEdit={() => {
          if (selectedUser) {
            setShowViewModal(false);
            openEditUserModal(selectedUser);
          }
        }}
        isOpen={showViewModal}
      />

      <DeleteUserModal
        name={selectedUser?.name || ''}
        onDelete={handleDelete}
        onClose={() => setShowDeleteModal(false)}
        isOpen={showDeleteModal}
        isDeleting={deleteUser.isPending}
      />

      <UserFormModal
        isOpen={showUserFormModal}
        mode={userFormMode}
        form={userForm}
        t={t}
        isSaving={createUser.isPending || updateUser.isPending}
        onClose={() => {
          setShowUserFormModal(false);
          setSelectedUser(null);
          setUserForm(emptyUserForm);
        }}
        onSubmit={handleUserFormSubmit}
        onChange={(key, value) => setUserForm((prev) => ({ ...prev, [key]: value }))}
        copy={copy}
      />

      <ManageSubscriptionModal
        user={selectedUser}
        currentSubscription={
          selectedUser ? pickLatestUserSubscriptionForUser(subsData, selectedUser.id) : undefined
        }
        onClose={() => {
          setShowSubscriptionModal(false);
          if (!showViewModal && !showDeleteModal) setSelectedUser(null);
        }}
        isOpen={
          showSubscriptionModal &&
          !!selectedUser &&
          shouldShowLearnerSubscriptionAdminUi(selectedUser.role, {
            institutionalLearnerAccess: selectedUser.institutionalLearnerAccess,
          })
        }
      />
    </div>
  );
}

function UserFormModal({
  isOpen,
  mode,
  form,
  t,
  copy,
  isSaving,
  onClose,
  onSubmit,
  onChange,
}: {
  isOpen: boolean;
  mode: UserFormMode;
  form: UserFormState;
  t: (key: string) => unknown;
  copy: typeof usersPageCopy.fr | typeof usersPageCopy.en;
  isSaving: boolean;
  onClose: () => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  onChange: (key: keyof UserFormState, value: string) => void;
}) {
  if (!isOpen) return null;

  const isCreate = mode === 'create';
  const labelFor = (key: string, fallback: string) => String(t(key) || fallback);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/45 p-4 backdrop-blur-sm">
      <motion.div
        initial={{ opacity: 0, y: 18, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 18, scale: 0.98 }}
        transition={{ duration: 0.18 }}
        className="w-full max-w-2xl overflow-hidden rounded-2xl border border-border bg-background shadow-2xl"
      >
        <div className="flex items-start justify-between border-b border-border px-6 py-5">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-primary">
              {isCreate ? copy.modalCreateEyebrow : copy.modalEditEyebrow}
            </p>
            <h3 className="mt-1 text-xl font-black text-foreground">
              {isCreate ? String(t('users.addUser') || copy.modalCreateTitle) : String(t('common.edit') || copy.modalEditTitle)}
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-border text-muted-foreground transition hover:bg-muted hover:text-foreground"
            aria-label={String(t('common.close') || copy.close)}
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <form onSubmit={onSubmit} className="space-y-5 px-6 py-5">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <IconFormField
              icon={UserRound}
              label={copy.fullName}
              value={form.fullName}
              onChange={(value) => onChange('fullName', value)}
              placeholder={copy.fullNamePlaceholder}
              required
            />
            <IconFormField
              icon={Mail}
              label={labelFor('auth.email', copy.email)}
              type="email"
              value={form.email}
              onChange={(value) => onChange('email', value)}
              placeholder={copy.emailPlaceholder}
              required
            />
            <IconFormField
              icon={Phone}
              label={labelFor('common.phone', copy.phone)}
              type="tel"
              value={form.phone}
              onChange={(value) => onChange('phone', value)}
              placeholder={copy.phonePlaceholder}
            />
            <label className="block">
              <span className="mb-1.5 block text-sm font-semibold text-foreground">{copy.role}</span>
              <div className="flex h-11 items-center gap-2 rounded-xl border border-border bg-background px-3 focus-within:border-primary focus-within:ring-2 focus-within:ring-primary/15">
                <ShieldCheck className="h-4 w-4 shrink-0 text-muted-foreground" />
                <select
                  value={form.role}
                  onChange={(event) => onChange('role', event.target.value)}
                  className="h-full min-w-0 flex-1 bg-transparent text-sm text-foreground outline-none"
                  required
                >
                  {userRoleOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {String(t(option.labelKey) || option.fallback)}
                    </option>
                  ))}
                </select>
              </div>
            </label>

            {isCreate && (
              <>
                <IconFormField
                  icon={LockKeyhole}
                  label={copy.password}
                  type="password"
                  value={form.password}
                  onChange={(value) => onChange('password', value)}
                  placeholder="********"
                  required
                />
                <IconFormField
                  icon={LockKeyhole}
                  label={copy.confirmPassword}
                  type="password"
                  value={form.confirmPassword}
                  onChange={(value) => onChange('confirmPassword', value)}
                  placeholder="********"
                  required
                />
              </>
            )}
          </div>

          <div className="flex flex-col-reverse gap-3 border-t border-border pt-5 sm:flex-row sm:justify-end">
            <button
              type="button"
              onClick={onClose}
              className="inline-flex h-11 items-center justify-center rounded-xl border border-border px-5 text-sm font-semibold text-muted-foreground transition hover:bg-muted hover:text-foreground"
            >
              {String(t('common.cancel') || copy.cancel)}
            </button>
            <button
              type="submit"
              disabled={isSaving}
              className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-primary px-5 text-sm font-bold text-primary-foreground transition hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle className="h-4 w-4" />}
              {isCreate ? String(t('users.addUser') || copy.modalCreateTitle) : String(t('common.save') || copy.save)}
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );
}

function IconFormField({
  icon: Icon,
  label,
  value,
  onChange,
  type = 'text',
  placeholder,
  required = false,
}: {
  icon: ElementType;
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: string;
  placeholder?: string;
  required?: boolean;
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-sm font-semibold text-foreground">{label}</span>
      <div className="flex h-11 items-center gap-2 rounded-xl border border-border bg-background px-3 focus-within:border-primary focus-within:ring-2 focus-within:ring-primary/15">
        <Icon className="h-4 w-4 shrink-0 text-muted-foreground" />
        <input
          type={type}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          placeholder={placeholder}
          required={required}
          className="h-full min-w-0 flex-1 bg-transparent text-sm text-foreground outline-none placeholder:text-muted-foreground"
        />
      </div>
    </label>
  );
}
