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
import { useCreateCertification } from '@/hooks/api/useCertifications';

const providers = ['AWS', 'Microsoft', 'Google', 'NVIDIA', 'CNCF', 'HashiCorp'];

const createCertificationSchema = z.object({
  title: z.string().min(2, 'Le titre doit contenir au moins 2 caractères'),
  provider: z.string().min(1, 'Veuillez sélectionner un fournisseur'),
  description: z.string().optional(),
  duration: z.string().optional(),
  price: z.string().optional(),
});

type CreateCertificationFormValues = z.infer<typeof createCertificationSchema>;

export default function AddCertificationPage() {
  const router = useRouter();
  const { locale } = useParams();
  const createCert = useCreateCertification();
  const { showToast } = useToast();

  const form = useForm<CreateCertificationFormValues>({
    resolver: zodResolver(createCertificationSchema),
    defaultValues: {
      title: '',
      provider: 'AWS',
      description: '',
      duration: '',
      price: '',
    },
    mode: 'onBlur',
  });

  const onSubmit = async (data: CreateCertificationFormValues) => {
    try {
      await createCert.mutateAsync({
        title: data.title,
        provider: data.provider,
        description: data.description || undefined,
        duration: data.duration || undefined,
        price: data.price || undefined,
      });
      router.push(`/${locale}/dashboard/admin/certifications`);
    } catch (error) {
      console.error('Failed to create certification:', error);
      showToast('Failed to create certification', 'error');
    }
  };

  const isSubmitting = createCert.isPending;

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
          <Link href={`/${locale}/dashboard/admin/certifications`} className="inline-flex items-center text-white/80 hover:text-white mb-4 transition-colors">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Retour à la liste
          </Link>
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h1 className="text-3xl font-bold tracking-tight">Nouvelle Certification</h1>
              <p className="text-white/80 mt-1">Créez un nouveau titre de certification pour vos apprenants</p>
            </div>
            <div className="flex items-center gap-3 bg-white/10 backdrop-blur-md p-2 rounded-xl border border-white/20">
               <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center text-xl font-bold border border-white/30">
                <Save className="w-6 h-6" />
              </div>
              <div className="pr-4">
                <p className="font-semibold leading-none">Administration</p>
                <p className="text-sm text-white/70 mt-1">Certifications</p>
              </div>
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
            {/* Left Column: Form Fields */}
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
                      name="title"
                      render={({ field }) => (
                        <FormItem className="md:col-span-2">
                          <FormLabel className="text-sm font-semibold">Titre de la certification *</FormLabel>
                          <FormControl>
                            <Input
                              placeholder="ex: AWS Solutions Architect Associate"
                              {...field}
                              className="h-11 focus-visible:ring-primary/20 transition-all"
                            />
                          </FormControl>
                          <FormDescription>Le titre officiel qui apparaîtra sur le diplôme.</FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="provider"
                      render={({ field }) => (
                        <FormItem className="md:col-span-2">
                          <FormLabel className="text-sm font-semibold">Fournisseur *</FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                              <SelectTrigger className="h-11 focus-visible:ring-primary/20 transition-all text-left">
                                <SelectValue placeholder="Sélectionnez un fournisseur" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {providers.map((p) => (
                                <SelectItem key={p} value={p}>{p}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="description"
                      render={({ field }) => (
                        <FormItem className="md:col-span-2">
                          <FormLabel className="text-sm font-semibold">Description</FormLabel>
                          <FormControl>
                            <textarea
                              className="w-full min-h-[100px] rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/20 transition-all"
                              placeholder="Description brève de la certification..."
                              {...field}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="duration"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-sm font-semibold">Durée</FormLabel>
                          <FormControl>
                            <Input
                              placeholder="ex: 3 heures"
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
                      name="price"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-sm font-semibold">Prix</FormLabel>
                          <FormControl>
                            <Input
                              placeholder="ex: 150 TND"
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
                        Créer
                      </>
                    )}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    className="w-full h-11 hover:bg-muted transition-colors"
                    onClick={() => router.push(`/${locale}/dashboard/admin/certifications`)}
                  >
                    Annuler
                  </Button>

                  {createCert.isError && (
                    <div className="mt-4 p-4 rounded-xl bg-destructive/10 border border-destructive/20 text-destructive text-sm flex items-start gap-3">
                      <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
                      <div>
                        <p className="font-semibold uppercase text-xs tracking-wider mb-1">Erreur</p>
                        <p className="leading-relaxed">
                          {createCert.error instanceof Error
                            ? createCert.error.message
                            : 'Une erreur est survenue.'}
                        </p>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card className="bg-muted/30 border-dashed">
                <CardHeader>
                  <CardTitle className="text-sm font-semibold flex items-center gap-2">
                    <Save className="w-4 h-4 text-muted-foreground" />
                    Note
                  </CardTitle>
                </CardHeader>
                <CardContent className="text-xs text-muted-foreground">
                  Les certifications créées ici seront disponibles pour être liées aux cours de la plateforme.
                </CardContent>
              </Card>
            </div>
          </div>
        </form>
      </Form>
    </div>
  );
}
