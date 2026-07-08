'use client';

import { api, API_PATHS } from '@/lib/api/client';
import publicApi from '@/lib/api/publicAxios';

export interface Certification {
  id: number;
  title: string;
  provider: string;
  description: string;
  students: number;
  completion: number;
  status: 'Active' | 'Draft' | 'Archived';
  available: boolean;
  lastUpdated: string;
  color: string;
  icon: string;
  duration: string;
  price: string;
}

export interface CreateCertificationDto {
  title: string;
  provider: string;
  description?: string;
  duration?: string;
  price?: string;
}

export interface UpdateCertificationDto {
  title?: string;
  provider?: string;
  description?: string;
  duration?: string;
  price?: string;
  status?: 'Active' | 'Draft' | 'Archived';
}

export interface ToggleAvailabilityDto {
  available: boolean;
}

const base = () => API_PATHS.admin('certifications');

export type LearnerCertificationsQuery = {
  fullCatalog?: boolean;
  track?: string;
};

/** Learner endpoint: available certifications with linked courses (scoped to profile by default). */
export const getLearnerCertifications = (opts?: LearnerCertificationsQuery) => {
  const params: Record<string, string> = {};
  if (opts?.fullCatalog) params.fullCatalog = 'true';
  if (opts?.track) params.track = opts.track;
  return api
    .get<Certification[]>(API_PATHS.learner('certifications'), {
      params: Object.keys(params).length ? params : undefined,
    })
    .then((r) => r.data);
};

export interface LearnerCertificationEarned {
  id: number;
  name: string;
  issuer: string;
  progress: number;
  issueDate: string;
  expiryDate?: string;
  score?: string;
  courseId?: string;
}

export interface LearnerCertificationInProgress {
  id: number;
  name: string;
  issuer: string;
  progress: number;
  estimatedCompletion?: string;
  nextExam?: string;
  preparationCourse?: string;
  courseId?: string;
}

export interface LearnerCertificationStatus {
  earned: LearnerCertificationEarned[];
  inProgress: LearnerCertificationInProgress[];
}

export interface LearnerCertificationDiagnostic {
  certificationId: number;
  certificationTitle: string;
  available: boolean;
  linkedCourses: Array<{ id: number; courseId: string; title: string }>;
  progressByCourse: Array<{ courseId: string; status: string; overallProgress: number }>;
  failureClass: 'no_linked_course' | 'unavailable' | 'not_enrolled' | 'in_progress' | 'earned';
}

export interface IssuedLearnerCertificate {
  id: number;
  certificationId: number;
  title: string;
  issuer: string;
  issuedAt: string;
  verificationCode: string;
  metadata: Record<string, unknown>;
}

/** Learner endpoint: earned and in-progress certifications. */
export const getLearnerCertificationsStatus = () =>
  api.get<LearnerCertificationStatus>(API_PATHS.learner('certifications/status')).then((r) => r.data);

export const getLearnerCertificationDiagnostics = () =>
  api
    .get<LearnerCertificationDiagnostic[]>(API_PATHS.learner('certifications/diagnostics'))
    .then((r) => r.data);

export const getIssuedLearnerCertificates = () =>
  api
    .get<IssuedLearnerCertificate[]>(API_PATHS.learner('certifications/issued'))
    .then((r) => r.data);

export const verifyLearnerCertificate = (verificationCode: string) =>
  publicApi
    .get<{
      valid: boolean;
      verificationCode: string;
      certificateId: string;
      title: string;
      issuer: string;
      issuedAt: string;
      recipientFullName: string;
      courseTitle: string | null;
    }>(`/api/certificates/verify/${verificationCode}`)
    .then((r) => r.data);

export const verifyLearnerCertificatePrivate = (verificationCode: string) =>
  api
    .get<{ valid: boolean; verificationCode: string; title: string; issuer: string; issuedAt: string }>(
      API_PATHS.learner(`certifications/verify/${verificationCode}`)
    )
    .then((r) => r.data);

export const downloadLearnerIssuedCertificatePdf = (issuedId: number) =>
  api.get<Blob>(API_PATHS.learner(`certifications/issued/${issuedId}/download`), {
    responseType: 'blob',
  });

export const downloadLearnerCertificatePdf = (certificationId: number) =>
  api.get<Blob>(API_PATHS.learner(`certifications/${certificationId}/download`), {
    responseType: 'blob',
  });

/** Enroll current user in a certification (POST api/learner/certifications/:id/enroll, JWT). */
export const enrollInCertification = (certificationId: number) =>
  api.post<{ message: string; enrolled: boolean }>(`${API_PATHS.learner('certifications/' + certificationId + '/enroll')}`).then((r) => r.data);

export interface CertificationsParams {
  search?: string;
  status?: 'Active' | 'Draft' | 'Archived';
  provider?: string;
}

export type CertificationPathStepType =
  | 'course'
  | 'lab'
  | 'assessment'
  | 'quiz'
  | 'practice_exam'
  | 'final_certificate';

export interface CertificationPathStep {
  id?: string;
  stepOrder: number;
  stepType: CertificationPathStepType;
  stepRef: string;
  title: string;
  description?: string | null;
  completed?: boolean;
}

export interface LearnerCertificationPath {
  certificationId: number;
  certificationTitle: string;
  totalSteps: number;
  completedSteps: number;
  progressPercent?: number;
  steps: CertificationPathStep[];
}

export interface LearnerCertificationExperience {
  certification: {
    id: number;
    title: string;
    provider: string;
    examCode: string | null;
    domain: string | null;
    level: string | null;
    estimatedHours: number | null;
    description: string;
    badgeColor: string | null;
    finalExamTips: string[];
    resources: Record<string, unknown>;
  };
  linkedCourse: {
    id: number;
    courseId: string;
    title: string;
    description: string;
  } | null;
  /** All courses linked to this certification (path order first, then stable sort). */
  linkedCourses?: Array<{
    id: number;
    courseId: string;
    title: string;
    description: string;
  }>;
  roadmap: {
    totalSteps: number;
    completedSteps: number;
    progressPercent: number;
    steps: Array<{
      id: string;
      stepOrder: number;
      stepType:
        | 'course'
        | 'lab'
        | 'assessment'
        | 'quiz'
        | 'practice_exam'
        | 'final_certificate';
      stepRef: string;
      title: string;
      description?: string;
      completed?: boolean;
      estimatedMinutes?: number;
      skillGain?: string;
      recommended?: boolean;
      ctaLabel?: string;
    }>;
  };
  progress: {
    enrollmentStatus: 'in_progress' | 'not_started';
    courseProgressPercent: number;
    completedLessons: number;
    totalLessons: number;
    completedLabs: number;
    totalLabs: number;
    totalModules: number;
  };
  readiness: {
    percent: number;
    message: string;
    nextRecommendedStep: {
      stepOrder: number;
      stepType:
        | 'course'
        | 'lab'
        | 'assessment'
        | 'quiz'
        | 'practice_exam'
        | 'final_certificate';
      stepRef: string;
      title: string;
    } | null;
  };
  nextRecommendedAction: {
    type: string;
    title: string;
    stepRef: string;
    action: string;
  };
  weakAreas: string[];
  quizAverage: number;
  practiceExamStatus: 'not_started' | 'in_progress' | 'ready';
  estimatedExamReadinessDate: string;
  careerOutcomes: {
    roleFocus: string;
    salaryPotentialBand: string;
    valueProposition: string;
    jobOpportunitiesUnlocked: string[];
  };
  nextCertificationSuggestions: string[];
  studyPlanner: {
    recommendedWeeklyHours: number;
    targetWeeks: number;
    milestones: string[];
  };
  streak: {
    daysActive: number;
    weeklyGoalDays: number;
    onTrack: boolean;
    longestStreak: number;
    history: Array<{ date: string; active: boolean }>;
  };
  gamification: {
    xp: number;
    level: number;
    milestones: Array<{ key: string; unlocked: boolean }>;
    timeline: Array<{ date: string; label: string; xpGained: number }>;
  };
  weeklyPlanner: Array<{
    date: string;
    plannedMinutes: number;
    theme: string;
    task: string;
    completed: boolean;
  }>;
  practiceExamHub: {
    totalAttempts: number;
    averageScore: number;
    bestScore: number;
    passRate: number;
    trend: number;
    attempts: Array<{
      id: number;
      score: number;
      status: string;
      completedAt: string;
      timeSpent: string | null;
    }>;
  };
  issuedCertificate: unknown | null;
}

export const getCertifications = (params?: CertificationsParams) =>
  api.get<Certification[]>(base(), { params }).then((r) => r.data);

export const getCertificationPathAdmin = (id: number) =>
  api.get<CertificationPathStep[]>(`${base()}/${id}/path`).then((r) => r.data);

export const updateCertificationPathAdmin = (id: number, steps: Omit<CertificationPathStep, 'id' | 'stepOrder'>[]) =>
  api.put<CertificationPathStep[]>(`${base()}/${id}/path`, { steps }).then((r) => r.data);

export const getLearnerCertificationPath = (id: number) =>
  api.get<LearnerCertificationPath>(API_PATHS.learner(`certifications/${id}/path`)).then((r) => r.data);

export const getLearnerCertificationExperience = (id: number) =>
  api
    .get<LearnerCertificationExperience>(API_PATHS.learner(`certifications/${id}/experience`))
    .then((r) => r.data);

export const createCertification = (data: CreateCertificationDto) =>
  api.post<Certification>(base(), data).then((r) => r.data);

export const updateCertification = (id: number, data: UpdateCertificationDto) =>
  api.put<Certification>(`${base()}/${id}`, data).then((r) => r.data);

export const deleteCertification = (id: number) =>
  api.delete<void>(`${base()}/${id}`).then((r) => r.data);

export const toggleCertificationAvailability = (
  id: number,
  data: ToggleAvailabilityDto
) =>
  api
    .patch<Certification>(`${base()}/${id}/availability`, data)
    .then((r) => r.data);

export const getAdminContentCertifications = (params?: CertificationsParams) =>
  api.get<Certification[]>(API_PATHS.admin('content/certifications'), { params }).then((r) => r.data);

export const createAdminContentCertification = (data: CreateCertificationDto) =>
  api.post<Certification>(API_PATHS.admin('content/certifications'), data).then((r) => r.data);

export const updateAdminContentCertification = (id: number, data: UpdateCertificationDto) =>
  api.patch<Certification>(API_PATHS.admin(`content/certifications/${id}`), data).then((r) => r.data);

export const getAdminCertificationFull = (id: number) =>
  api.get(API_PATHS.admin(`content/certifications/${id}/full`)).then((r) => r.data);

export const deleteAdminContentCertification = (id: number) =>
  api.delete(API_PATHS.admin(`content/certifications/${id}`)).then((r) => r.data);

/**
 * Imports certifications. Accepts either:
 *   - the nested certif_courses-compatible shape `{ certifications: [...] }`
 *     (preferred — also imports modules, lessons, quizzes, course-labs)
 *   - the legacy flat array of certification items.
 */
export const importCertificationsJson = (
  payload: Record<string, unknown> | Array<Record<string, unknown>>,
  dryRun = true,
) => api.post(API_PATHS.admin('content/import/certifications-json'), { payload, dryRun }).then((r) => r.data);

/** Backwards-compatible object for consumers expecting certificationsService */
export const certificationsService = {
  findAll: getCertifications,
  create: createCertification,
  update: updateCertification,
  remove: deleteCertification,
  toggleAvailability: toggleCertificationAvailability,
};
