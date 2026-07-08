import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  getEmployerDashboard,
  getCandidates,
  getInterviews,
  createInterview,
  updateInterview,
  deleteInterview,
  getCompany,
  updateCompany,
  updateCandidateStatus,
  getEmployerJobs,
  getEmployees,
  getEmployee,
  createEmployee,
  updateEmployee,
  deleteEmployee,
  getCertifiedLearners,
  getCertifiedLearner,
  createCertifiedLearner,
  updateCertifiedLearner,
  deleteCertifiedLearner,
} from '@/services/employer';

export const employerKeys = {
  all: ['employer'] as const,
  dashboard: () => [...employerKeys.all, 'dashboard'] as const,
  candidates: (filters?: { status?: string; jobId?: string }) =>
    [...employerKeys.all, 'candidates', filters] as const,
  interviews: () => [...employerKeys.all, 'interviews'] as const,
  company: () => [...employerKeys.all, 'company'] as const,
  jobs: (params?: { page?: number; limit?: number }) =>
    [...employerKeys.all, 'jobs', params] as const,
  employees: (params?: { page?: number; limit?: number }) =>
    [...employerKeys.all, 'employees', params] as const,
  certifiedLearners: (params?: { page?: number; limit?: number; domain?: string; level?: string }) =>
    [...employerKeys.all, 'certified-learners', params] as const,
};

export function useEmployerDashboard() {
  return useQuery({
    queryKey: employerKeys.dashboard(),
    queryFn: getEmployerDashboard,
  });
}

export function useEmployerJobs(params?: { page?: number; limit?: number }) {
  return useQuery({
    queryKey: employerKeys.jobs(params),
    queryFn: () => getEmployerJobs(params),
  });
}

export function useCandidates(filters?: { status?: string; jobId?: string }) {
  return useQuery({
    queryKey: employerKeys.candidates(filters),
    queryFn: () => getCandidates(filters),
  });
}

export function useInterviews() {
  return useQuery({
    queryKey: employerKeys.interviews(),
    queryFn: getInterviews,
  });
}

export function useEmployerCompany() {
  return useQuery({
    queryKey: employerKeys.company(),
    queryFn: getCompany,
  });
}

export function useUpdateEmployerCompany() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: Record<string, unknown>) => updateCompany(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: employerKeys.all });
    },
  });
}

export function useUpdateCandidateStatus() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, status }: { id: number; status: string }) =>
      updateCandidateStatus(id, status),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: employerKeys.all });
    },
  });
}

export function useCreateInterview() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: Record<string, unknown>) => createInterview(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: employerKeys.all });
    },
  });
}

export function useUpdateInterview() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: Record<string, unknown> }) =>
      updateInterview(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: employerKeys.all });
    },
  });
}

export function useDeleteInterview() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: deleteInterview,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: employerKeys.all });
    },
  });
}

export function useEmployees(params?: { page?: number; limit?: number }) {
  return useQuery({
    queryKey: employerKeys.employees(params),
    queryFn: () => getEmployees(params),
  });
}

export function useEmployee(id: number) {
  return useQuery({
    queryKey: [...employerKeys.employees(), id] as const,
    queryFn: () => getEmployee(id),
    enabled: !!id,
  });
}

export function useCreateEmployee() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: { name: string; email: string; position?: string; department?: string }) =>
      createEmployee(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: employerKeys.employees() });
    },
  });
}

export function useUpdateEmployee() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: Record<string, unknown> }) =>
      updateEmployee(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: employerKeys.employees() });
    },
  });
}

export function useDeleteEmployee() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: deleteEmployee,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: employerKeys.employees() });
    },
  });
}

export function useCertifiedLearners(params?: { page?: number; limit?: number; domain?: string; level?: string }) {
  return useQuery({
    queryKey: employerKeys.certifiedLearners(params),
    queryFn: () => getCertifiedLearners(params),
  });
}

export function useCertifiedLearner(id: number) {
  return useQuery({
    queryKey: [...employerKeys.certifiedLearners(), id] as const,
    queryFn: () => getCertifiedLearner(id),
    enabled: !!id,
  });
}

export function useCreateCertifiedLearner() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: {
      name: string;
      email: string;
      certification: string;
      domain?: string;
      score?: number;
      level?: string;
      available?: boolean;
    }) => createCertifiedLearner(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: employerKeys.certifiedLearners() });
    },
  });
}

export function useUpdateCertifiedLearner() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: Record<string, unknown> }) =>
      updateCertifiedLearner(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: employerKeys.certifiedLearners() });
    },
  });
}

export function useDeleteCertifiedLearner() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: deleteCertifiedLearner,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: employerKeys.certifiedLearners() });
    },
  });
}
