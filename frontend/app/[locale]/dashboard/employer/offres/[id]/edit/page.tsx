'use client';

import { useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { motion } from 'framer-motion';
import { ArrowLeft, Save, Loader2 } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useEmployerJobs } from '@/hooks/api/useEmployer';
import { useUpdateJob } from '@/hooks/api/useJobs';
import { useToast } from '@/components/ui';

const editJobSchema = z.object({
  title: z.string().min(2, 'Le titre doit contenir au moins 2 caractères'),
  description: z.string().optional(),
  location: z.string().optional(),
  contractType: z.string().min(1, 'Veuillez sélectionner un type de contrat'),
  salary: z.string().optional(),
  skills: z.string().optional(),
  domain: z.string().optional(),
  deadline: z.string().optional(),
});

type EditJobFormValues = z.infer<typeof editJobSchema>;

export default function EditOfferPage() {
  const router = useRouter();
  const params = useParams();
  const locale = (params?.locale as string) || 'fr';
  const jobId = params?.id as string;
  const { showToast } = useToast();
  
  const { data: jobs, isLoading } = useEmployerJobs();
  const updateJob = useUpdateJob();
  
  const jobsList = Array.isArray(jobs) ? jobs : jobs?.data ?? [];
  const job = jobsList.find((j: any) => j.id === jobId) ?? null;

  const form = useForm<EditJobFormValues>({
    resolver: zodResolver(editJobSchema),
    defaultValues: {
      title: '',
      description: '',
      location: '',
      contractType: 'CDI',
      salary: '',
      skills: '',
      domain: '',
      deadline: '',
    },
    mode: 'onBlur',
  });

  useEffect(() => {
    if (job) {
      const skillsString = Array.isArray(job.skills) ? job.skills.join(', ') : '';
      form.reset({
        title: job.title || '',
        description: job.description || '',
        location: job.location || '',
        contractType: (job.contractType as string) || 'CDI',
        salary: job.salary || '',
        skills: skillsString,
        domain: job.domain || '',
        deadline: job.deadline ? (job.deadline as string).slice(0, 10) : '',
      });
    }
  }, [job, form]);

  const onSubmit = async (data: EditJobFormValues) => {
    try {
      const skillsArray = data.skills
        ? data.skills.split(/[\s,]+/).filter(Boolean)
        : [];

      await updateJob.mutateAsync({
        id: jobId,
        data: {
          title: data.title,
          description: data.description || undefined,
          location: data.location || undefined,
          contractType: data.contractType,
          salary: data.salary || undefined,
          skills: skillsArray.length > 0 ? skillsArray : undefined,
          domain: data.domain || undefined,
          deadline: data.deadline || undefined,
        },
      });
      router.push(`/${locale}/dashboard/employer/offres`);
    } catch (error) {
      showToast('Erreur lors de la mise à jour', 'error');
      console.error(error);
    }
  };

  const isSubmitting = updateJob.isPending;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!job) {
    return (
      <div className="space-y-6 max-w-3xl">
        <Link href={`/${locale}/dashboard/employer/offres`}>
          <Button variant="ghost" className="mb-4 pl-0 hover:pl-0">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Retour aux offres
          </Button>
        </Link>
        <Card>
          <CardContent className="pt-6">
            <p className="text-center text-muted-foreground">Offre non trouvée</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-3xl">
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
      >
        <Link href={`/${locale}/dashboard/employer/offres`}>
          <Button variant="ghost" className="mb-4 pl-0 hover:pl-0">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Retour aux offres
          </Button>
        </Link>
      </motion.div>

      <Card>
        <CardHeader>
          <CardTitle className="text-2xl">Modifier l'offre</CardTitle>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <FormField
                control={form.control}
                name="title"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Titre du poste *</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="Ex: Développeur Full Stack"
                        {...field}
                        className={form.formState.errors.title ? 'border-red-500' : ''}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Description</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Décrivez le poste, les missions, le profil recherché..."
                        rows={5}
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="location"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Lieu</FormLabel>
                      <FormControl>
                        <Input placeholder="Paris, Tunis..." {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="contractType"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Type de contrat *</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger className={form.formState.errors.contractType ? 'border-red-500' : ''}>
                            <SelectValue placeholder="Sélectionnez un type" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="CDI">CDI</SelectItem>
                          <SelectItem value="CDD">CDD</SelectItem>
                          <SelectItem value="Stage">Stage</SelectItem>
                          <SelectItem value="Freelance">Freelance</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="salary"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Salaire</FormLabel>
                      <FormControl>
                        <Input placeholder="45000" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="domain"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Domaine</FormLabel>
                      <FormControl>
                        <Input placeholder="devops, cloud, ai..." {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="skills"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Compétences</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="Node.js, React, PostgreSQL (séparées par des virgules)"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="deadline"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Date limite de candidature</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="flex gap-4 pt-4 border-t">
                <Button
                  type="submit"
                  disabled={isSubmitting}
                  className="bg-violet-600 hover:bg-violet-700"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Enregistrement...
                    </>
                  ) : (
                    <>
                      <Save className="w-4 h-4 mr-2" />
                      Enregistrer les modifications
                    </>
                  )}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => router.push(`/${locale}/dashboard/employer/offres`)}
                >
                  Annuler
                </Button>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}
