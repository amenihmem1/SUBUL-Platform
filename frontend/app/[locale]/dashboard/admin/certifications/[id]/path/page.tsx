'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { ArrowLeft, GripVertical, Plus, Trash2 } from 'lucide-react';
import { DndContext, PointerSensor, closestCenter, useSensor, useSensors, type DragEndEvent } from '@dnd-kit/core';
import { SortableContext, arrayMove, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useAdminCertificationPath, useUpdateCertificationPath } from '@/hooks/api/useCertifications';

type StepType = 'course' | 'lab' | 'assessment' | 'quiz' | 'practice_exam' | 'final_certificate';

type PathStepForm = { id: string; stepType: StepType; stepRef: string; title: string; description?: string };

function SortableStep({
  id,
  children,
}: {
  id: string;
  children: React.ReactNode;
}) {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id });
  const style = { transform: CSS.Transform.toString(transform), transition };
  return (
    <div ref={setNodeRef} style={style} className="grid grid-cols-12 gap-2 items-center">
      <button
        type="button"
        className="col-span-1 flex h-10 w-10 items-center justify-center rounded border text-muted-foreground hover:text-foreground"
        {...attributes}
        {...listeners}
        aria-label="Reorder step"
      >
        <GripVertical className="h-4 w-4" />
      </button>
      {children}
    </div>
  );
}

export default function AdminCertificationPathEditorPage() {
  const params = useParams();
  const id = Number(params.id);
  const locale = String(params.locale ?? 'fr');
  const { data = [] } = useAdminCertificationPath(id);
  const savePath = useUpdateCertificationPath();

  const [steps, setSteps] = useState<PathStepForm[]>([]);
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }));

  useEffect(() => {
    if (data.length && steps.length === 0) {
      setSteps(
        data.map((s, i) => ({
          id: `${s.stepType}-${s.stepRef}-${i}-${Math.random().toString(36).slice(2, 8)}`,
          stepType: s.stepType,
          stepRef: s.stepRef,
          title: s.title,
          description: s.description ?? '',
        }))
      );
    }
  }, [data, steps.length]);

  const addStep = () =>
    setSteps((prev) => [
      ...prev,
      { id: `step-${Date.now()}-${prev.length}`, stepType: 'course', stepRef: '', title: '' },
    ]);
  const removeStep = (index: number) => setSteps((prev) => prev.filter((_, idx) => idx !== index));
  const onDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = steps.findIndex((s) => s.id === active.id);
    const newIndex = steps.findIndex((s) => s.id === over.id);
    if (oldIndex < 0 || newIndex < 0) return;
    setSteps((prev) => arrayMove(prev, oldIndex, newIndex));
  };

  return (
    <div className="space-y-6">
      <Link href={`/${locale}/dashboard/admin/certifications`} className="inline-flex items-center gap-2 text-sm text-muted-foreground">
        <ArrowLeft className="h-4 w-4" />
        Retour aux certifications
      </Link>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Path editor: certification #{id}</CardTitle>
          <Button onClick={addStep} size="sm">
            <Plus className="h-4 w-4 mr-1" />
            Ajouter une etape
          </Button>
        </CardHeader>
        <CardContent className="space-y-3">
          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
            <SortableContext items={steps.map((step) => step.id)} strategy={verticalListSortingStrategy}>
              {steps.map((step, index) => (
                <SortableStep key={step.id} id={step.id}>
                  <select
                    className="col-span-2 border rounded px-2 py-2 text-sm"
                    value={step.stepType}
                    onChange={(e) => setSteps((prev) => prev.map((s, i) => (i === index ? { ...s, stepType: e.target.value as StepType } : s)))}
                  >
                    <option value="course">Course</option>
                    <option value="lab">Lab</option>
                    <option value="assessment">Assessment</option>
                    <option value="quiz">Quiz</option>
                    <option value="practice_exam">Practice Exam</option>
                    <option value="final_certificate">Final Certificate</option>
                  </select>
                  <input
                    className="col-span-3 border rounded px-2 py-2 text-sm"
                    placeholder="stepRef (courseId, slug, domain)"
                    value={step.stepRef}
                    onChange={(e) => setSteps((prev) => prev.map((s, i) => (i === index ? { ...s, stepRef: e.target.value } : s)))}
                  />
                  <input
                    className="col-span-3 border rounded px-2 py-2 text-sm"
                    placeholder="Titre"
                    value={step.title}
                    onChange={(e) => setSteps((prev) => prev.map((s, i) => (i === index ? { ...s, title: e.target.value } : s)))}
                  />
                  <input
                    className="col-span-2 border rounded px-2 py-2 text-sm"
                    placeholder="Description"
                    value={step.description ?? ''}
                    onChange={(e) => setSteps((prev) => prev.map((s, i) => (i === index ? { ...s, description: e.target.value } : s)))}
                  />
                  <button type="button" className="col-span-1 text-destructive" onClick={() => removeStep(index)}>
                    <Trash2 className="h-4 w-4" />
                  </button>
                </SortableStep>
              ))}
            </SortableContext>
          </DndContext>
          <Button
            onClick={() =>
              savePath.mutate({
                id,
                steps: steps.map(({ stepType, stepRef, title, description }) => ({
                  stepType,
                  stepRef,
                  title,
                  description,
                })),
              })
            }
            disabled={savePath.isPending}
            className="mt-2"
          >
            Enregistrer le path
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
