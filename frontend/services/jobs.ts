import { api, API_PATHS } from '@/lib/api/client';

export interface JobDto {
  id: string; // UUID
  title: string;
  companyId: string;
  employerId: number;
  location: string;
  contractType: string;
  salary?: string;
  description: string;
  skills: string[];
  domain: string;
  postedAt: string;
  deadline?: string;
  status: 'pending' | 'published' | 'rejected' | 'archived';
  previousStatus?: string;
  adminNotes?: string;
  rejectionReason?: string;
  company?: {
    id: string;
    name: string;
    logo?: string;
  };
  tags?: string[];
}

export const getJobs = (page?: number, limit?: number): Promise<{ data: JobDto[]; total: number }> =>
  api
    .get<{ data: JobDto[]; total: number }>(API_PATHS.jobs(), {
      params: { page, limit },
    })
    .then((r) => r.data);

export const getJobById = (id: string): Promise<JobDto> =>
  api.get<JobDto>(API_PATHS.jobs(id)).then((r) => r.data);

/** Backend returns { job, message } for create/update */
export const createJob = (data: Partial<JobDto>): Promise<JobDto> =>
  api.post<{ job: JobDto; message: string }>(API_PATHS.jobs(), data).then((r) => r.data.job);

export const updateJob = (id: string, data: Partial<JobDto>): Promise<JobDto> =>
  api.patch<{ job: JobDto; message: string }>(API_PATHS.jobs(id), data).then((r) => r.data.job);

export const deleteJob = (id: string): Promise<void> =>
  api.delete(API_PATHS.jobs(id)).then(() => undefined);
