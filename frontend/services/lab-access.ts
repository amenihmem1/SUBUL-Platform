import { api } from '@/lib/api/client'

export type CloudProvider = 'aws' | 'azure' | 'gcp' | 'nvidia'
export type CredentialType = 'sandbox_account' | 'iam_user' | 'voucher_code' | 'api_key'

export interface LabAccessResponse {
  hasAccess: boolean
  provider: string
  expiresAt: string | null
  secondsRemaining: number | null
  sessionId: number | null
  credential: {
    consoleUrl: string | null
    loginEmail: string | null
    loginPassword: string | null
    accessKey: string | null
    secretKey: string | null
    extraFields: Record<string, string> | null
    credentialType: CredentialType
  } | null
}

export interface LabCredential {
  id: number
  provider: CloudProvider
  label: string
  credentialType: CredentialType
  consoleUrl: string | null
  loginEmail: string | null
  loginPassword: string | null
  accessKey: string | null
  secretKey: string | null
  extraFields: Record<string, string> | null
  notes: string | null
  isActive: boolean
  activeSessionCount: number
  createdAt: string
  updatedAt: string
}

export interface LabAccessSession {
  id: number
  provider: CloudProvider
  grantedAt: string
  expiresAt: string
  secondsRemaining: number
  notes: string | null
  user: { id: number; fullName: string; email: string }
  credential: { id: number; label: string } | null
}

export interface CreateLabCredentialInput {
  provider: CloudProvider
  label: string
  credentialType?: CredentialType
  consoleUrl?: string | null
  loginEmail?: string | null
  loginPassword?: string | null
  accessKey?: string | null
  secretKey?: string | null
  extraFields?: Record<string, string> | null
  notes?: string | null
  isActive?: boolean
}

export interface GrantLabAccessInput {
  userId: number
  provider: CloudProvider
  durationHours: number
  credentialId?: number
  notes?: string | null
}

export interface BulkGrantLabAccessInput {
  userIds: number[]
  provider: CloudProvider
  durationHours: number
  credentialId?: number
  notes?: string | null
}

// Learner
export async function getMyLabAccess(provider: string): Promise<LabAccessResponse> {
  const res = await api.get<LabAccessResponse>(`/api/learner/lab-access/${provider}`)
  return res.data
}

// Admin — credentials
export async function getAdminLabCredentials(provider?: string): Promise<LabCredential[]> {
  const res = await api.get<LabCredential[]>('/api/admin/lab-access/credentials', {
    params: provider ? { provider } : undefined,
  })
  return res.data
}

export async function createAdminLabCredential(input: CreateLabCredentialInput): Promise<LabCredential> {
  const res = await api.post<LabCredential>('/api/admin/lab-access/credentials', input)
  return res.data
}

export async function updateAdminLabCredential(id: number, input: Partial<CreateLabCredentialInput>): Promise<LabCredential> {
  const res = await api.patch<LabCredential>(`/api/admin/lab-access/credentials/${id}`, input)
  return res.data
}

export async function deleteAdminLabCredential(id: number): Promise<void> {
  await api.delete(`/api/admin/lab-access/credentials/${id}`)
}

// Admin — sessions
export async function getAdminLabSessions(provider?: string): Promise<LabAccessSession[]> {
  const res = await api.get<LabAccessSession[]>('/api/admin/lab-access/sessions', {
    params: provider ? { provider } : undefined,
  })
  return res.data
}

export async function grantLabAccess(input: GrantLabAccessInput): Promise<LabAccessSession> {
  const res = await api.post<LabAccessSession>('/api/admin/lab-access/sessions', input)
  return res.data
}

export async function bulkGrantLabAccess(input: BulkGrantLabAccessInput): Promise<{ granted: number; failed: number; errors: string[] }> {
  const res = await api.post('/api/admin/lab-access/sessions/bulk', input)
  return res.data
}

export async function revokeLabAccess(sessionId: number): Promise<void> {
  await api.delete(`/api/admin/lab-access/sessions/${sessionId}`)
}
