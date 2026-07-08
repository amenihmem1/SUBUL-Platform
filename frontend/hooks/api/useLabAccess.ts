import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  getMyLabAccess,
  getAdminLabCredentials,
  createAdminLabCredential,
  updateAdminLabCredential,
  deleteAdminLabCredential,
  getAdminLabSessions,
  grantLabAccess,
  bulkGrantLabAccess,
  revokeLabAccess,
  type CreateLabCredentialInput,
  type GrantLabAccessInput,
  type BulkGrantLabAccessInput,
} from '@/services/lab-access'

const KEYS = {
  myAccess: (provider: string) => ['lab-access', 'my', provider] as const,
  adminCredentials: (provider?: string) => ['lab-access', 'admin', 'credentials', provider ?? 'all'] as const,
  adminSessions: (provider?: string) => ['lab-access', 'admin', 'sessions', provider ?? 'all'] as const,
}

// ─── Learner ──────────────────────────────────────────────────────────────────

export function useMyLabAccess(provider: string | null | undefined) {
  return useQuery({
    queryKey: KEYS.myAccess(provider ?? ''),
    queryFn: () => getMyLabAccess(provider!),
    enabled: !!provider,
    refetchInterval: 60_000, // refresh every minute to update countdown
    staleTime: 30_000,
  })
}

// ─── Admin — Credentials ──────────────────────────────────────────────────────

export function useAdminLabCredentials(provider?: string) {
  return useQuery({
    queryKey: KEYS.adminCredentials(provider),
    queryFn: () => getAdminLabCredentials(provider),
  })
}

export function useCreateLabCredential() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (input: CreateLabCredentialInput) => createAdminLabCredential(input),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['lab-access', 'admin', 'credentials'] }),
  })
}

export function useUpdateLabCredential() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, input }: { id: number; input: Partial<CreateLabCredentialInput> }) =>
      updateAdminLabCredential(id, input),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['lab-access', 'admin', 'credentials'] }),
  })
}

export function useDeleteLabCredential() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: number) => deleteAdminLabCredential(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['lab-access', 'admin', 'credentials'] }),
  })
}

// ─── Admin — Sessions ─────────────────────────────────────────────────────────

export function useAdminLabSessions(provider?: string) {
  return useQuery({
    queryKey: KEYS.adminSessions(provider),
    queryFn: () => getAdminLabSessions(provider),
    refetchInterval: 60_000,
  })
}

export function useGrantLabAccess() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (input: GrantLabAccessInput) => grantLabAccess(input),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['lab-access', 'admin', 'sessions'] })
      qc.invalidateQueries({ queryKey: ['lab-access', 'admin', 'credentials'] })
    },
  })
}

export function useBulkGrantLabAccess() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (input: BulkGrantLabAccessInput) => bulkGrantLabAccess(input),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['lab-access', 'admin', 'sessions'] })
      qc.invalidateQueries({ queryKey: ['lab-access', 'admin', 'credentials'] })
    },
  })
}

export function useRevokeLabAccess() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (sessionId: number) => revokeLabAccess(sessionId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['lab-access', 'admin', 'sessions'] })
      qc.invalidateQueries({ queryKey: ['lab-access', 'admin', 'credentials'] })
    },
  })
}
