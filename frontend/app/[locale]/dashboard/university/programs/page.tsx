'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { motion } from 'framer-motion';
import { useUniversityPrograms, useCreateUniversityProgram, useDeleteUniversityProgram } from '@/hooks/api/useUniversity';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { useConfirmDialog, useToast } from '@/components/ui';
import { useTranslation } from '@/contexts/LanguageContext';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Users, Plus, Trash2, Edit2, ChevronLeft, ChevronRight, Loader2 } from 'lucide-react';

const createProgramSchema = z.object({
  title: z.string().min(2, 'Le titre doit contenir au moins 2 caractères'),
  description: z.string().optional(),
});

type CreateProgramFormValues = z.infer<typeof createProgramSchema>;

const ITEMS_PER_PAGE = 10;

export default function UniversityProgramsPage() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const locale = (params?.locale as string) || 'fr';
  const [page, setPage] = useState(1);
  const [showCreateModal, setShowCreateModal] = useState(false);

  useEffect(() => {
    if (searchParams.get('create') === 'true') {
      setShowCreateModal(true);
    }
  }, [searchParams]);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const { confirm, ConfirmDialogComponent } = useConfirmDialog();
  const { showToast } = useToast();
  const { t } = useTranslation();

  const { data: programsData, isLoading } = useUniversityPrograms({ page, limit: ITEMS_PER_PAGE });
  const createProgram = useCreateUniversityProgram();
  const deleteProgram = useDeleteUniversityProgram();

  const programs = Array.isArray(programsData) ? programsData : programsData?.data ?? [];
  const totalItems = programsData?.total ?? programs.length;
  const totalPages = Math.ceil(totalItems / ITEMS_PER_PAGE);

  const form = useForm<CreateProgramFormValues>({
    resolver: zodResolver(createProgramSchema),
    defaultValues: {
      title: '',
      description: '',
    },
  });

  const onSubmit = async (data: CreateProgramFormValues) => {
    try {
      await createProgram.mutateAsync({
        title: data.title,
        description: data.description || undefined,
      });
      form.reset();
      setShowCreateModal(false);
    } catch (error) {
      console.error('Failed to create program:', error);
      showToast(String(t('common.error') || 'Failed to create program'), 'error');
    }
  };

  const handleDelete = async (id: string) => {
    confirm({
      title: 'Supprimer le programme',
      message: 'Êtes-vous sûr de vouloir supprimer ce programme ? Cette action est irréversible.',
      confirmLabel: 'Supprimer',
      cancelLabel: t('universityPrograms.cancel') as string,
      variant: 'danger',
      onConfirm: async () => {
        setDeletingId(id);
        try {
          await deleteProgram.mutateAsync(id);
        } catch (error) {
          console.error('Failed to delete program:', error);
          showToast(String(t('common.error') || 'Failed to delete program'), 'error');
        } finally {
          setDeletingId(null);
        }
      },
    });
  };

  return (
    <div className="space-y-6">
      {ConfirmDialogComponent}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">{t('universityPrograms.title')}</h1>
        <Dialog open={showCreateModal} onOpenChange={setShowCreateModal}>
          <DialogTrigger asChild>
            <Button className="bg-primary hover:bg-primary/90">
              <Plus className="h-4 w-4 mr-2" />
              {t('universityPrograms.newProgram')}
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{t('universityPrograms.createProgram')}</DialogTitle>
            </DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="title"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t('universityPrograms.programTitle')}</FormLabel>
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
                      <FormLabel>{t('universityPrograms.description')}</FormLabel>
                      <FormControl>
                        <Textarea placeholder="Description du programme (optionnel)" rows={3} {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <div className="flex justify-end gap-3">
                  <Button type="button" variant="outline" onClick={() => setShowCreateModal(false)}>
                    {t('universityPrograms.cancel')}
                  </Button>
                  <Button type="submit" disabled={createProgram.isPending}>
                    {createProgram.isPending ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        {t('universityPrograms.creating')}
                      </>
                    ) : (
                      t('universityPrograms.create')
                    )}
                  </Button>
                </div>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : programs.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          <p>Aucun programme trouvé.</p>
          <p className="text-sm mt-2">Créez votre premier programme pour commencer.</p>
        </div>
      ) : (
        <>
          <div className="grid gap-4">
            {programs.map((p: any, index: number) => (
              <motion.div
                key={p.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
                className="border rounded-lg p-4 flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3 bg-card"
              >
                <div className="min-w-0 flex-1">
                  <p className="font-medium">{p.title}</p>
                  {p.description && <p className="text-sm text-muted-foreground">{p.description}</p>}
                  <p className="text-xs text-muted-foreground mt-1">
                    {p.active !== undefined ? (p.active ? 'Actif' : 'Inactif') : ''}
                    {p.enrollmentCount !== undefined && ` • ${p.enrollmentCount} inscriptions`}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Button variant="outline" size="sm" asChild>
                    <Link href={`/${locale}/dashboard/university/programs/${p.id}/enrollments`}>
                      <Users className="h-4 w-4 mr-1" />
                      Inscriptions
                    </Link>
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => router.push(`/${locale}/dashboard/university/programs/${p.id}/edit`)}
                  >
                    <Edit2 className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleDelete(p.id)}
                    disabled={deletingId === p.id}
                    className="text-red-600 hover:text-red-700 hover:bg-red-50"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </motion.div>
            ))}
          </div>

          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-2 mt-6">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <span className="text-sm text-muted-foreground">
                Page {page} sur {totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
