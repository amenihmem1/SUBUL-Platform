'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { motion } from 'framer-motion';
import { ArrowLeft, Save, Loader2 } from 'lucide-react';
import { useUniversityPrograms, useUpdateUniversityProgram } from '@/hooks/api/useUniversity';
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
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';

const editProgramSchema = z.object({
  title: z.string().min(2, 'Le titre doit contenir au moins 2 caractères'),
  description: z.string().optional(),
  isActive: z.boolean().optional(),
});

type EditProgramFormValues = z.infer<typeof editProgramSchema>;

export default function EditProgramPage() {
  const params = useParams();
  const router = useRouter();
  const locale = (params?.locale as string) || 'fr';
  const programId = params?.programId as string;

  const { data: programs, isLoading } = useUniversityPrograms();
  const updateProgram = useUpdateUniversityProgram();
  const [error, setError] = useState('');

  const programsList = Array.isArray(programs) ? programs : programs?.data ?? [];
  const program = programsList.find((p: any) => p.id === programId) ?? null;

  const form = useForm<EditProgramFormValues>({
    resolver: zodResolver(editProgramSchema),
    defaultValues: {
      title: '',
      description: '',
      isActive: true,
    },
  });

  useEffect(() => {
    if (program) {
      form.reset({
        title: program.title || '',
        description: program.description || '',
        isActive: program.active !== undefined ? program.active : true,
      });
    }
  }, [program, form]);

  const onSubmit = async (data: EditProgramFormValues) => {
    setError('');
    try {
      await updateProgram.mutateAsync({
        id: programId,
        data: {
          title: data.title,
          description: data.description || undefined,
          active: data.isActive,
        },
      });
      router.push(`/${locale}/dashboard/university/programs`);
    } catch (err) {
      setError('Erreur lors de la mise à jour du programme');
      console.error(err);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!program) {
    return (
      <div className="space-y-6 max-w-2xl">
        <Link href={`/${locale}/dashboard/university/programs`}>
          <Button variant="ghost" className="mb-4 pl-0 hover:pl-0">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Retour aux programmes
          </Button>
        </Link>
        <Card>
          <CardContent className="pt-6">
            <p className="text-center text-muted-foreground">Programme non trouvé</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-2xl">
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
      >
        <Link href={`/${locale}/dashboard/university/programs`}>
          <Button variant="ghost" className="mb-4 pl-0 hover:pl-0">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Retour aux programmes
          </Button>
        </Link>
      </motion.div>

      <Card>
        <CardHeader>
          <CardTitle className="text-2xl">Modifier le programme</CardTitle>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              {error && (
                <div className="p-4 rounded-lg bg-red-50 border border-red-200 text-red-700">
                  <p className="font-medium">{error}</p>
                </div>
              )}

              <FormField
                control={form.control}
                name="title"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Titre du programme *</FormLabel>
                    <FormControl>
                      <Input placeholder="ex: Programme de certification AWS" {...field} />
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
                      <Textarea placeholder="Description du programme (optionnel)" rows={4} {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="isActive"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                    <div className="space-y-0.5">
                      <FormLabel className="text-base">Programme actif</FormLabel>
                      <p className="text-sm text-muted-foreground">
                        Un programme inactif ne sera pas visible par les étudiants
                      </p>
                    </div>
                    <FormControl>
                      <input
                        type="checkbox"
                        checked={field.value}
                        onChange={field.onChange}
                        className="w-5 h-5 rounded border-gray-300 text-primary focus:ring-primary"
                      />
                    </FormControl>
                  </FormItem>
                )}
              />

              <div className="flex gap-4 pt-4 border-t">
                <Button
                  type="submit"
                  disabled={updateProgram.isPending}
                  className="bg-primary hover:bg-primary/90"
                >
                  {updateProgram.isPending ? (
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
                  onClick={() => router.push(`/${locale}/dashboard/university/programs`)}
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
