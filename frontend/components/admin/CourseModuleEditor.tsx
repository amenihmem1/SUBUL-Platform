'use client';

import { Plus, Trash2, BookOpen, FlaskConical, CircleHelp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Input } from '@/components/ui/input';

export interface LessonForm {
  title: string;
  content: string;
  bullets: string;
}
export interface LabForm {
  title: string;
  labId: string;
  objective: string;
  learningObjectives: string;
  durationMinutes: string;
  difficultyLevel: string;
}
export interface ModuleForm {
  title: string;
  icon: string;
  quiz: QuizForm[];
  lessons: LessonForm[];
  labs: LabForm[];
}
export interface QuizForm {
  question: string;
  options: string;
  correct: string;
  explanation: string;
}

export const emptyLesson = (): LessonForm => ({ title: '', content: '', bullets: '' });
export const emptyLab = (): LabForm => ({
  title: '',
  labId: '',
  objective: '',
  learningObjectives: '',
  durationMinutes: '',
  difficultyLevel: '',
});
export const emptyQuiz = (): QuizForm => ({ question: '', options: '', correct: '', explanation: '' });
export const emptyModule = (): ModuleForm => ({ title: '', icon: '', quiz: [], lessons: [], labs: [] });

export function parseLines(s: string): string[] {
  return s
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean);
}

function addQuiz(prev: ModuleForm): ModuleForm {
  return { ...prev, quiz: [...(prev.quiz ?? []), emptyQuiz()] };
}

interface CourseModuleEditorProps {
  module: ModuleForm;
  onUpdate: (upd: Partial<ModuleForm> | ((prev: ModuleForm) => ModuleForm)) => void;
  onRemove: () => void;
}

export function CourseModuleEditor({ module: mod, onUpdate, onRemove }: CourseModuleEditorProps) {
  const addLesson = () => onUpdate((prev) => ({ ...prev, lessons: [...prev.lessons, emptyLesson()] }));
  const removeLesson = (lessonIndex: number) =>
    onUpdate((prev) => ({ ...prev, lessons: prev.lessons.filter((_, i) => i !== lessonIndex) }));
  const setLesson = (lessonIndex: number, upd: Partial<LessonForm>) =>
    onUpdate((prev) => ({
      ...prev,
      lessons: prev.lessons.map((l, i) => (i === lessonIndex ? { ...l, ...upd } : l)),
    }));

  const addLab = () => onUpdate((prev) => ({ ...prev, labs: [...prev.labs, emptyLab()] }));
  const removeLab = (labIndex: number) =>
    onUpdate((prev) => ({ ...prev, labs: prev.labs.filter((_, i) => i !== labIndex) }));
  const setLab = (labIndex: number, upd: Partial<LabForm>) =>
    onUpdate((prev) => ({
      ...prev,
      labs: prev.labs.map((l, i) => (i === labIndex ? { ...l, ...upd } : l)),
    }));
  const addQuizItem = () => onUpdate((prev) => addQuiz(prev));
  const removeQuizItem = (quizIndex: number) =>
    onUpdate((prev) => ({ ...prev, quiz: (prev.quiz ?? []).filter((_, i) => i !== quizIndex) }));
  const setQuizItem = (quizIndex: number, upd: Partial<QuizForm>) =>
    onUpdate((prev) => ({
      ...prev,
      quiz: (prev.quiz ?? []).map((q, i) => (i === quizIndex ? { ...q, ...upd } : q)),
    }));

  return (
    <Card className="border-dashed">
      <CardHeader className="pb-2">
        <div className="flex items-center gap-2 flex-wrap">
          <Input
            placeholder="Titre du module"
            value={mod.title}
            onChange={(e) => onUpdate({ title: e.target.value })}
            className="flex-1 min-w-[200px]"
          />
          <Input
            placeholder="Icône (ex: ☁️)"
            value={mod.icon}
            onChange={(e) => onUpdate({ icon: e.target.value })}
            className="w-24"
          />
          <Button type="button" variant="ghost" size="icon" onClick={onRemove} className="text-destructive">
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium flex items-center gap-1">
              <CircleHelp className="h-4 w-4" /> Quiz
            </span>
            <Button type="button" variant="ghost" size="sm" onClick={addQuizItem}>
              <Plus className="h-3 w-3 mr-1" /> Ajouter
            </Button>
          </div>
          <div className="space-y-3 pl-2 border-l-2 border-muted">
            {(mod.quiz ?? []).map((quiz, quizIndex) => (
              <div key={quizIndex} className="space-y-2 bg-muted/30 rounded p-3">
                <div className="flex gap-2">
                  <Input
                    placeholder="Question *"
                    value={quiz.question}
                    onChange={(e) => setQuizItem(quizIndex, { question: e.target.value })}
                    className="flex-1"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => removeQuizItem(quizIndex)}
                    className="text-destructive shrink-0"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
                <textarea
                  className="w-full min-h-[60px] rounded-md border border-input bg-background px-3 py-2 text-sm"
                  placeholder="Options (une par ligne)"
                  value={quiz.options}
                  onChange={(e) => setQuizItem(quizIndex, { options: e.target.value })}
                />
                <Input
                  placeholder="Réponse correcte (texte exact d'une option)"
                  value={quiz.correct}
                  onChange={(e) => setQuizItem(quizIndex, { correct: e.target.value })}
                />
                <textarea
                  className="w-full min-h-[50px] rounded-md border border-input bg-background px-3 py-2 text-sm"
                  placeholder="Explication (optionnel)"
                  value={quiz.explanation}
                  onChange={(e) => setQuizItem(quizIndex, { explanation: e.target.value })}
                />
              </div>
            ))}
          </div>
        </div>
        <div>
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium flex items-center gap-1">
              <BookOpen className="h-4 w-4" /> Leçons
            </span>
            <Button type="button" variant="ghost" size="sm" onClick={addLesson}>
              <Plus className="h-3 w-3 mr-1" /> Ajouter
            </Button>
          </div>
          <div className="space-y-3 pl-2 border-l-2 border-muted">
            {mod.lessons.map((lesson, lessonIndex) => (
              <div key={lessonIndex} className="space-y-2 bg-muted/30 rounded p-3">
                <div className="flex gap-2">
                  <Input
                    placeholder="Titre de la leçon *"
                    value={lesson.title}
                    onChange={(e) => setLesson(lessonIndex, { title: e.target.value })}
                    className="flex-1"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => removeLesson(lessonIndex)}
                    className="text-destructive shrink-0"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
                <textarea
                  className="w-full min-h-[60px] rounded-md border border-input bg-background px-3 py-2 text-sm"
                  placeholder="Contenu (optionnel)"
                  value={lesson.content}
                  onChange={(e) => setLesson(lessonIndex, { content: e.target.value })}
                />
                <textarea
                  className="w-full min-h-[50px] rounded-md border border-input bg-background px-3 py-2 text-sm"
                  placeholder="Points à retenir (un par ligne)"
                  value={lesson.bullets}
                  onChange={(e) => setLesson(lessonIndex, { bullets: e.target.value })}
                />
              </div>
            ))}
          </div>
        </div>
        <div>
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium flex items-center gap-1">
              <FlaskConical className="h-4 w-4" /> Labs
            </span>
            <Button type="button" variant="ghost" size="sm" onClick={addLab}>
              <Plus className="h-3 w-3 mr-1" /> Ajouter
            </Button>
          </div>
          <div className="space-y-3 pl-2 border-l-2 border-muted">
            {mod.labs.map((lab, labIndex) => (
              <div key={labIndex} className="space-y-2 bg-muted/30 rounded p-3">
                <div className="flex gap-2 flex-wrap">
                  <Input
                    placeholder="Titre du lab *"
                    value={lab.title}
                    onChange={(e) => setLab(labIndex, { title: e.target.value })}
                    className="flex-1 min-w-[180px]"
                  />
                  <Input
                    placeholder="labId (optionnel)"
                    value={lab.labId}
                    onChange={(e) => setLab(labIndex, { labId: e.target.value })}
                    className="w-32"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => removeLab(labIndex)}
                    className="text-destructive shrink-0"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
                <textarea
                  className="w-full min-h-[50px] rounded-md border border-input bg-background px-3 py-2 text-sm"
                  placeholder="Objectif (optionnel)"
                  value={lab.objective}
                  onChange={(e) => setLab(labIndex, { objective: e.target.value })}
                />
                <textarea
                  className="w-full min-h-[50px] rounded-md border border-input bg-background px-3 py-2 text-sm"
                  placeholder="Objectifs d'apprentissage (un par ligne)"
                  value={lab.learningObjectives}
                  onChange={(e) => setLab(labIndex, { learningObjectives: e.target.value })}
                />
                <div className="flex gap-2">
                  <Input
                    type="number"
                    placeholder="Durée (min)"
                    value={lab.durationMinutes}
                    onChange={(e) => setLab(labIndex, { durationMinutes: e.target.value })}
                    className="w-28"
                  />
                  <Input
                    placeholder="Niveau (ex: beginner)"
                    value={lab.difficultyLevel}
                    onChange={(e) => setLab(labIndex, { difficultyLevel: e.target.value })}
                    className="w-32"
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
