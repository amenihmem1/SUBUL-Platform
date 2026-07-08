import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  getCertifications,
  getLearnerCertifications,
  getLearnerCertificationsStatus,
  getLearnerCertificationDiagnostics,
  getIssuedLearnerCertificates,
  verifyLearnerCertificate,
  enrollInCertification as enrollInCertificationApi,
  createCertification,
  updateCertification,
  deleteCertification,
  toggleCertificationAvailability,
  type CreateCertificationDto,
  type UpdateCertificationDto,
  type ToggleAvailabilityDto,
  type CertificationsParams,
  type LearnerCertificationStatus,
  getCertificationPathAdmin,
  updateCertificationPathAdmin,
  getLearnerCertificationPath,
  getLearnerCertificationExperience,
  type CertificationPathStepType,
} from '@/services/certifications';

export const certificationKeys = {
  all: ['certifications'] as const,
  lists: () => [...certificationKeys.all, 'list'] as const,
  list: (params?: CertificationsParams) =>
    [...certificationKeys.lists(), params] as const,
  learner: (fullCatalog?: boolean) =>
    ['learner', 'certifications', fullCatalog ? 'all' : 'scoped'] as const,
  learnerStatus: () => ['learner', 'certifications', 'status'] as const,
  learnerDiagnostics: () => ['learner', 'certifications', 'diagnostics'] as const,
  learnerIssued: () => ['learner', 'certifications', 'issued'] as const,
  learnerPath: (id: number) => ['learner', 'certifications', id, 'path'] as const,
  learnerExperience: (id: number) => ['learner', 'certifications', id, 'experience'] as const,
  adminPath: (id: number) => ['admin', 'certifications', id, 'path'] as const,
};

/** fullCatalog=true loads every available certification; default is profile-scoped. */
export function useLearnerCertifications(fullCatalog = false) {
  return useQuery({
    queryKey: certificationKeys.learner(fullCatalog),
    queryFn: () => getLearnerCertifications({ fullCatalog }),
  });
}

export function useLearnerCertificationsStatus() {
  return useQuery<LearnerCertificationStatus>({
    queryKey: certificationKeys.learnerStatus(),
    queryFn: getLearnerCertificationsStatus,
  });
}

export function useLearnerCertificationDiagnostics() {
  return useQuery({
    queryKey: certificationKeys.learnerDiagnostics(),
    queryFn: getLearnerCertificationDiagnostics,
  });
}

export function useLearnerIssuedCertificates() {
  return useQuery({
    queryKey: certificationKeys.learnerIssued(),
    queryFn: getIssuedLearnerCertificates,
  });
}

export function useVerifyLearnerCertificate() {
  return useMutation({
    mutationFn: (verificationCode: string) => verifyLearnerCertificate(verificationCode),
  });
}

export function useEnrollInCertification() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (certificationId: number) => enrollInCertificationApi(certificationId),
    onSuccess: () => {
      queryClient.invalidateQueries({ predicate: (q) => q.queryKey[0] === 'learner' && q.queryKey[1] === 'certifications' });
      queryClient.invalidateQueries({ queryKey: certificationKeys.learnerStatus() });
    },
  });
}

export function useCertifications(params?: CertificationsParams) {
  return useQuery({
    queryKey: certificationKeys.list(params),
    queryFn: () => getCertifications(params),
  });
}

export function useLearnerCertificationPath(certificationId: number) {
  return useQuery({
    queryKey: certificationKeys.learnerPath(certificationId),
    queryFn: () => getLearnerCertificationPath(certificationId),
    enabled: Number.isFinite(certificationId) && certificationId > 0,
  });
}

export function useLearnerCertificationExperience(certificationId: number) {
  return useQuery({
    queryKey: certificationKeys.learnerExperience(certificationId),
    queryFn: () => getLearnerCertificationExperience(certificationId),
    enabled: Number.isFinite(certificationId) && certificationId > 0,
  });
}

export function useAdminCertificationPath(certificationId: number) {
  return useQuery({
    queryKey: certificationKeys.adminPath(certificationId),
    queryFn: () => getCertificationPathAdmin(certificationId),
    enabled: Number.isFinite(certificationId) && certificationId > 0,
  });
}

export function useUpdateCertificationPath() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, steps }: { id: number; steps: Array<{ stepType: CertificationPathStepType; stepRef: string; title: string; description?: string }> }) =>
      updateCertificationPathAdmin(id, steps),
    onSuccess: (_data, vars) => {
      queryClient.invalidateQueries({ queryKey: certificationKeys.adminPath(vars.id) });
      queryClient.invalidateQueries({ queryKey: certificationKeys.learnerPath(vars.id) });
    },
  });
}

export function useCreateCertification() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateCertificationDto) => createCertification(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: certificationKeys.all });
    },
  });
}

export function useUpdateCertification() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      data,
    }: { id: number; data: UpdateCertificationDto }) =>
      updateCertification(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: certificationKeys.all });
    },
  });
}

export function useDeleteCertification() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => deleteCertification(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: certificationKeys.all });
    },
  });
}

export function useToggleCertificationAvailability() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      data,
    }: { id: number; data: ToggleAvailabilityDto }) =>
      toggleCertificationAvailability(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: certificationKeys.all });
    },
  });
}
