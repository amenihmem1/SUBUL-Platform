'use client';

import { useRouter, useParams } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { motion } from 'framer-motion';
import { ArrowLeft, Save, Loader2, AlertCircle } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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
import { useCreateAdminUser } from '@/hooks/api/useAdmin';
import { normalizeApiError } from '@/lib/errors/normalizeApiError';
import { KNOWN_USER_ROLES } from '@/lib/roles';

const createUserSchema = z.object({
  fullName: z.string().min(2, 'Le nom doit contenir au moins 2 caractères'),
  email: z.string().email('Adresse email invalide'),
  phone: z.string().optional(),
  role: z.enum(KNOWN_USER_ROLES),
  password: z.string()
    .min(8, 'Le mot de passe doit contenir au moins 8 caractères')
    .regex(/[A-Z]/, 'Le mot de passe doit contenir au moins une majuscule')
    .regex(/[a-z]/, 'Le mot de passe doit contenir au moins une minuscule')
    .regex(/[0-9]/, 'Le mot de passe doit contenir au moins un chiffre'),
  confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
  message: 'Les mots de passe ne correspondent pas',
  path: ['confirmPassword'],
});

type CreateUserFormValues = z.infer<typeof createUserSchema>;


export default function AddUserPage() {
  const { t } = useTranslation();
  const router = useRouter();
  const { locale } = useParams();
  const createUser = useCreateAdminUser();
  const { showToast } = useToast();

  const form = useForm<CreateUserFormValues>({
    resolver: zodResolver(createUserSchema),
    defaultValues: {
      fullName: '',
      email: '',
      phone: '',
      role: 'learner',
      password: '',
      confirmPassword: '',
    },
    mode: 'onBlur',
  });

  const onSubmit = async (data: CreateUserFormValues) => {
    try {
      await createUser.mutateAsync({
        fullName: data.fullName,
        email: data.email,
        phone: data.phone || undefined,
        role: data.role,
        password: data.password,
      });
      showToast(t('users.userCreated'), 'success');
      router.push(`/${locale}/dashboard/admin/users`);
    } catch (error) {
      const { key } = normalizeApiError(error);
      showToast(t(key), 'error');
    }
  };

  const isSubmitting = createUser.isPending;

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
              <h1 className="text-3xl font-bold tracking-tight">Nouvel Utilisateur</h1>
              <p className="text-white/80 mt-1">Créez un nouveau compte pour la plateforme Subul</p>
            </div>
          </div>
        </div>
        {/* Decorative background elements */}
        <div className="absolute top-0 right-0 -mt-8 -mr-8 w-64 h-64 bg-white/10 rounded-full blur-3xl" />
        <div className="absolute bottom-0 left-0 -mb-8 -ml-8 w-48 h-48 bg-accent/20 rounded-full blur-2xl" />
      </motion.div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left Column: Basic Info */}
            <div className="lg:col-span-2 space-y-6">
              <Card className="shadow-sm border-border/50">
                <CardHeader className="border-b bg-muted/30">
                  <CardTitle className="text-xl font-semibold flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                      <Save className="w-4 h-4 text-primary" />
                    </div>
                    Informations Générales
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
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
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
                              <SelectItem value="admin">Administrateur</SelectItem>
                              <SelectItem value="commercial">{t('users.commercial') || 'Commercial'}</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormDescription>
                            Le rôle détermine les permissions d'accès aux différents modules de la plateforme.
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </CardContent>
              </Card>

              <Card className="shadow-sm border-border/50">
                <CardHeader className="border-b bg-muted/30">
                  <CardTitle className="text-xl font-semibold flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg bg-accent/10 flex items-center justify-center">
                      <Save className="w-4 h-4 text-accent" />
                    </div>
                    Sécurité
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <FormField
                      control={form.control}
                      name="password"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-sm font-semibold">Mot de passe *</FormLabel>
                          <FormControl>
                            <Input
                              type="password"
                              placeholder="••••••••"
                              {...field}
                              className="h-11 focus-visible:ring-primary/20 transition-all"
                            />
                          </FormControl>
                          <FormDescription>Min. 8 caractères, 1 majuscule, 1 chiffre</FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="confirmPassword"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-sm font-semibold">Confirmer le mot de passe *</FormLabel>
                          <FormControl>
                            <Input
                              type="password"
                              placeholder="••••••••"
                              {...field}
                              className="h-11 focus-visible:ring-primary/20 transition-all"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Right Column: Actions & Summary */}
            <div className="space-y-6">
              <Card className="sticky top-6 shadow-md border-primary/20 overflow-hidden">
                <div className="h-2 bg-gradient-to-r from-primary to-accent" />
                <CardHeader>
                  <CardTitle className="text-lg">Actions</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <Button
                    type="submit"
                    disabled={isSubmitting}
                    className="w-full h-11 bg-gradient-to-r from-primary to-accent hover:from-primary/95 hover:to-accent/95 shadow-md shadow-primary/20 transition-all active:scale-[0.98]"
                  >
                    {isSubmitting ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Création...
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

                  {createUser.isError && (
                    <div className="mt-4 p-4 rounded-xl bg-destructive/10 border border-destructive/20 text-destructive text-sm flex items-start gap-3">
                      <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
                      <p className="leading-relaxed">
                        {t(normalizeApiError(createUser.error).key)}
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>
        </form>
      </Form>
    </div>
  );
}
