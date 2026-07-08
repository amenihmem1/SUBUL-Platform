'use client';

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
import { useToast } from '@/components/ui';
import { useCreateJob } from '@/hooks/api/useJobs';

const createJobSchema = z.object({
  title: z.string().min(2, 'Le titre doit contenir au moins 2 caractères'),
  description: z.string().optional(),
  location: z.string().optional(),
  contractType: z.string().min(1, 'Veuillez sélectionner un type de contrat'),
  salary: z.string().optional(),
  skills: z.string().optional(),
  domain: z.string().optional(),
  deadline: z.string().optional(),
});

type CreateJobFormValues = z.infer<typeof createJobSchema>;

export default function NewOfferPage() {
  const router = useRouter();
  const { locale } = useParams();
  const createJob = useCreateJob();
  const { showToast } = useToast();

  const form = useForm<CreateJobFormValues>({
    resolver: zodResolver(createJobSchema),
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

  const onSubmit = async (data: CreateJobFormValues) => {
    try {
      const skillsArray = data.skills
        ? data.skills.split(/[\s,]+/).filter(Boolean)
        : [];

      await createJob.mutateAsync({
        title: data.title,
        description: data.description || undefined,
        location: data.location || undefined,
        contractType: data.contractType,
        salary: data.salary || undefined,
        skills: skillsArray.length > 0 ? skillsArray : undefined,
        domain: data.domain || undefined,
        deadline: data.deadline || undefined,
      });
      router.push(`/${locale}/dashboard/employer/offres`);
    } catch (error) {
      console.error('Failed to create job:', error);
      showToast('Impossible de créer l\'offre.', 'error');
    }
  };

  const isSubmitting = createJob.isPending;

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
          <CardTitle className="text-2xl">Créer une nouvelle offre</CardTitle>
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
                      Création en cours...
                    </>
                  ) : (
                    <>
                      <Save className="w-4 h-4 mr-2" />
                      Créer l'offre
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

              {createJob.isError && (
                <div className="p-4 rounded-lg bg-red-50 border border-red-200 text-red-700">
                  <p className="font-medium">Erreur lors de la création</p>
                  <p className="text-sm">
                    {createJob.error instanceof Error
                      ? createJob.error.message
                      : 'Une erreur est survenue. Veuillez réessayer.'}
                  </p>
                </div>
              )}
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}
