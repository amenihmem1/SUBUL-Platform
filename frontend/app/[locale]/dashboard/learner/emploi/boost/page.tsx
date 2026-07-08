'use client'

import { useState, useEffect } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { ArrowLeft } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'

interface JobData {
  title: string
  location?: string
  company?: string
  description?: string
  skills_req?: string
}

const FORMATS = [
  { id: 'ats', name: 'ATS Classic', font: 'Calibri' },
  { id: 'basic', name: 'Basic', font: 'Arial' },
  { id: 'modern', name: 'Modern', font: 'Helvetica Neue' },
]

function ScoreRing({ score, label, size = 100 }: { score: number; label: string; size?: number }) {
  const r = size * 0.38
  const circ = 2 * Math.PI * r
  const dash = (score / 100) * circ
  const color = score >= 75 ? '#10B981' : score >= 50 ? '#F59E0B' : '#EF4444'
  return (
    <div className="flex flex-col items-center gap-2">
      <div className="relative" style={{ width: size, height: size }}>
        <svg width={size} height={size} className="-rotate-90">
          <circle cx={size / 2} cy={size / 2} r={r} fill="none" strokeWidth={5} className="stroke-muted/30" />
          <circle
            cx={size / 2} cy={size / 2} r={r} fill="none"
            strokeWidth={5} strokeLinecap="round" stroke={color}
            strokeDasharray={`${dash} ${circ}`}
            className="transition-all duration-700"
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-2xl font-black" style={{ color }}>{score}</span>
          <span className="text-[9px] text-muted-foreground font-semibold">/100</span>
        </div>
      </div>
      <span className="text-xs font-semibold text-muted-foreground">{label}</span>
    </div>
  )
}

type Phase = 'job' | 'loading' | 'done' | 'error'

export default function PerJobBoostPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const jobId = searchParams.get('job_id') || ''
  const [jobLoading, setJobLoading] = useState(true)

  useEffect(() => {
    // Simulate loading job data
    const timer = setTimeout(() => setJobLoading(false), 1000)
    return () => clearTimeout(timer)
  }, [])

  return (
    <div className="space-y-6 max-w-3xl mx-auto">
      <div className="flex items-center gap-4">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => router.back()}
          className="flex items-center gap-2"
        >
          <ArrowLeft className="h-4 w-4" />
          Back
        </Button>
      </div>

      <Card className="p-8 text-center">
        <h1 className="text-2xl font-bold text-gray-900 mb-4">
          CV Boost - Feature Unavailable
        </h1>
        <p className="text-gray-600 mb-6">
          The CV Boost feature has been temporarily disabled. Please check back later for updates.
        </p>
        <div className="bg-gray-50 p-4 rounded-lg">
          <p className="text-sm text-gray-500">
            Job ID: {jobId || 'Not available'}
          </p>
        </div>
      </Card>
    </div>
  )
}
