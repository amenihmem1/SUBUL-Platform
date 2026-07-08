import { api, API_PATHS } from '@/lib/api/client';
import type { JobDto } from './jobs';

export interface EmployerDashboard {
  stats: {
    activeJobs: string;
    pendingJobs: string;
    totalJobs: string;
    totalEmployees?: string;
    totalCertifiedLearners?: string;
  };
  recentCandidatures: Array<{ id: number; name: string; poste: string; date: string; status: string }>;
  upcomingInterviews: Array<{ id: number; name: string; poste: string; date: string; heure: string }>;
  company: { id: string; name: string; email: string | null; sector?: string; logo?: string } | null;
}

export interface Candidate {
  id: number;
  employerId: number;
  jobId: number | string;
  userId: number;
  name: string;
  email: string;
  phone?: string;
  resumeUrl?: string;
  coverLetter?: string;
  status: 'pending' | 'review' | 'interview' | 'accepted' | 'rejected';
  appliedAt?: string;
  notes?: string;
  telephone?: string;
  poste?: string;
  datePostulation?: string;
  score?: number;
  experience?: string;
  competences?: string[];
  cv?: boolean;
  notified?: boolean;
}

export interface Interview {
  id: number;
  employerId: number;
  candidateId?: number;
  jobId?: number;
  title: string;
  description?: string;
  scheduledAt: string;
  durationMinutes: number;
  meetingUrl?: string;
  status: 'scheduled' | 'confirmed' | 'completed' | 'cancelled';
  meetingType: 'video' | 'phone' | 'in-person';
  location?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
  candidate?: { name: string };
  candidatName?: string;
  candidatEmail?: string;
  poste?: string;
  date?: string;
  heure?: string;
  duree?: string;
  type?: string;
  lieu?: string;
}

export interface Company {
  id: number;
  name: string;
  email: string;
  sector?: string;
  logo?: string;
  description?: string;
  location?: string;
  website?: string;
  phone?: string;
  companySize?: string;
  [key: string]: unknown;
}

export interface Employee {
  id: number;
  employerId: number;
  userId?: number;
  name: string;
  email: string;
  position?: string;
  department?: string;
  learnerStatus: 'pending' | 'active' | 'inactive';
  enrolledAt?: string;
  coursesInProgress: number;
  coursesCompleted: number;
  certifications: number;
  progression: number;
  createdAt: string;
  updatedAt: string;
}

export interface CertifiedLearner {
  id: number;
  employerId: number;
  userId?: number;
  name: string;
  email: string;
  certification: string;
  domain?: string;
  obtainedAt: string;
  score: number;
  level: 'beginner' | 'intermediate' | 'advanced' | 'expert';
  available: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
}

const base = () => API_PATHS.employer();

export const getEmployerDashboard = (): Promise<EmployerDashboard> =>
  api.get<EmployerDashboard>(`${base()}/dashboard`).then((r) => r.data);

export const getCandidates = (params?: {
  status?: string;
  jobId?: string;
}): Promise<Candidate[]> => {
  const searchParams = new URLSearchParams();
  if (params?.status) searchParams.set('status', params.status);
  if (params?.jobId) searchParams.set('jobId', params.jobId);
  const qs = searchParams.toString();
  const url = `${base()}/candidates${qs ? `?${qs}` : ''}`;
  return api.get<Candidate[]>(url).then((r) => r.data);
};

export const getCandidate = (id: number): Promise<Candidate> =>
  api.get<Candidate>(`${base()}/candidates/${id}`).then((r) => r.data);

export const updateCandidateStatus = (id: number, status: string): Promise<Candidate> =>
  api.patch<Candidate>(`${base()}/candidates/${id}/status`, { status }).then((r) => r.data);

export const getInterviews = (): Promise<Interview[]> =>
  api.get<Interview[]>(`${base()}/interviews`).then((r) => r.data);

export const createInterview = (data: Record<string, unknown>): Promise<Interview> =>
  api.post<Interview>(`${base()}/interviews`, data).then((r) => r.data);

export const updateInterview = (id: number, data: Record<string, unknown>): Promise<Interview> =>
  api.patch<Interview>(`${base()}/interviews/${id}`, data).then((r) => r.data);

export const deleteInterview = (id: number): Promise<void> =>
  api.delete(`${base()}/interviews/${id}`).then(() => {});

export const getCompany = (): Promise<Company> =>
  api.get<Company>(`${base()}/company`).then((r) => r.data);

export const getEmployerJobs = (params?: { page?: number; limit?: number }): Promise<PaginatedResponse<JobDto>> => {
  const searchParams = new URLSearchParams();
  if (params?.page) searchParams.set('page', String(params.page));
  if (params?.limit) searchParams.set('limit', String(params.limit));
  const qs = searchParams.toString();
  const url = `${base()}/jobs${qs ? `?${qs}` : ''}`;
  return api.get<PaginatedResponse<JobDto>>(url).then((r) => r.data);
};

export const updateCompany = (data: Partial<Record<string, any>>): Promise<Company> =>
  api.patch<Company>(`${base()}/company`, data).then((r) => r.data);

export const getEmployees = (params?: { page?: number; limit?: number }): Promise<PaginatedResponse<Employee>> => {
  const searchParams = new URLSearchParams();
  if (params?.page) searchParams.set('page', String(params.page));
  if (params?.limit) searchParams.set('limit', String(params.limit));
  const qs = searchParams.toString();
  const url = `${base()}/employees${qs ? `?${qs}` : ''}`;
  return api.get<PaginatedResponse<Employee>>(url).then((r) => r.data);
};

export const getEmployee = (id: number): Promise<Employee> =>
  api.get<Employee>(`${base()}/employees/${id}`).then((r) => r.data);

export const createEmployee = (data: { name: string; email: string; position?: string; department?: string }): Promise<Employee> =>
  api.post<Employee>(`${base()}/employees`, data).then((r) => r.data);

export const updateEmployee = (id: number, data: Partial<Employee>): Promise<Employee> =>
  api.patch<Employee>(`${base()}/employees/${id}`, data).then((r) => r.data);

export const deleteEmployee = (id: number): Promise<void> =>
  api.delete(`${base()}/employees/${id}`).then(() => {});

export const getCertifiedLearners = (params?: {
  page?: number;
  limit?: number;
  domain?: string;
  level?: string;
}): Promise<PaginatedResponse<CertifiedLearner>> => {
  const searchParams = new URLSearchParams();
  if (params?.page) searchParams.set('page', String(params.page));
  if (params?.limit) searchParams.set('limit', String(params.limit));
  if (params?.domain) searchParams.set('domain', params.domain);
  if (params?.level) searchParams.set('level', params.level);
  const qs = searchParams.toString();
  const url = `${base()}/certified-learners${qs ? `?${qs}` : ''}`;
  return api.get<PaginatedResponse<CertifiedLearner>>(url).then((r) => r.data);
};

export const getCertifiedLearner = (id: number): Promise<CertifiedLearner> =>
  api.get<CertifiedLearner>(`${base()}/certified-learners/${id}`).then((r) => r.data);

export const createCertifiedLearner = (data: {
  name: string;
  email: string;
  certification: string;
  domain?: string;
  score?: number;
  level?: string;
  available?: boolean;
}): Promise<CertifiedLearner> =>
  api.post<CertifiedLearner>(`${base()}/certified-learners`, data).then((r) => r.data);

export const updateCertifiedLearner = (id: number, data: Partial<CertifiedLearner>): Promise<CertifiedLearner> =>
  api.patch<CertifiedLearner>(`${base()}/certified-learners/${id}`, data).then((r) => r.data);

export const deleteCertifiedLearner = (id: number): Promise<void> =>
  api.delete(`${base()}/certified-learners/${id}`).then(() => {});