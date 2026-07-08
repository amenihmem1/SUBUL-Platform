'use client'

import { useState, useMemo } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useToast } from '@/components/ui'
import {
  useAdminLabCredentials,
  useCreateLabCredential,
  useUpdateLabCredential,
  useDeleteLabCredential,
  useAdminLabSessions,
  useGrantLabAccess,
  useBulkGrantLabAccess,
  useRevokeLabAccess,
} from '@/hooks/api/useLabAccess'
import type {
  LabCredential,
  LabAccessSession,
  CloudProvider,
  CredentialType,
  CreateLabCredentialInput,
} from '@/services/lab-access'
import {
  Cloud,
  Plus,
  Trash2,
  Edit2,
  Check,
  X,
  Clock,
  Users,
  Key,
  ShieldCheck,
  AlertTriangle,
  Eye,
  EyeOff,
} from 'lucide-react'

const PROVIDERS: { value: CloudProvider; label: string; color: string }[] = [
  { value: 'aws', label: 'AWS', color: 'bg-orange-100 text-orange-700 border-orange-200' },
  { value: 'azure', label: 'Azure', color: 'bg-blue-100 text-blue-700 border-blue-200' },
  { value: 'gcp', label: 'GCP', color: 'bg-red-100 text-red-700 border-red-200' },
  { value: 'nvidia', label: 'NVIDIA', color: 'bg-green-100 text-green-700 border-green-200' },
]

const CRED_TYPES: { value: CredentialType; label: string }[] = [
  { value: 'sandbox_account', label: 'Compte Sandbox' },
  { value: 'iam_user', label: 'Utilisateur IAM' },
  { value: 'voucher_code', label: 'Code Voucher' },
  { value: 'api_key', label: 'Clé API' },
]

const DURATIONS = [
  { value: 24, label: '24 heures' },
  { value: 48, label: '48 heures' },
  { value: 168, label: '7 jours' },
  { value: 336, label: '14 jours' },
  { value: 720, label: '30 jours' },
]

function formatSeconds(s: number): string {
  if (s <= 0) return 'Expiré'
  const h = Math.floor(s / 3600)
  const m = Math.floor((s % 3600) / 60)
  if (h > 24) return `${Math.floor(h / 24)}j ${h % 24}h`
  if (h > 0) return `${h}h ${m}m`
  return `${m}m`
}

function ProviderBadge({ provider }: { provider: string }) {
  const meta = PROVIDERS.find((p) => p.value === provider)
  return (
    <Badge variant="outline" className={`text-xs ${meta?.color ?? ''}`}>
      {meta?.label ?? provider}
    </Badge>
  )
}

// ─── Credential Form ──────────────────────────────────────────────────────────

const EMPTY_FORM: CreateLabCredentialInput = {
  provider: 'azure',
  label: '',
  credentialType: 'sandbox_account',
  consoleUrl: '',
  loginEmail: '',
  loginPassword: '',
  accessKey: '',
  secretKey: '',
  notes: '',
  isActive: true,
}

function CredentialForm({
  initial,
  onSave,
  onCancel,
  isSaving,
}: {
  initial: CreateLabCredentialInput
  onSave: (data: CreateLabCredentialInput) => void
  onCancel: () => void
  isSaving: boolean
}) {
  const [form, setForm] = useState<CreateLabCredentialInput>(initial)
  const [showSecrets, setShowSecrets] = useState(false)

  const set = (key: keyof CreateLabCredentialInput, value: any) =>
    setForm((f) => ({ ...f, [key]: value }))

  return (
    <div className="space-y-3 p-4 bg-slate-50 rounded-xl border border-slate-200">
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="text-xs font-medium text-slate-600 mb-1 block">Fournisseur *</label>
          <Select value={form.provider} onValueChange={(v) => set('provider', v as CloudProvider)}>
            <SelectTrigger className="h-8 text-sm">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {PROVIDERS.map((p) => (
                <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div>
          <label className="text-xs font-medium text-slate-600 mb-1 block">Type *</label>
          <Select value={form.credentialType} onValueChange={(v) => set('credentialType', v as CredentialType)}>
            <SelectTrigger className="h-8 text-sm">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {CRED_TYPES.map((c) => (
                <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div>
        <label className="text-xs font-medium text-slate-600 mb-1 block">Nom / Label *</label>
        <Input
          className="h-8 text-sm"
          placeholder="ex: Azure Sandbox #1"
          value={form.label}
          onChange={(e) => set('label', e.target.value)}
        />
      </div>

      <div>
        <label className="text-xs font-medium text-slate-600 mb-1 block">URL Console</label>
        <Input
          className="h-8 text-sm"
          placeholder="https://portal.azure.com"
          value={form.consoleUrl ?? ''}
          onChange={(e) => set('consoleUrl', e.target.value)}
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="text-xs font-medium text-slate-600 mb-1 block">Email de connexion</label>
          <Input
            className="h-8 text-sm"
            placeholder="student@sandbox.com"
            value={form.loginEmail ?? ''}
            onChange={(e) => set('loginEmail', e.target.value)}
          />
        </div>
        <div>
          <label className="text-xs font-medium text-slate-600 mb-1 block flex items-center gap-2">
            Mot de passe
            <button type="button" onClick={() => setShowSecrets((s) => !s)}>
              {showSecrets ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
            </button>
          </label>
          <Input
            className="h-8 text-sm"
            type={showSecrets ? 'text' : 'password'}
            placeholder="••••••••"
            value={form.loginPassword ?? ''}
            onChange={(e) => set('loginPassword', e.target.value)}
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="text-xs font-medium text-slate-600 mb-1 block">Access Key (optionnel)</label>
          <Input
            className="h-8 text-sm font-mono"
            placeholder="AKIAIOSFODNN7EXAMPLE"
            value={form.accessKey ?? ''}
            onChange={(e) => set('accessKey', e.target.value)}
          />
        </div>
        <div>
          <label className="text-xs font-medium text-slate-600 mb-1 block">Secret Key (optionnel)</label>
          <Input
            className="h-8 text-sm font-mono"
            type={showSecrets ? 'text' : 'password'}
            placeholder="wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY"
            value={form.secretKey ?? ''}
            onChange={(e) => set('secretKey', e.target.value)}
          />
        </div>
      </div>

      <div>
        <label className="text-xs font-medium text-slate-600 mb-1 block">Notes (admin)</label>
        <Input
          className="h-8 text-sm"
          placeholder="Notes internes..."
          value={form.notes ?? ''}
          onChange={(e) => set('notes', e.target.value)}
        />
      </div>

      <div className="flex gap-2 pt-1">
        <Button
          size="sm"
          className="h-8 gap-1.5"
          disabled={!form.label.trim() || isSaving}
          onClick={() => onSave(form)}
        >
          <Check className="h-3.5 w-3.5" />
          Enregistrer
        </Button>
        <Button size="sm" variant="ghost" className="h-8" onClick={onCancel}>
          <X className="h-3.5 w-3.5" />
          Annuler
        </Button>
      </div>
    </div>
  )
}

// ─── Grant Access Modal ───────────────────────────────────────────────────────

function GrantModal({
  credentials,
  onGrant,
  onClose,
  isGranting,
}: {
  credentials: LabCredential[]
  onGrant: (userId: number, provider: CloudProvider, durationHours: number, credentialId?: number) => void
  onClose: () => void
  isGranting: boolean
}) {
  const [userId, setUserId] = useState('')
  const [provider, setProvider] = useState<CloudProvider>('azure')
  const [duration, setDuration] = useState(168)
  const [credentialId, setCredentialId] = useState<string>('auto')

  const filteredCreds = useMemo(
    () => credentials.filter((c) => c.provider === provider && c.isActive),
    [credentials, provider],
  )

  const handleSubmit = () => {
    const uid = parseInt(userId, 10)
    if (!uid || isNaN(uid)) return
    onGrant(uid, provider, duration, credentialId !== 'auto' ? parseInt(credentialId, 10) : undefined)
  }

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <ShieldCheck className="h-4 w-4 text-violet-600" />
            Accorder un accès cloud
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div>
            <label className="text-xs font-medium text-slate-600 mb-1 block">ID Apprenant *</label>
            <Input
              className="h-8 text-sm"
              type="number"
              placeholder="ex: 42"
              value={userId}
              onChange={(e) => setUserId(e.target.value)}
            />
            <p className="text-[11px] text-slate-400 mt-1">Trouvez l&apos;ID dans Gestion des Apprenants</p>
          </div>

          <div>
            <label className="text-xs font-medium text-slate-600 mb-1 block">Fournisseur *</label>
            <Select value={provider} onValueChange={(v) => { setProvider(v as CloudProvider); setCredentialId('auto') }}>
              <SelectTrigger className="h-8 text-sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {PROVIDERS.map((p) => (
                  <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <label className="text-xs font-medium text-slate-600 mb-1 block">Durée *</label>
            <Select value={String(duration)} onValueChange={(v) => setDuration(parseInt(v, 10))}>
              <SelectTrigger className="h-8 text-sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {DURATIONS.map((d) => (
                  <SelectItem key={d.value} value={String(d.value)}>{d.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <label className="text-xs font-medium text-slate-600 mb-1 block">Credential (slot)</label>
            <Select value={credentialId} onValueChange={setCredentialId}>
              <SelectTrigger className="h-8 text-sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="auto">Auto-assigner (premier disponible)</SelectItem>
                {filteredCreds.map((c) => (
                  <SelectItem key={c.id} value={String(c.id)}>
                    {c.label} {c.activeSessionCount > 0 ? `(utilisé par ${c.activeSessionCount})` : '(disponible)'}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex gap-2 pt-2">
            <Button
              className="flex-1 h-8 gap-1.5"
              disabled={!userId || isGranting}
              onClick={handleSubmit}
            >
              <ShieldCheck className="h-3.5 w-3.5" />
              {isGranting ? 'Accordé…' : 'Accorder l\'accès'}
            </Button>
            <Button variant="ghost" className="h-8" onClick={onClose}>Annuler</Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function AdminLabAccessPage() {
  const { showToast } = useToast()
  const [tab, setTab] = useState<'credentials' | 'sessions'>('credentials')
  const [filterProvider, setFilterProvider] = useState<string>('all')
  const [showCredForm, setShowCredForm] = useState(false)
  const [editingCred, setEditingCred] = useState<LabCredential | null>(null)
  const [showGrantModal, setShowGrantModal] = useState(false)

  const provider = filterProvider === 'all' ? undefined : (filterProvider as CloudProvider)

  const { data: credentials = [], isLoading: credsLoading } = useAdminLabCredentials(provider)
  const { data: sessions = [], isLoading: sessionsLoading } = useAdminLabSessions(provider)

  const createCred = useCreateLabCredential()
  const updateCred = useUpdateLabCredential()
  const deleteCred = useDeleteLabCredential()
  const grantAccess = useGrantLabAccess()
  const revokeAccess = useRevokeLabAccess()

  const handleCreateCred = async (data: CreateLabCredentialInput) => {
    try {
      await createCred.mutateAsync(data)
      setShowCredForm(false)
      showToast('Credential créé avec succès', 'success')
    } catch {
      showToast('Erreur lors de la création', 'error')
    }
  }

  const handleUpdateCred = async (data: CreateLabCredentialInput) => {
    if (!editingCred) return
    try {
      await updateCred.mutateAsync({ id: editingCred.id, input: data })
      setEditingCred(null)
      showToast('Credential mis à jour', 'success')
    } catch {
      showToast('Erreur lors de la mise à jour', 'error')
    }
  }

  const handleDeleteCred = async (id: number) => {
    if (!confirm('Supprimer ce credential ? Les sessions actives ne seront pas révoquées.')) return
    try {
      await deleteCred.mutateAsync(id)
      showToast('Credential supprimé', 'success')
    } catch {
      showToast('Erreur lors de la suppression', 'error')
    }
  }

  const handleGrant = async (userId: number, prov: CloudProvider, durationHours: number, credentialId?: number) => {
    try {
      await grantAccess.mutateAsync({ userId, provider: prov, durationHours, credentialId })
      setShowGrantModal(false)
      showToast(`Accès ${prov.toUpperCase()} accordé pour ${durationHours}h`, 'success')
    } catch {
      showToast('Erreur lors de l\'attribution de l\'accès', 'error')
    }
  }

  const handleRevoke = async (sessionId: number) => {
    if (!confirm('Révoquer cet accès maintenant ?')) return
    try {
      await revokeAccess.mutateAsync(sessionId)
      showToast('Accès révoqué', 'success')
    } catch {
      showToast('Erreur lors de la révocation', 'error')
    }
  }

  return (
    <div className="p-6 space-y-6 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-slate-900 flex items-center gap-2">
            <Cloud className="h-5 w-5 text-violet-600" />
            Accès Cloud Labs
          </h1>
          <p className="text-sm text-slate-500 mt-0.5">
            Gérez les credentials cloud et les accès des apprenants.
          </p>
        </div>
        <Button className="gap-2 h-9" onClick={() => setShowGrantModal(true)}>
          <ShieldCheck className="h-4 w-4" />
          Accorder un accès
        </Button>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-3 gap-4">
        <Card>
          <CardContent className="flex items-center gap-3 p-4">
            <Key className="h-8 w-8 text-violet-500 bg-violet-50 rounded-lg p-1.5" />
            <div>
              <p className="text-2xl font-bold text-slate-900">{credentials.length}</p>
              <p className="text-xs text-slate-500">Credentials</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-3 p-4">
            <Users className="h-8 w-8 text-green-500 bg-green-50 rounded-lg p-1.5" />
            <div>
              <p className="text-2xl font-bold text-slate-900">{sessions.length}</p>
              <p className="text-xs text-slate-500">Sessions actives</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-3 p-4">
            <AlertTriangle className="h-8 w-8 text-amber-500 bg-amber-50 rounded-lg p-1.5" />
            <div>
              <p className="text-2xl font-bold text-slate-900">
                {sessions.filter((s) => s.secondsRemaining < 3600).length}
              </p>
              <p className="text-xs text-slate-500">Expire dans 1h</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-slate-200">
        {(['credentials', 'sessions'] as const).map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setTab(t)}
            className={`px-4 py-2 text-sm font-medium transition-colors border-b-2 -mb-px ${
              tab === t
                ? 'border-violet-600 text-violet-700'
                : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
          >
            {t === 'credentials' ? `Credential Pool (${credentials.length})` : `Sessions actives (${sessions.length})`}
          </button>
        ))}
        <div className="flex-1" />
        <Select value={filterProvider} onValueChange={setFilterProvider}>
          <SelectTrigger className="h-8 w-32 text-xs mb-1">
            <SelectValue placeholder="Tous" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tous</SelectItem>
            {PROVIDERS.map((p) => (
              <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Credentials Tab */}
      {tab === 'credentials' && (
        <div className="space-y-3">
          {showCredForm && !editingCred && (
            <CredentialForm
              initial={EMPTY_FORM}
              onSave={handleCreateCred}
              onCancel={() => setShowCredForm(false)}
              isSaving={createCred.isPending}
            />
          )}

          {credsLoading ? (
            <p className="text-sm text-slate-400 py-4 text-center">Chargement…</p>
          ) : credentials.length === 0 && !showCredForm ? (
            <div className="text-center py-12 border-2 border-dashed border-slate-200 rounded-xl">
              <Key className="h-8 w-8 text-slate-300 mx-auto mb-2" />
              <p className="text-sm font-medium text-slate-500">Aucun credential configuré</p>
              <p className="text-xs text-slate-400 mt-1">Ajoutez des comptes sandbox pour les donner aux apprenants.</p>
              <Button size="sm" className="mt-4 gap-2" onClick={() => setShowCredForm(true)}>
                <Plus className="h-3.5 w-3.5" /> Ajouter un credential
              </Button>
            </div>
          ) : (
            <>
              <div className="flex justify-between items-center">
                <p className="text-xs text-slate-500">{credentials.length} credential(s)</p>
                <Button size="sm" variant="outline" className="h-8 gap-1.5" onClick={() => { setShowCredForm(true); setEditingCred(null) }}>
                  <Plus className="h-3.5 w-3.5" /> Ajouter
                </Button>
              </div>

              <div className="divide-y divide-slate-100 rounded-xl border border-slate-200 overflow-hidden">
                {credentials.map((cred) => (
                  <div key={cred.id}>
                    {editingCred?.id === cred.id ? (
                      <div className="p-3">
                        <CredentialForm
                          initial={{
                            provider: cred.provider,
                            label: cred.label,
                            credentialType: cred.credentialType,
                            consoleUrl: cred.consoleUrl,
                            loginEmail: cred.loginEmail,
                            loginPassword: cred.loginPassword,
                            accessKey: cred.accessKey,
                            secretKey: cred.secretKey,
                            notes: cred.notes,
                            isActive: cred.isActive,
                          }}
                          onSave={handleUpdateCred}
                          onCancel={() => setEditingCred(null)}
                          isSaving={updateCred.isPending}
                        />
                      </div>
                    ) : (
                      <div className="flex items-center gap-3 px-4 py-3 bg-white hover:bg-slate-50">
                        <ProviderBadge provider={cred.provider} />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-slate-800">{cred.label}</p>
                          <p className="text-xs text-slate-400 truncate">
                            {cred.loginEmail ?? cred.accessKey ?? 'Pas d\'identifiant'}
                            {' · '}
                            {CRED_TYPES.find((t) => t.value === cred.credentialType)?.label}
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          {cred.activeSessionCount > 0 ? (
                            <Badge className="text-xs bg-amber-100 text-amber-700 border-amber-200">
                              <Users className="h-3 w-3 mr-1" />
                              {cred.activeSessionCount} actif(s)
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="text-xs text-green-600 border-green-200 bg-green-50">
                              Disponible
                            </Badge>
                          )}
                          {!cred.isActive && (
                            <Badge variant="secondary" className="text-xs">Inactif</Badge>
                          )}
                          <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => setEditingCred(cred)}>
                            <Edit2 className="h-3.5 w-3.5 text-slate-400" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 w-7 p-0 text-destructive hover:text-destructive"
                            onClick={() => handleDeleteCred(cred.id)}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      )}

      {/* Sessions Tab */}
      {tab === 'sessions' && (
        <div className="space-y-3">
          {sessionsLoading ? (
            <p className="text-sm text-slate-400 py-4 text-center">Chargement…</p>
          ) : sessions.length === 0 ? (
            <div className="text-center py-12 border-2 border-dashed border-slate-200 rounded-xl">
              <Clock className="h-8 w-8 text-slate-300 mx-auto mb-2" />
              <p className="text-sm font-medium text-slate-500">Aucune session active</p>
              <p className="text-xs text-slate-400 mt-1">Accordez un accès à un apprenant pour le voir ici.</p>
              <Button size="sm" className="mt-4 gap-2" onClick={() => setShowGrantModal(true)}>
                <ShieldCheck className="h-3.5 w-3.5" /> Accorder un accès
              </Button>
            </div>
          ) : (
            <div className="divide-y divide-slate-100 rounded-xl border border-slate-200 overflow-hidden">
              <div className="grid grid-cols-6 gap-2 px-4 py-2 bg-slate-50 text-xs font-semibold text-slate-500 uppercase tracking-wide">
                <span className="col-span-2">Apprenant</span>
                <span>Fournisseur</span>
                <span>Credential</span>
                <span className="col-span-2 text-right">Expire dans</span>
              </div>
              {sessions.map((session) => (
                <div key={session.id} className="grid grid-cols-6 gap-2 items-center px-4 py-3 bg-white hover:bg-slate-50">
                  <div className="col-span-2 min-w-0">
                    <p className="text-sm font-semibold text-slate-800 truncate">{session.user.fullName}</p>
                    <p className="text-xs text-slate-400 truncate">{session.user.email}</p>
                  </div>
                  <div>
                    <ProviderBadge provider={session.provider} />
                  </div>
                  <div>
                    <p className="text-xs text-slate-600 truncate">
                      {session.credential?.label ?? <span className="text-slate-400 italic">Non assigné</span>}
                    </p>
                  </div>
                  <div className="col-span-2 flex items-center justify-end gap-2">
                    <span className={`text-xs font-mono font-medium ${session.secondsRemaining < 3600 ? 'text-red-600' : 'text-slate-600'}`}>
                      <Clock className="h-3 w-3 inline mr-1" />
                      {formatSeconds(session.secondsRemaining)}
                    </span>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 w-7 p-0 text-destructive hover:text-destructive"
                      onClick={() => handleRevoke(session.id)}
                    >
                      <X className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Grant Modal */}
      {showGrantModal && (
        <GrantModal
          credentials={credentials}
          onGrant={handleGrant}
          onClose={() => setShowGrantModal(false)}
          isGranting={grantAccess.isPending}
        />
      )}
    </div>
  )
}
