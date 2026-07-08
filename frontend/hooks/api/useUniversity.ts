import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { UniversityService, AdminUniversityService } from '@/services/university';
import { toast } from 'sonner';

/* ── University Admin hooks ── */

export const useUniversityDashboard = () =>
  useQuery({ queryKey: ['university', 'dashboard'], queryFn: UniversityService.getMyUniversity });

export const useUniversityPrograms = (params?: { page?: number; limit?: number }) =>
  useQuery({
    queryKey: ['university', 'programs', params],
    queryFn: async () => {
      const raw = await UniversityService.listPrograms();
      const arr = Array.isArray(raw) ? raw : [];
      const page = params?.page ?? 1;
      const limit = params?.limit ?? 10;
      const start = (page - 1) * limit;
      return { data: arr.slice(start, start + limit), total: arr.length };
    },
  });

export const useCreateUniversityProgram = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: UniversityService.createProgram,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['university', 'programs'] });
      qc.invalidateQueries({ queryKey: ['university', 'dashboard'] });
      toast.success('Program created');
    },
    onError: () => toast.error('Failed to create program'),
  });
};

export const useUpdateUniversityProgram = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Record<string, unknown> }) =>
      UniversityService.updateProgram(id, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['university', 'programs'] });
      toast.success('Program updated');
    },
    onError: () => toast.error('Failed to update program'),
  });
};

export const useDeleteUniversityProgram = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (programId: string) => UniversityService.deleteProgram(programId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['university', 'programs'] });
      qc.invalidateQueries({ queryKey: ['university', 'dashboard'] });
      toast.success('Program deleted');
    },
    onError: () => toast.error('Failed to delete program'),
  });
};

export const useProgramEnrollments = (programId: string, params?: { page?: number; limit?: number }) =>
  useQuery({
    queryKey: ['university', 'program-enrollments', programId, params],
    queryFn: async () => {
      const raw = await UniversityService.listProgramEnrollments(programId);
      const rows = (Array.isArray(raw) ? raw : []).map((e: Record<string, unknown>) => ({
        id: e.id as string,
        enrollmentId: e.id as string,
        userId: e.userId as number,
        status: (e.status as string) ?? 'invited',
        progress: (e.progress as number) ?? 0,
        enrolledAt: e.enrolledAt as string | undefined,
        completedAt: e.completedAt as string | undefined,
        user: e.user as { id: number; email: string; fullName?: string } | undefined,
      }));
      const page = params?.page ?? 1;
      const limit = params?.limit ?? 10;
      const start = (page - 1) * limit;
      return { data: rows.slice(start, start + limit), total: rows.length };
    },
    enabled: !!programId,
  });

export const useUpdateUniversityStudent = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: Record<string, unknown> }) =>
      UniversityService.updateStudent(id, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['university', 'program-enrollments'] });
      qc.invalidateQueries({ queryKey: ['university', 'students'] });
      toast.success('Student updated');
    },
    onError: () => toast.error('Failed to update student'),
  });
};

export const useRemoveUniversityStudent = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, programId }: { id: number; programId?: string }) =>
      UniversityService.removeStudent(id, programId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['university', 'program-enrollments'] });
      qc.invalidateQueries({ queryKey: ['university', 'students'] });
      toast.success('Student removed');
    },
    onError: () => toast.error('Failed to remove student'),
  });
};

export const useUniversityStudents = (params?: Record<string, unknown>) =>
  useQuery({ queryKey: ['university', 'students', params], queryFn: () => UniversityService.listStudents(params) });

export const useUniversityMemberships = (params?: Record<string, unknown>) =>
  useQuery({ queryKey: ['university', 'memberships', params], queryFn: () => UniversityService.listMemberships(params) });

export const useUpdateMembership = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Record<string, unknown> }) =>
      UniversityService.updateMembership(id, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['university', 'students'] });
      qc.invalidateQueries({ queryKey: ['university', 'memberships'] });
      qc.invalidateQueries({ queryKey: ['university', 'dashboard'] });
      toast.success('Membership updated');
    },
    onError: () => toast.error('Failed to update membership'),
  });
};

export const useUniversityInvites = (status?: string) =>
  useQuery({ queryKey: ['university', 'invites', status], queryFn: () => UniversityService.listInvites(status) });

export const useSendInvite = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: UniversityService.sendInvite,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['university', 'invites'] });
      qc.invalidateQueries({ queryKey: ['university', 'dashboard'] });
      toast.success('Invite sent');
    },
    onError: () => toast.error('Failed to send invite'),
  });
};

export const useBulkInvite = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: UniversityService.bulkInvite,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['university', 'invites'] });
      qc.invalidateQueries({ queryKey: ['university', 'dashboard'] });
    },
    onError: () => toast.error('Bulk invite failed'),
  });
};

export const useResendInvite = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: UniversityService.resendInvite,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['university', 'invites'] });
      toast.success('Invite resent');
    },
    onError: () => toast.error('Failed to resend invite'),
  });
};

export const useCancelInvite = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: UniversityService.cancelInvite,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['university', 'invites'] });
      qc.invalidateQueries({ queryKey: ['university', 'dashboard'] });
      toast.success('Invite cancelled');
    },
    onError: () => toast.error('Failed to cancel invite'),
  });
};

export const useUniversityCohorts = () =>
  useQuery({ queryKey: ['university', 'cohorts'], queryFn: UniversityService.listCohorts });

export const useCreateCohort = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: UniversityService.createCohort,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['university', 'cohorts'] });
      toast.success('Cohort created');
    },
    onError: () => toast.error('Failed to create cohort'),
  });
};

export const useUpdateCohort = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Record<string, unknown> }) =>
      UniversityService.updateCohort(id, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['university', 'cohorts'] });
      toast.success('Cohort updated');
    },
    onError: () => toast.error('Failed to update cohort'),
  });
};

export const useDeleteCohort = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: UniversityService.deleteCohort,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['university', 'cohorts'] });
      toast.success('Cohort deleted');
    },
    onError: () => toast.error('Failed to delete cohort'),
  });
};

export const useUniversityDepartments = () =>
  useQuery({ queryKey: ['university', 'departments'], queryFn: UniversityService.listDepartments });

export const useCreateDepartment = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: UniversityService.createDepartment,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['university', 'departments'] });
      toast.success('Department created');
    },
    onError: () => toast.error('Failed to create department'),
  });
};

export const useUpdateDepartment = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Record<string, unknown> }) =>
      UniversityService.updateDepartment(id, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['university', 'departments'] });
      toast.success('Department updated');
    },
    onError: () => toast.error('Failed to update department'),
  });
};

export const useDeleteDepartment = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: UniversityService.deleteDepartment,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['university', 'departments'] });
      toast.success('Department deleted');
    },
    onError: () => toast.error('Failed to delete department'),
  });
};

export const useUniversityLicenses = () =>
  useQuery({ queryKey: ['university', 'licenses'], queryFn: UniversityService.listLicenses });

export const useUniversityAuditLog = (limit = 50) =>
  useQuery({ queryKey: ['university', 'audit-log', limit], queryFn: () => UniversityService.getAuditLog(limit) });

export const useUniversityAnalytics = () =>
  useQuery({ queryKey: ['university', 'analytics'], queryFn: UniversityService.getAnalytics });

/* ── Super Admin University hooks ── */

export const useAdminUniversities = (params?: Record<string, unknown>) =>
  useQuery({ queryKey: ['admin', 'universities', params], queryFn: () => AdminUniversityService.list(params) });

export const useAdminUniversity = (id: string) =>
  useQuery({ queryKey: ['admin', 'universities', id], queryFn: () => AdminUniversityService.get(id), enabled: !!id });

export const useAdminUniversitiesExpiringSoon = () =>
  useQuery({ queryKey: ['admin', 'universities', 'expiring-soon'], queryFn: AdminUniversityService.getExpiringSoon });

export const useAdminCreateUniversity = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: AdminUniversityService.create,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin', 'universities'] });
      toast.success('University created and setup email sent');
    },
    onError: () => toast.error('Failed to create university'),
  });
};

export const useAdminUpdateUniversity = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Record<string, unknown> }) =>
      AdminUniversityService.update(id, data),
    onSuccess: (_, { id }) => {
      qc.invalidateQueries({ queryKey: ['admin', 'universities'] });
      qc.invalidateQueries({ queryKey: ['admin', 'universities', id] });
      toast.success('University updated');
    },
    onError: () => toast.error('Failed to update university'),
  });
};

export const useAdminResendSetup = () => {
  return useMutation({
    mutationFn: AdminUniversityService.resendSetup,
    onSuccess: () => toast.success('Setup email resent'),
    onError: () => toast.error('Failed to resend setup email'),
  });
};

export const useAdminUniversityMembers = (id: string, params?: Record<string, unknown>) =>
  useQuery({
    queryKey: ['admin', 'universities', id, 'members', params],
    queryFn: () => AdminUniversityService.listMembers(id, params),
    enabled: !!id,
  });

export const useAdminAddMember = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Record<string, unknown> }) =>
      AdminUniversityService.addMember(id, data),
    onSuccess: (_, { id }) => {
      qc.invalidateQueries({ queryKey: ['admin', 'universities', id, 'members'] });
      toast.success('Member added');
    },
    onError: () => toast.error('Failed to add member'),
  });
};

export const useAdminRemoveMember = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, userId }: { id: string; userId: number }) =>
      AdminUniversityService.removeMember(id, userId),
    onSuccess: (_, { id }) => {
      qc.invalidateQueries({ queryKey: ['admin', 'universities', id, 'members'] });
      toast.success('Member removed');
    },
    onError: () => toast.error('Failed to remove member'),
  });
};

export const useAdminUniversityLicenses = (id: string) =>
  useQuery({
    queryKey: ['admin', 'universities', id, 'licenses'],
    queryFn: () => AdminUniversityService.listLicenses(id),
    enabled: !!id,
  });

export const useAdminAssignLicense = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Record<string, unknown> }) =>
      AdminUniversityService.assignLicense(id, data),
    onSuccess: (_, { id }) => {
      qc.invalidateQueries({ queryKey: ['admin', 'universities', id, 'licenses'] });
      qc.invalidateQueries({ queryKey: ['admin', 'universities', id] });
      toast.success('License assigned');
    },
    onError: () => toast.error('Failed to assign license'),
  });
};

export const useAdminUpdateLicense = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, licId, data }: { id: string; licId: string; data: Record<string, unknown> }) =>
      AdminUniversityService.updateLicense(id, licId, data),
    onSuccess: (_, { id }) => {
      qc.invalidateQueries({ queryKey: ['admin', 'universities', id, 'licenses'] });
      toast.success('License updated');
    },
    onError: () => toast.error('Failed to update license'),
  });
};

export const useAdminUniversityAnalytics = (id: string) =>
  useQuery({
    queryKey: ['admin', 'universities', id, 'analytics'],
    queryFn: () => AdminUniversityService.getAnalytics(id),
    enabled: !!id,
  });

export const useAdminUniversityAuditLog = (id: string, limit = 50) =>
  useQuery({
    queryKey: ['admin', 'universities', id, 'audit-log', limit],
    queryFn: () => AdminUniversityService.getAuditLog(id, limit),
    enabled: !!id,
  });
