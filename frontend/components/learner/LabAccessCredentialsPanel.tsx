'use client'

import { useEffect, useState } from 'react'
import { useTranslation } from '@/contexts/LanguageContext'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import type { LabAccessResponse } from '@/services/lab-access'
import {
  Cloud,
  Copy,
  Check,
  ExternalLink,
  Lock,
  Clock,
  AlertTriangle,
  KeyRound,
  Mail,
  Globe,
} from 'lucide-react'

interface Props {
  provider: string | null | undefined
  accessData: LabAccessResponse | undefined
  isLoading?: boolean
}

const PROVIDER_META: Record<string, { label: string; color: string; bg: string; icon: string }> = {
  aws: { label: 'AWS', color: 'text-orange-600', bg: 'bg-orange-50 border-orange-200', icon: '/AWS.png' },
  azure: { label: 'Microsoft Azure', color: 'text-blue-600', bg: 'bg-blue-50 border-blue-200', icon: '/azure-training-in-chennai.png' },
  gcp: { label: 'Google Cloud', color: 'text-red-600', bg: 'bg-red-50 border-red-200', icon: '/gcp.png' },
  nvidia: { label: 'NVIDIA', color: 'text-green-600', bg: 'bg-green-50 border-green-200', icon: '/nvidia.png' },
}

function formatDuration(seconds: number): string {
  if (seconds <= 0) return 'Expiré'
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  if (h > 0) return `${h}h ${m}m`
  return `${m}m`
}

function CopyField({ label, value, icon: Icon }: { label: string; value: string | null; icon: React.ElementType }) {
  const [copied, setCopied] = useState(false)

  if (!value) return null

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(value)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      // fallback — silently ignore
    }
  }

  const isSecret = label.toLowerCase().includes('password') || label.toLowerCase().includes('secret')
  const [revealed, setRevealed] = useState(false)

  return (
    <div className="flex items-center gap-3 py-2 border-b border-slate-100 last:border-0">
      <Icon className="h-4 w-4 text-slate-400 flex-shrink-0" />
      <div className="flex-1 min-w-0">
        <p className="text-xs text-slate-500 font-medium">{label}</p>
        <p className="text-sm font-mono text-slate-800 truncate">
          {isSecret && !revealed ? '••••••••••••' : value}
        </p>
      </div>
      <div className="flex gap-1">
        {isSecret && (
          <Button
            variant="ghost"
            size="sm"
            className="h-7 px-2 text-xs text-slate-500"
            onClick={() => setRevealed((r) => !r)}
          >
            {revealed ? 'Masquer' : 'Voir'}
          </Button>
        )}
        <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={handleCopy}>
          {copied ? <Check className="h-3.5 w-3.5 text-green-500" /> : <Copy className="h-3.5 w-3.5 text-slate-400" />}
        </Button>
      </div>
    </div>
  )
}

export function LabAccessCredentialsPanel({ provider, accessData, isLoading }: Props) {
  const { t } = useTranslation()
  const [secondsLeft, setSecondsLeft] = useState<number | null>(null)

  useEffect(() => {
    if (accessData?.secondsRemaining != null) {
      setSecondsLeft(accessData.secondsRemaining)
    }
  }, [accessData?.secondsRemaining])

  // Live countdown
  useEffect(() => {
    if (secondsLeft == null || secondsLeft <= 0) return
    const timer = setInterval(() => setSecondsLeft((s) => (s != null && s > 0 ? s - 1 : 0)), 1000)
    return () => clearInterval(timer)
  }, [secondsLeft != null])

  const meta = PROVIDER_META[provider?.toLowerCase() ?? ''] ?? {
    label: provider ?? 'Cloud',
    color: 'text-slate-600',
    bg: 'bg-slate-50 border-slate-200',
    icon: null,
  }

  if (isLoading) {
    return (
      <Card className="border animate-pulse">
        <CardContent className="h-24 flex items-center justify-center text-slate-400 text-sm">
          Vérification de votre accès cloud…
        </CardContent>
      </Card>
    )
  }

  // No access state
  if (!accessData?.hasAccess) {
    return (
      <Card className="border border-slate-200">
        <CardContent className="flex items-start gap-3 p-4">
          <Lock className="h-5 w-5 text-slate-400 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-semibold text-slate-700">Accès {meta.label} non activé</p>
            <p className="text-xs text-slate-500 mt-0.5">
              {t('common.contactAdmin')}
            </p>
          </div>
        </CardContent>
      </Card>
    )
  }

  const cred = accessData.credential
  const isExpiringSoon = (secondsLeft ?? 0) < 30 * 60 // < 30 min

  return (
    <Card className={`border ${meta.bg}`}>
      <CardHeader className="pb-2 pt-4 px-4">
        <div className="flex items-center justify-between">
          <CardTitle className={`flex items-center gap-2 text-base ${meta.color}`}>
            <Cloud className="h-4 w-4" />
            Votre accès {meta.label}
          </CardTitle>
          <div className="flex items-center gap-2">
            {isExpiringSoon && (
              <Badge variant="destructive" className="text-xs gap-1">
                <AlertTriangle className="h-3 w-3" />
                Expire bientôt
              </Badge>
            )}
            <Badge variant="outline" className="text-xs gap-1 text-slate-600">
              <Clock className="h-3 w-3" />
              {secondsLeft != null ? formatDuration(secondsLeft) : '…'}
            </Badge>
          </div>
        </div>
      </CardHeader>

      <CardContent className="px-4 pb-4 space-y-1">
        {cred ? (
          <>
            <CopyField label="Email de connexion" value={cred.loginEmail} icon={Mail} />
            <CopyField label="Mot de passe" value={cred.loginPassword} icon={KeyRound} />
            <CopyField label="Clé d'accès (Access Key)" value={cred.accessKey} icon={KeyRound} />
            <CopyField label="Clé secrète (Secret Key)" value={cred.secretKey} icon={KeyRound} />
            {cred.extraFields &&
              Object.entries(cred.extraFields).map(([k, v]) => (
                <CopyField key={k} label={k} value={v} icon={Cloud} />
              ))}
            {cred.consoleUrl && (
              <div className="pt-2">
                <Button
                  variant="outline"
                  size="sm"
                  className={`w-full gap-2 ${meta.color} border-current`}
                  onClick={() => window.open(cred.consoleUrl!, '_blank', 'noopener')}
                >
                  <Globe className="h-4 w-4" />
                  Ouvrir la console {meta.label}
                  <ExternalLink className="h-3.5 w-3.5 ml-auto" />
                </Button>
              </div>
            )}
          </>
        ) : (
          <p className="text-xs text-slate-500 py-2">
            Accès accordé — contactez votre administrateur pour les identifiants.
          </p>
        )}
      </CardContent>
    </Card>
  )
}
