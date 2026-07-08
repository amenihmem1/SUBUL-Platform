import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  getCompanies,
  getCompany,
  createCompany,
  updateCompany,
  deleteCompany,
  updateEmployeeStatus,
  addEmployee,
  type Company,
} from '@/services/companies';

export const companiesKeys = {
  all: ['companies'] as const,
  list: (filters?: { status?: string; search?: string; page?: number; limit?: number }) =>
    [...companiesKeys.all, 'list', filters] as const,
  detail: (id: string) => [...companiesKeys.all, 'detail', id] as const,
};

export function useCompanies(filters?: { status?: string; search?: string; page?: number; limit?: number }) {
  return useQuery({
    queryKey: companiesKeys.list(filters),
    queryFn: () => getCompanies(filters),
  });
}

export function useCompany(id: string | null) {
  return useQuery({
    queryKey: companiesKeys.detail(id ?? ''),
    queryFn: () => getCompany(id!),
    enabled: !!id,
  });
}

export function useUpdateCompany() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<Company> }) =>
      updateCompany(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: companiesKeys.all });
    },
  });
}

export function useDeleteCompany() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteCompany(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: companiesKeys.all });
    },
  });
}

export function useUpdateEmployeeStatus() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      companyId,
      employeeId,
      status,
    }: {
      companyId: string;
      employeeId: number;
      status: string;
    }) => updateEmployeeStatus(companyId, employeeId, status),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: companiesKeys.all });
    },
  });
}

export function useAddEmployee() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      companyId,
      data,
    }: {
      companyId: string;
      data: { name: string; email: string; position: string };
    }) => addEmployee(companyId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: companiesKeys.all });
    },
  });
}
