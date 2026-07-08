export interface DemoProgressTemplate {
  status: 'not_started' | 'in_progress' | 'completed';
  overallProgress: number;
}

export const DEMO_PROGRESS_TEMPLATES: DemoProgressTemplate[] = [
  { status: 'completed', overallProgress: 100 },
  { status: 'in_progress', overallProgress: 52 },
  { status: 'not_started', overallProgress: 0 },
];
