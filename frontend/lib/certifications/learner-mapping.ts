/**
 * Maps backend certification format to learner format.
 * Used when mapping the learner API response (GET /api/learner/certifications)
 * or any certification list with BackendCertification shape to the
 * LearnerCertification UI shape used by learner pages (cours, certifications) and CV Booster.
 */

const colorMap: Record<string, string> = {
  AWS: 'from-orange-400 to-yellow-300',
  'Amazon Web Services': 'from-orange-400 to-yellow-300',
  Microsoft: 'from-blue-500 to-cyan-400',
  'Microsoft Azure': 'from-blue-500 to-cyan-400',
  Google: 'from-blue-400 to-green-400',
  'Google Cloud': 'from-blue-400 to-green-400',
  NVIDIA: 'from-green-500 to-emerald-400',
  CNCF: 'from-blue-600 to-indigo-500',
  Kubernetes: 'from-blue-600 to-indigo-500',
  HashiCorp: 'from-purple-500 to-violet-400',
  Terraform: 'from-purple-500 to-violet-400',
};

const iconMap: Record<string, string> = {
  AWS: '☁️',
  'Amazon Web Services': '☁️',
  Microsoft: '🪟',
  'Microsoft Azure': '🪟',
  Google: '🔍',
  'Google Cloud': '🔍',
  NVIDIA: '🎮',
  CNCF: '⚓',
  Kubernetes: '⚓',
  HashiCorp: '🏗️',
  Terraform: '🏗️',
};

function resolveCourseId(courses?: { courseId?: string }[]): string | null {
  if (!courses || courses.length === 0) return null;
  const unified = courses.find((c) => c.courseId?.includes('UNIFIED'));
  if (unified?.courseId) return unified.courseId;
  const foundation = courses.find((c) => /FOUNDATION|101|FUNDAMENTALS/i.test(c.courseId ?? ''));
  if (foundation?.courseId) return foundation.courseId;
  const sorted = [...courses].sort((a, b) => (a.courseId ?? '').localeCompare(b.courseId ?? ''));
  return sorted[0]?.courseId ?? null;
}

export interface BackendCertification {
  id: number;
  title: string;
  provider: string;
  description?: string;
  students?: number;
  completion?: number;
  status?: string;
  available?: boolean;
  courses?: { courseId?: string }[];
  duration?: string;
  price?: string;
  updatedAt?: string;
  createdAt?: string;
  level?: string;
  domain?: string;
}

export interface LearnerCertification {
  id: number;
  courseId: string | null;
  name: string;
  issuer: string;
  duration: string;
  cost: string;
  description: string;
  students: number;
  completion: number;
  color: string;
  icon: string;
  lastUpdated: string;
  difficulty: string;
  domain: string | null;
  rating: number | null;
  prerequisites: string[] | null;
}

export function mapToLearnerCertifications(
  certs: BackendCertification[]
): LearnerCertification[] {
  return certs
    .filter((cert) => cert.available === true)
    .map((cert) => ({
      id: cert.id,
      courseId: resolveCourseId(cert.courses),
      name: cert.title,
      issuer: cert.provider,
      duration: cert.duration ?? 'N/A',
      cost: cert.price ?? 'N/A',
      description: cert.description ?? '',
      students: cert.students ?? 0,
      completion: cert.completion ?? 0,
      color: colorMap[cert.provider] ?? 'from-slate-400 to-slate-500',
      icon: iconMap[cert.provider] ?? '🏆',
      lastUpdated: cert.updatedAt ?? cert.createdAt ?? new Date().toISOString(),
      difficulty: cert.level ?? 'Intermediate',
      domain: cert.domain ?? null,
      rating: null,
      prerequisites: null,
    }));
}
