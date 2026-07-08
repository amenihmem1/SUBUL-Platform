'use client';

import { useLearnerCertificationPath } from '@/hooks/api/useCertifications';

export default function CertificationPathProgress({ certificationId }: { certificationId: number }) {
  const { data } = useLearnerCertificationPath(certificationId);
  if (!data || data.totalSteps === 0) return null;

  return (
    <div className="mt-3 rounded-lg border border-border p-3">
      <div className="flex items-center justify-between text-xs mb-2">
        <span className="font-medium text-muted-foreground">Path progression</span>
        <span className="font-semibold">{data.completedSteps}/{data.totalSteps}</span>
      </div>
      <div className="h-2 w-full rounded-full bg-muted overflow-hidden">
        <div className="h-2 bg-primary" style={{ width: `${data.progressPercent ?? 0}%` }} />
      </div>
    </div>
  );
}
