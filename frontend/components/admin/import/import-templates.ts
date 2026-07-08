/**
 * Minimal but valid JSON skeletons that an admin can download as a starting
 * point for each import endpoint. Each template intentionally uses a tiny
 * shape so admins immediately see what the importer expects.
 */

export const COURSES_TEMPLATE = {
  platform: 'Subul',
  version: '1.0',
  last_updated: new Date().toISOString().slice(0, 10),
  certifications: [
    {
      id: 'sample-cert-id',
      provider: 'Microsoft Azure',
      exam_code: 'AZ-900',
      title: 'Azure Fundamentals (sample)',
      domain: 'cloud',
      level: 'debutant',
      badge_color: '#0078D4',
      description: 'Replace this with the certification description.',
      estimated_hours: 20,
      modules: [
        {
          id: 'sample-cert-m1',
          order: 1,
          title: 'Module 1 — Cloud basics',
          duration_min: 30,
          objectives: ['Understand cloud service models', 'Compare deployment types'],
          lessons: [
            {
              id: 'sample-cert-m1-l1',
              title: 'Introduction to the Cloud',
              content: 'Replace this with the lesson body.',
              key_points: ['Pay-as-you-go', 'Global availability', 'Elastic scale'],
            },
          ],
          quiz: [
            {
              id: 'sample-cert-m1-q1',
              question: 'Which model provides ready-to-use applications?',
              options: ['IaaS', 'PaaS', 'SaaS', 'On-prem'],
              correct: 'SaaS',
              explanation: 'SaaS delivers fully-managed apps to the user.',
            },
          ],
          labs: [
            {
              id: 'sample-cert-m1-lab1',
              order: 1,
              title: 'Hands-on: explore a sample resource',
              description: 'Walk-through guided lab embedded in the module.',
              duration_min: 20,
              difficulty: 'beginner',
            },
          ],
        },
      ],
      final_exam_tips: ['Read the full question before answering.'],
      resources: { official: 'https://learn.microsoft.com/' },
    },
  ],
};

export const LABS_TEMPLATE = [
  {
    slug: 'sample-azure-az900',
    title: 'Sample interactive lab — Azure VM tour',
    description: 'Replace with what the learner will do in this lab.',
    provider: 'azure',
    difficulty: 'beginner',
    estimatedTime: '45 min',
    estimatedDurationMinutes: 45,
    moduleTitle: 'Compute basics',
    status: 'draft',
    tasks: ['Sign in to the Azure Portal', 'Create a sample VM', 'Connect via SSH'],
    steps: [
      {
        title: 'Sign in to the Azure Portal',
        instruction: 'Open portal.azure.com and sign in.',
        hint: 'Use the credentials provided in the lab brief.',
        validationNote: 'You should land on the Azure dashboard.',
      },
    ],
    metadata: {
      providerLoginUrl: 'https://portal.azure.com',
      tags: ['azure', 'compute'],
      learningObjectives: ['Navigate the Azure Portal'],
      prerequisites: ['Azure subscription'],
      level: 'beginner',
      prevSlug: '',
      nextSlug: '',
    },
  },
];

export const CERTIFICATIONS_FLAT_TEMPLATE = [
  {
    title: 'Sample certification (flat shape)',
    provider: 'Microsoft',
    description: 'Use this shape if you only want to register a certification record.',
    status: 'Draft',
    externalId: 'sample-cert-id',
    linkedCourseIds: ['AZ-900'],
  },
];

export const PRACTICE_EXAMS_TEMPLATE = [
  {
    slug: 'az-900-practice-exam-1',
    title: 'AZ-900 Practice Exam 1',
    description: 'Timed mock exam for AZ-900 readiness',
    durationMinutes: 60,
    passingScore: 70,
    difficulty: 'beginner',
    status: 'published',
    questions: [
      {
        questionOrder: 1,
        prompt: 'What does IaaS provide?',
        options: [
          { id: 'A', text: 'Complete business applications' },
          { id: 'B', text: 'Managed runtime platform' },
          { id: 'C', text: 'Virtualized compute, storage, networking' },
          { id: 'D', text: 'Only serverless functions' },
        ],
        correct: ['C'],
      },
    ],
  },
];

export const CERTIFICATION_PATHS_TEMPLATE = {
  paths: [
    {
      certificationExternalId: 'az-900',
      title: 'Azure Fundamentals Preparation Path',
      description: 'Complete roadmap for AZ-900.',
      steps: [
        {
          stepOrder: 1,
          stepType: 'course',
          stepRef: 'AZ-900-AZURE-FUNDAMENTALS',
          required: true,
        },
        {
          stepOrder: 2,
          stepType: 'lab',
          stepRef: 'azure-az900-resource-group',
          required: true,
        },
        {
          stepOrder: 3,
          stepType: 'practice_exam',
          stepRef: 'az-900-practice-exam-1',
          required: true,
        },
      ],
    },
  ],
};

export function downloadJson(filename: string, payload: unknown): void {
  const blob = new Blob([JSON.stringify(payload, null, 2)], {
    type: 'application/json',
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}
