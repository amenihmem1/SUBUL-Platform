export interface BaselineExamSeed {
  title: string;
  course: string;
  description: string;
  dateOffsetDays: number;
  duration: string;
  questionsCount: number;
  passingScore: number;
  readinessScore: number;
}

/** Seeded question count per exam (must match rows in exam-questions.seed.data). */
export const BASELINE_QUESTIONS_PER_EXAM = 10;

export const BASELINE_EXAMS: BaselineExamSeed[] = [
  {
    title: 'AZ-900 Practice Exam 1',
    course: 'Azure Fundamentals',
    description: 'Foundational cloud concepts and Azure services practice exam.',
    dateOffsetDays: 7,
    duration: '45 min',
    questionsCount: BASELINE_QUESTIONS_PER_EXAM,
    passingScore: 70,
    readinessScore: 65,
  },
  {
    title: 'AWS Cloud Practitioner Mock Exam',
    course: 'AWS Cloud Practitioner',
    description: 'Core AWS cloud concepts and billing practice exam.',
    dateOffsetDays: 10,
    duration: '60 min',
    questionsCount: BASELINE_QUESTIONS_PER_EXAM,
    passingScore: 70,
    readinessScore: 58,
  },
  {
    title: 'SC-900 Security Fundamentals Quiz',
    course: 'Security Fundamentals',
    description: 'Security, compliance, and identity fundamentals.',
    dateOffsetDays: 14,
    duration: '40 min',
    questionsCount: BASELINE_QUESTIONS_PER_EXAM,
    passingScore: 70,
    readinessScore: 61,
  },
];
