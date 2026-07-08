import { api, API_PATHS } from '@/lib/api/client';

export interface CompanyEmployee {
  id: number;
  name: string;
  email: string;
  position: string | null;
  status: string;
  requestDate: string | null;
}

export interface CompanyPublication {
  id: number;
  title: string;
  date: string | null;
  publicationType: string | null;
}

export interface Company {
  id: string; // UUID
  name: string;
  email: string | null;
  sector: string | null;
  status: string;
  logo: string | null;
  description: string | null;
  location: string | null;
  website: string | null;
  ownerId?: number;
  employees: CompanyEmployee[];
  publications: CompanyPublication[];
}

const base = () => API_PATHS.companies('');

export interface PaginatedCompaniesResponse {
  data: Company[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export const getCompanies = (params?: {
  status?: string;
  search?: string;
  page?: number;
  limit?: number;
}): Promise<PaginatedCompaniesResponse> => {
  const searchParams = new URLSearchParams();
  if (params?.status) searchParams.set('status', params.status);
  if (params?.search) searchParams.set('search', params.search);
  if (params?.page) searchParams.set('page', String(params.page));
  if (params?.limit) searchParams.set('limit', String(params.limit));
  const qs = searchParams.toString();
  const url = base();
  return api.get<PaginatedCompaniesResponse>(qs ? `${url}?${qs}` : url).then((r) => r.data);
};

export const getCompany = (id: string): Promise<Company> =>
  api.get<Company>(API_PATHS.companies(id)).then((r) => r.data);

export const createCompany = (data: Partial<Company>): Promise<Company> =>
  api.post<Company>(API_PATHS.companies(''), data).then((r) => r.data);

export const updateCompany = (id: string, data: Partial<Company>): Promise<Company> =>
  api.patch<Company>(API_PATHS.companies(id), data).then((r) => r.data);

export const deleteCompany = (id: string): Promise<void> =>
  api.delete(API_PATHS.companies(id)).then(() => {});

export const updateEmployeeStatus = (
  companyId: string,
  employeeId: number,
  status: string,
): Promise<CompanyEmployee> =>
  api
    .patch<CompanyEmployee>(`${API_PATHS.companies(companyId)}/employees/${employeeId}/status`, { status })
    .then((r) => r.data);

export const addEmployee = (
  companyId: string,
  data: { name: string; email: string; position: string },
): Promise<CompanyEmployee> =>
  api.post<CompanyEmployee>(`${API_PATHS.companies(companyId)}/employees`, data).then((r) => r.data);