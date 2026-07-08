export interface DemoExamAttemptTemplate {
  score: number;
  status: 'passed' | 'failed';
  timeSpent: string;
  streakBonus: boolean;
  completedDaysAgo: number;
}

export const DEMO_EXAM_ATTEMPTS: DemoExamAttemptTemplate[] = [
  {
    score: 84,
    status: 'passed',
    timeSpent: '38 min',
    streakBonus: true,
    completedDaysAgo: 2,
  },
  {
    score: 68,
    status: 'failed',
    timeSpent: '41 min',
    streakBonus: false,
    completedDaysAgo: 5,
  },
];
