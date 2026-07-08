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
import { useUpdateCertification } from '@/hooks/api/useCertifications';
import { useCertifications } from '@/hooks/api/useCertifications';

const providers = ['AWS', 'Microsoft', 'Google', 'NVIDIA', 'CNCF', 'HashiCorp'];

const editCertificationSchema = z.object({
  title: z.string().min(2, 'Le titre doit contenir au moins 2 caractères'),
  provider: z.string().min(1, 'Veuillez sélectionner un fournisseur'),
  description: z.string().optional(),
  duration: z.string().optional(),
  price: z.string().optional(),
});

type EditCertificationFormValues = z.infer<typeof editCertificationSchema>;

export default function EditCertificationPage() {
  const router = useRouter();
  const params = useParams();
  const locale = String(params.locale ?? 'fr');
  const idParam = Array.isArray(params.id) ? params.id[0] : params.id;
  const updateCert = useUpdateCertification();
  const { showToast } = useToast();
  const certificationId = parseInt(String(idParam ?? ''), 10);
  const { data: certifications, isLoading } = useCertifications();
  
  const certification = certifications?.find((c) => c.id === certificationId);

  const form = useForm<EditCertificationFormValues>({
    resolver: zodResolver(editCertificationSchema),
    defaultValues: {
      title: '',
      provider: 'AWS',
      description: '',
      duration: '',
      price: '',
    },
    values: certification ? {
      title: certification.title,
      provider: certification.provider,
      description: certification.description || '',
      duration: certification.duration || '',
      price: certification.price || '',
    } : undefined,
    mode: 'onBlur',
  });

  const onSubmit = async (data: EditCertificationFormValues) => {
    try {
      await updateCert.mutateAsync({
        id: certificationId,
        data: {
          title: data.title,
          provider: data.provider,
          description: data.description || undefined,
          duration: data.duration || undefined,
          price: data.price || undefined,
        },
      });
      router.push(`/${locale}/dashboard/admin/certifications`);
    } catch (error) {
      console.error('Failed to update certification:', error);
      showToast('Failed to update certification', 'error');
    }
  };

  const isSubmitting = updateCert.isPending;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!certification) {
    return (
      <div className="space-y-6 max-w-2xl">
        <Link href={`/${locale}/dashboard/admin/certifications`}>
          <Button variant="ghost" className="mb-4 pl-0 hover:pl-0">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Retour aux certifications
          </Button>
        </Link>
        <Card>
          <CardContent className="pt-6">
            <p className="text-center text-slate-500">Certification non trouvée</p>
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
          <Link href={`/${locale}/dashboard/admin/certifications`} className="inline-flex items-center text-white/80 hover:text-white mb-4 transition-colors">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Retour à la liste
          </Link>
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h1 className="text-3xl font-bold tracking-tight">Modifier la Certification</h1>
              <p className="text-white/80 mt-1 uppercase tracking-wider text-xs font-semibold">{certification.title}</p>
            </div>
            <div className="flex items-center gap-3 bg-white/10 backdrop-blur-md p-2 rounded-xl border border-white/20">
               <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center text-xl font-bold border border-white/30 text-white">
                {certification.provider.charAt(0)}
              </div>
              <div className="pr-4">
                <p className="font-semibold leading-none">{certification.provider}</p>
                <p className="text-sm text-white/70 mt-1">Fournisseur</p>
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
                    Edition de la Certification
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
                              className="h-11 focus-visible:ring-primary/20 transition-all font-medium"
                            />
                          </FormControl>
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
                              <SelectTrigger className="h-11 focus-visible:ring-primary/20 transition-all">
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
                              className="w-full min-h-[100px] rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/20 transition-all font-sans"
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
                        Enregistrement...
                      </>
                    ) : (
                      <>
                        <Save className="w-4 h-4 mr-2" />
                        Mettre à jour
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
                  <Button
                    type="button"
                    variant="secondary"
                    className="w-full h-11"
                    onClick={() => router.push(`/${locale}/dashboard/admin/certifications/${certificationId}/path`)}
                  >
                    Editer le path
                  </Button>

                  {updateCert.isError && (
                    <div className="mt-4 p-4 rounded-xl bg-destructive/10 border border-destructive/20 text-destructive text-sm flex items-start gap-3">
                      <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
                      <div>
                        <p className="font-semibold uppercase text-xs tracking-wider mb-1">Erreur</p>
                        <p className="leading-relaxed">
                          {updateCert.error instanceof Error
                            ? updateCert.error.message
                            : 'Une erreur est survenue.'}
                        </p>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card className="bg-muted/30 border-dashed">
                <CardHeader>
                  <CardTitle className="text-sm font-semibold">Récapitulatif</CardTitle>
                </CardHeader>
                <CardContent className="text-xs text-muted-foreground space-y-2">
                  <p>• ID de certification: {certificationId}</p>
                  <p>• Dernière mise à jour: {new Date().toLocaleDateString()}</p>
                </CardContent>
              </Card>
            </div>
          </div>
        </form>
      </Form>
    </div>
  );
}
