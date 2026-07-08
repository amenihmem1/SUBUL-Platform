'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { motion } from 'framer-motion';
import { ArrowLeft, Save, Loader2, AlertCircle, KeyRound, Crown, Clock, Building2 } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Spinner } from '@/components/ui/loading';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { useTranslation } from '@/contexts/LanguageContext';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  FormDescription,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useAdminUser, useUpdateAdminUser, useChangeUserPassword } from '@/hooks/api/useAdmin';
import { useAdminUserSubscriptions } from '@/hooks/api/useAdminSubscriptions';
import ManageSubscriptionModal from '@/components/modals/Admin/users/ManageSubscriptionModal';
import { adminSubscriptionUiStatus } from '@/lib/admin/userSubscriptionDisplay';
import { isUniversityCampusAccountRole, shouldShowLearnerSubscriptionAdminUi } from '@/lib/roles';
import { useToast } from '@/components/ui';
import { normalizeApiError } from '@/lib/errors/normalizeApiError';
const editUserSchema = z.object({
  fullName: z.string().min(2, 'Le nom doit contenir au moins 2 caractères'),
  email: z.string().email('Adresse email invalide'),
  phone: z.string().optional(),
  /** Accept any non-empty role from API (known list is enforced in UI select options). */
  role: z.string().min(1),
});

type EditUserFormValues = z.infer<typeof editUserSchema>;


export default function EditUserPage() {
  const { t } = useTranslation();
  const { showToast } = useToast();
  const router = useRouter();
  const params = useParams();
  const locale = params?.locale as string;
  const userId = params?.id as string;
  const userIdNum = useMemo(() => {
    const n = parseInt(userId ?? '', 10);
    return Number.isFinite(n) ? n : undefined;
  }, [userId]);

  const { data: user, isLoading, isError } = useAdminUser(userIdNum);
  const showLearnerSubscriptionUi = !!(
    user &&
    shouldShowLearnerSubscriptionAdminUi(user.role, { institutionalLearnerAccess: user.institutionalLearnerAccess })
  );
  const { data: userSubs, isLoading: isLoadingSubs, refetch: refetchSubs } = useAdminUserSubscriptions(
    userIdNum,
    { enabled: showLearnerSubscriptionUi },
  );
  const updateUser = useUpdateAdminUser();
  const changePassword = useChangeUserPassword();

  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showSubscriptionModal, setShowSubscriptionModal] = useState(false);

  const currentSubscription = useMemo(() => {
    if (!userSubs || userSubs.length === 0) return undefined;
    // Sort by createdAt desc to always show latest
    return [...userSubs].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())[0];
  }, [userSubs]);

  function handleCloseSubscriptionModal() {
    setShowSubscriptionModal(false);
    // Force re-fetch subscription data so the card updates immediately
    refetchSubs();
  }

  const form = useForm<EditUserFormValues>({
    resolver: zodResolver(editUserSchema),
    defaultValues: {
      fullName: '',
      email: '',
      phone: '',
      role: 'learner',
    },
    mode: 'onBlur',
  });

  useEffect(() => {
    if (
      user &&
      !shouldShowLearnerSubscriptionAdminUi(user.role, { institutionalLearnerAccess: user.institutionalLearnerAccess })
    ) {
      setShowSubscriptionModal(false);
    }
  }, [user]);

  useEffect(() => {
    if (user) {
      form.reset({
        fullName: user.name,
        email: user.email,
        phone: user.phone || '',
        role: user.role,
      });
    }
  }, [user, form]);

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (userIdNum == null) return;
    const min = 8;
    if (newPassword.length < min) {
      showToast(t('users.passwordTooShort', { min: String(min) }), 'error');
      return;
    }
    if (newPassword !== confirmPassword) {
      showToast(t('users.passwordMismatch'), 'error');
      return;
    }
    try {
      await changePassword.mutateAsync({ id: userIdNum, password: newPassword });
      setNewPassword('');
      setConfirmPassword('');
      showToast(t('users.passwordUpdatedSuccess'), 'success');
    } catch (error) {
      const { key } = normalizeApiError(error);
      showToast(t(key), 'error');
    }
  };

  const onSubmit = async (data: EditUserFormValues) => {
    if (!userId) return;
    try {
      await updateUser.mutateAsync({
        id: parseInt(userId, 10),
        data: {
          fullName: data.fullName,
          email: data.email,
          phone: data.phone || undefined,
          role: data.role,
        },
      });
      showToast(t('users.userUpdated'), 'success');
      router.push(`/${locale}/dashboard/admin/users`);
    } catch (error) {
      const { key } = normalizeApiError(error);
      showToast(t(key), 'error');
    }
  };

  const isSubmitting = updateUser.isPending;

  if (userIdNum == null || isError) {
    return (
      <div className="space-y-6 max-w-2xl">
        <Link href={`/${locale}/dashboard/admin/users`}>
          <Button variant="ghost" className="mb-4 pl-0 hover:pl-0">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Retour aux utilisateurs
          </Button>
        </Link>
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16">
            <AlertCircle className="w-16 h-16 text-red-500 mb-4" />
            <h2 className="text-xl font-semibold mb-2">Utilisateur non trouvé</h2>
            <p className="text-muted-foreground mb-4">
              L'utilisateur avec l'ID {userId} n'existe pas.
            </p>
            <Button onClick={() => router.push(`/${locale}/dashboard/admin/users`)}>
              Retour à la liste
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (isLoading || !user) {
    return (
      <div className="space-y-6 max-w-2xl">
        <Link href={`/${locale}/dashboard/admin/users`}>
          <Button variant="ghost" className="mb-4 pl-0 hover:pl-0">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Retour aux utilisateurs
          </Button>
        </Link>
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16">
            <Spinner size="md" className="text-muted-foreground mb-4" />
            <p className="text-muted-foreground">Chargement des données…</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6 w-full pb-8">
      {/* Premium Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-primary to-accent p-8 text-white shadow-lg"
      >
        <div className="relative z-10">
          <Link href={`/${locale}/dashboard/admin/users`} className="inline-flex items-center text-white/80 hover:text-white mb-4 transition-colors">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Retour à la liste
          </Link>
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h1 className="text-3xl font-bold tracking-tight">Modifier l'utilisateur</h1>
              <p className="text-white/80 mt-1">Mise à jour des informations de {user.name}</p>
            </div>
            <div className="flex items-center gap-3 bg-white/10 backdrop-blur-md p-2 rounded-xl border border-white/20">
               <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center text-xl font-bold border border-white/30">
                {user.avatar}
              </div>
              <div>
                <p className="font-semibold leading-none">{user.name}</p>
                <p className="text-sm text-white/70 mt-1">{user.email}</p>
              </div>
            </div>
          </div>
        </div>
        {/* Decorative background elements */}
        <div className="absolute top-0 right-0 -mt-8 -mr-8 w-64 h-64 bg-white/10 rounded-full blur-3xl" />
        <div className="absolute bottom-0 left-0 -mb-8 -ml-8 w-48 h-48 bg-accent/20 rounded-full blur-2xl" />
      </motion.div>

      <Form {...form}>
        <div className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left Column: Form Fields */}
            <div className="lg:col-span-2 space-y-6">
              <form
                id="admin-edit-user-profile"
                className="contents"
                onSubmit={form.handleSubmit(onSubmit)}
              >
              <Card className="shadow-sm border-border/50">
                <CardHeader className="border-b bg-muted/30">
                  <CardTitle className="text-xl font-semibold flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                      <Save className="w-4 h-4 text-primary" />
                    </div>
                    Informations du Profil
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <FormField
                      control={form.control}
                      name="fullName"
                      render={({ field }) => (
                        <FormItem className="md:col-span-2">
                          <FormLabel className="text-sm font-semibold">Nom complet *</FormLabel>
                          <FormControl>
                            <Input
                              placeholder="ex: Jean Dupont"
                              {...field}
                              className="h-11 focus-visible:ring-primary/20 transition-all"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="email"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-sm font-semibold">Email *</FormLabel>
                          <FormControl>
                            <Input
                              type="email"
                              placeholder="jean.dupont@exemple.com"
                              {...field}
                              className="h-11 focus-visible:ring-primary/20 transition-all"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="phone"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-sm font-semibold">Téléphone</FormLabel>
                          <FormControl>
                            <Input
                              type="tel"
                              placeholder="+33 6 12 34 56 78"
                              {...field}
                              className="h-11 focus-visible:ring-primary/20 transition-all"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="role"
                      render={({ field }) => (
                        <FormItem className="md:col-span-2">
                          <FormLabel className="text-sm font-semibold">Rôle utilisateur *</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl>
                              <SelectTrigger className="h-11 focus-visible:ring-primary/20 transition-all text-left">
                                <SelectValue placeholder="Sélectionnez un rôle" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="learner">{t('users.learner') || 'Apprenant'}</SelectItem>
                              <SelectItem value="student">{t('users.student') || 'Étudiant'}</SelectItem>
                              <SelectItem value="instructor">{t('users.instructor') || 'Instructeur'}</SelectItem>
                              <SelectItem value="employer">{t('users.employer') || 'Employeur'}</SelectItem>
                              <SelectItem value="university">Université</SelectItem>
                              <SelectItem value="commercial">{t('users.commercial') || 'Commercial'}</SelectItem>
                              <SelectItem value="admin">Administrateur</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormDescription>
                            Changer le rôle peut impacter les accès de l'utilisateur.
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </CardContent>
              </Card>
              </form>

              <form onSubmit={handlePasswordSubmit} className="contents">
              <Card className="shadow-sm border-border/50">
                <CardHeader className="border-b bg-muted/30">
                  <CardTitle className="text-xl font-semibold flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                      <KeyRound className="w-4 h-4 text-primary" />
                    </div>
                    {t('users.adminPasswordSection')}
                  </CardTitle>
                  <p className="text-sm text-muted-foreground pt-1">
                    {t('users.adminPasswordHint')}
                  </p>
                </CardHeader>
                <CardContent className="p-6 space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <label className="text-sm font-semibold" htmlFor="admin-new-password">
                          {t('users.newPasswordLabel')}
                        </label>
                        <Input
                          id="admin-new-password"
                          type="password"
                          autoComplete="new-password"
                          value={newPassword}
                          onChange={(e) => setNewPassword(e.target.value)}
                          placeholder={t('users.newPasswordPlaceholder')}
                          className="h-11"
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-sm font-semibold" htmlFor="admin-confirm-password">
                          {t('users.confirmPasswordLabel')}
                        </label>
                        <Input
                          id="admin-confirm-password"
                          type="password"
                          autoComplete="new-password"
                          value={confirmPassword}
                          onChange={(e) => setConfirmPassword(e.target.value)}
                          placeholder={t('users.confirmPasswordPlaceholder')}
                          className="h-11"
                        />
                      </div>
                    </div>
                    <Button
                      type="submit"
                      variant="secondary"
                      disabled={changePassword.isPending || !newPassword}
                      className="w-full sm:w-auto"
                    >
                      {changePassword.isPending ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          {t('users.updatingPassword')}
                        </>
                      ) : (
                        t('users.updatePasswordButton')
                      )}
                    </Button>
                </CardContent>
              </Card>
              </form>

              {showLearnerSubscriptionUi && (
              <Card className="shadow-sm border-border/50">
                 <CardHeader className="border-b bg-muted/30">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-xl font-semibold flex items-center gap-2">
                      <div className="w-8 h-8 rounded-lg bg-indigo-50 flex items-center justify-center">
                        <Crown className="w-4 h-4 text-indigo-600" />
                      </div>
                      Abonnement & Accès
                    </CardTitle>
                    <Button 
                      type="button" 
                      variant="outline" 
                      size="sm" 
                      onClick={() => setShowSubscriptionModal(true)}
                      className="text-xs h-8 border-indigo-200 text-indigo-700 hover:bg-indigo-50"
                    >
                      Gérer l'abonnement
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="p-6">
                  {(() => {
                    const sub = currentSubscription;
                    if (!sub) {
                      return (
                        <div className="flex flex-col items-center justify-center py-6 text-center">
                          <div className="w-12 h-12 rounded-full bg-slate-50 flex items-center justify-center mb-3">
                            <Clock className="w-6 h-6 text-slate-300" />
                          </div>
                          <p className="text-sm font-medium text-slate-500">Aucun abonnement actif</p>
                          <p className="text-xs text-slate-400 mt-1 max-w-[200px]">L'utilisateur est actuellement sur le plan gratuit par défaut.</p>
                        </div>
                      );
                    }

                    const ui = adminSubscriptionUiStatus(sub);
                    const displayStatusLabel = ui === 'active' ? 'ACTIF' : 'EXPIRÉ';

                    return (
                      <div className="space-y-4">
                        <div className="flex items-center justify-between p-4 bg-slate-50 rounded-xl border border-slate-100">
                          <div>
                            <p className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Plan actuel</p>
                            <p className="font-bold text-slate-900">{sub.plan?.name || 'Inconnu'}</p>
                          </div>
                          <Badge variant="secondary" className={cn(
                            ui === 'active' ? 'bg-green-100 text-green-700 border-green-200' : 'bg-red-100 text-red-700 border-red-200',
                            "font-bold uppercase text-[10px]"
                          )}>
                            {displayStatusLabel}
                          </Badge>
                        </div>
                        {(sub.currentPeriodStart || sub.currentPeriodEnd) && (
                          <div className="grid grid-cols-2 gap-4 px-1">
                            <div>
                              <p className="text-[10px] text-slate-400 font-medium">Début</p>
                              <p className="text-xs font-semibold">{sub.currentPeriodStart ? new Date(sub.currentPeriodStart).toLocaleDateString() : '—'}</p>
                            </div>
                            <div>
                              <p className="text-[10px] text-slate-400 font-medium">Expiration</p>
                              <p className="text-xs font-semibold text-indigo-600">{sub.currentPeriodEnd ? new Date(sub.currentPeriodEnd).toLocaleDateString() : 'Jamais'}</p>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })()}
                </CardContent>
              </Card>
              )}

              {!showLearnerSubscriptionUi && user && isUniversityCampusAccountRole(user.role) && (
                <Card className="shadow-sm border-border/50">
                  <CardHeader className="border-b bg-muted/30">
                    <CardTitle className="text-xl font-semibold flex items-center gap-2">
                      <div className="w-8 h-8 rounded-lg bg-emerald-50 flex items-center justify-center">
                        <Building2 className="w-4 h-4 text-emerald-700" />
                      </div>
                      {String(t('users.accessCampusAccount'))}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-6">
                    <p className="text-sm text-slate-600 leading-relaxed">
                      {String(t('users.subscriptionUniversityCampusHelp'))}
                    </p>
                  </CardContent>
                </Card>
              )}

              <Card className="shadow-sm border-border/50 opacity-60 grayscale-[0.5]">
                 <CardHeader className="border-b bg-muted/30">
                  <CardTitle className="text-xl font-semibold flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center">
                      <AlertCircle className="w-4 h-4 text-muted-foreground" />
                    </div>
                    Statut du Compte
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between p-4 bg-muted/50 rounded-xl border border-dashed text-slate-600">
                    <div className="flex items-center gap-3">
                      <div className={`w-3 h-3 rounded-full ${user.status === 'active' ? 'bg-green-500 animate-pulse' : 'bg-slate-400'}`} />
                      <span className="font-medium capitalize">{user.status}</span>
                    </div>
                    <p className="text-xs italic">Le statut peut être géré depuis la liste principale.</p>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Right Column: Actions */}
            <div className="space-y-6">
              <Card className="sticky top-6 shadow-md border-primary/20 overflow-hidden">
                <div className="h-2 bg-gradient-to-r from-primary to-accent" />
                <CardHeader>
                  <CardTitle className="text-lg">Actions</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <Button
                    type="submit"
                    form="admin-edit-user-profile"
                    disabled={isSubmitting}
                    className="w-full h-11 bg-gradient-to-r from-primary to-accent hover:from-primary/95 hover:to-accent/95 shadow-md shadow-primary/20 transition-all active:scale-[0.98]"
                  >
                    {isSubmitting ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Mise à jour...
                      </>
                    ) : (
                      <>
                        <Save className="w-4 h-4 mr-2" />
                        Enregistrer
                      </>
                    )}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    className="w-full h-11 hover:bg-muted transition-colors"
                    onClick={() => router.push(`/${locale}/dashboard/admin/users`)}
                  >
                    Annuler
                  </Button>

                  {updateUser.isError && (
                    <div className="mt-4 p-4 rounded-xl bg-destructive/10 border border-destructive/20 text-destructive text-sm flex items-start gap-3">
                      <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
                      <p className="leading-relaxed">
                        {t(normalizeApiError(updateUser.error).key)}
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </Form>

      <ManageSubscriptionModal
        isOpen={showSubscriptionModal && showLearnerSubscriptionUi}
        onClose={handleCloseSubscriptionModal}
        user={{
          id: user.id,
          name: user.name,
          email: user.email,
          phone: user.phone,
          role: user.role,
          status: user.status,
          joinDate: new Date().toISOString(), // Fallback
          courses: 0,
          progress: 0,
          avatar: user.name.charAt(0),
          lastActive: '',
        }}
        currentSubscription={currentSubscription}
      />
    </div>
  );
}
