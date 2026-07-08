import api from '@/lib/api/client';

/* ── University Admin (self) ── */
export const UniversityService = {
  getMyUniversity: () => api.get('/api/university/dashboard').then(r => r.data),
  updateProfile: (data: Record<string, unknown>) => api.patch('/api/university/me', data).then(r => r.data),

  listStudents: (params?: Record<string, unknown>) =>
    api.get('/api/university/students', { params }).then(r => r.data),

  listMemberships: (params?: Record<string, unknown>) =>
    api.get('/api/university/memberships', { params }).then(r => r.data),
  updateMembership: (id: string, data: Record<string, unknown>) =>
    api.patch(`/api/university/memberships/${id}`, data).then(r => r.data),

  listInvites: (status?: string) =>
    api.get('/api/university/invites', { params: status ? { status } : {} }).then(r => r.data),
  sendInvite: (data: Record<string, unknown>) =>
    api.post('/api/university/invites', data).then(r => r.data),
  bulkInvite: (rows: Record<string, unknown>[]) =>
    api.post('/api/university/invites/bulk', { rows }).then(r => r.data),
  resendInvite: (id: string) =>
    api.post(`/api/university/invites/${id}/resend`).then(r => r.data),
  cancelInvite: (id: string) =>
    api.delete(`/api/university/invites/${id}`).then(r => r.data),

  listCohorts: () => api.get('/api/university/cohorts').then(r => r.data),
  createCohort: (data: Record<string, unknown>) =>
    api.post('/api/university/cohorts', data).then(r => r.data),
  updateCohort: (id: string, data: Record<string, unknown>) =>
    api.patch(`/api/university/cohorts/${id}`, data).then(r => r.data),
  deleteCohort: (id: string) =>
    api.delete(`/api/university/cohorts/${id}`).then(r => r.data),

  listDepartments: () => api.get('/api/university/departments').then(r => r.data),
  createDepartment: (data: Record<string, unknown>) =>
    api.post('/api/university/departments', data).then(r => r.data),
  updateDepartment: (id: string, data: Record<string, unknown>) =>
    api.patch(`/api/university/departments/${id}`, data).then(r => r.data),
  deleteDepartment: (id: string) =>
    api.delete(`/api/university/departments/${id}`).then(r => r.data),

  listPrograms: () => api.get('/api/university/programs').then(r => r.data),
  createProgram: (data: Record<string, unknown>) =>
    api.post('/api/university/programs', data).then(r => r.data),
  updateProgram: (programId: string, data: Record<string, unknown>) =>
    api.patch(`/api/university/programs/${programId}`, data).then(r => r.data),
  deleteProgram: (programId: string) =>
    api.delete(`/api/university/programs/${programId}`).then(r => r.data),
  listProgramEnrollments: (programId: string) =>
    api.get(`/api/university/programs/${programId}/enrollments`).then(r => r.data),
  updateStudent: (id: number, data: Record<string, unknown>) =>
    api.patch(`/api/university/students/${id}`, data).then(r => r.data),
  removeStudent: (id: number, programId?: string) =>
    api
      .delete(`/api/university/students/${id}`, { params: programId ? { programId } : {} })
      .then(r => r.data),

  /** Placeholder until CSV parsing + validation pipeline ships */
  csvImportStub: () => api.post('/api/university/programs/import-students').then(r => r.data),

  listLicenses: () => api.get('/api/university/licenses').then(r => r.data),
  getAuditLog: (limit = 50) =>
    api.get('/api/university/audit-log', { params: { limit } }).then(r => r.data),
  getAnalytics: () => api.get('/api/university/dashboard').then(r => r.data),
};

/* ── Super Admin — University Management ── */
export const AdminUniversityService = {
  list: (params?: Record<string, unknown>) =>
    api.get('/api/admin/universities', { params }).then(r => r.data),
  getExpiringSoon: () =>
    api.get('/api/admin/universities/expiring-soon').then(r => r.data),
  get: (id: string) =>
    api.get(`/api/admin/universities/${id}`).then(r => r.data),
  create: (data: Record<string, unknown>) =>
    api.post('/api/admin/universities', data).then(r => r.data),
  update: (id: string, data: Record<string, unknown>) =>
    api.patch(`/api/admin/universities/${id}`, data).then(r => r.data),
  resendSetup: (id: string) =>
    api.post(`/api/admin/universities/${id}/resend-setup`).then(r => r.data),
  listMembers: (id: string, params?: Record<string, unknown>) =>
    api.get(`/api/admin/universities/${id}/members`, { params }).then(r => r.data),
  addMember: (id: string, data: Record<string, unknown>) =>
    api.post(`/api/admin/universities/${id}/members`, data).then(r => r.data),
  removeMember: (id: string, userId: number) =>
    api.delete(`/api/admin/universities/${id}/members/${userId}`).then(r => r.data),
  listLicenses: (id: string) =>
    api.get(`/api/admin/universities/${id}/licenses`).then(r => r.data),
  assignLicense: (id: string, data: Record<string, unknown>) =>
    api.post(`/api/admin/universities/${id}/licenses`, data).then(r => r.data),
  updateLicense: (id: string, licId: string, data: Record<string, unknown>) =>
    api.patch(`/api/admin/universities/${id}/licenses/${licId}`, data).then(r => r.data),
  getAnalytics: (id: string) =>
    api.get(`/api/admin/universities/${id}/analytics`).then(r => r.data),
  getAuditLog: (id: string, limit = 50) =>
    api.get(`/api/admin/universities/${id}/audit-log`, { params: { limit } }).then(r => r.data),
};
