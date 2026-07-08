'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Award, Download, ChevronRight, Trophy } from 'lucide-react';
import { Button } from '@/components/ui';
import { useTranslation } from '@/contexts/LanguageContext';
import { useLearnerDashboard } from '@/hooks/api/useLearnerDashboard';
import { Skeleton } from '@/components/ui/skeleton';
import { downloadLearnerCertificatePdf } from '@/services/certifications';
import { filenameFromContentDisposition, triggerBlobDownload } from '@/lib/downloads';
import { useToast } from '@/components/ui';
import { useState } from 'react';

export function CertificatesSection() {
  const { t } = useTranslation();
  const { data, isLoading } = useLearnerDashboard();
  const { showToast } = useToast();
  const [downloadingCertificationId, setDownloadingCertificationId] = useState<number | null>(null);
  const certificates = data?.certificates ?? [];
  const pathname = usePathname();
  const locale = pathname.split('/')[1] || 'fr';

  const handleDownload = async (cert: { id: number; title: string; date: string; level: string }) => {
    setDownloadingCertificationId(cert.id);
    try {
      const response = await downloadLearnerCertificatePdf(cert.id);
      const filename = filenameFromContentDisposition(response.headers['content-disposition']);
      const blob = response.data instanceof Blob
        ? response.data
        : new Blob([response.data], { type: 'application/pdf' });
      triggerBlobDownload(blob, filename ?? `certificate-${cert.id}.pdf`);
    } catch {
      showToast('Failed to download certificate PDF.', 'error');
    } finally {
      setDownloadingCertificationId(null);
    }
  };

  if (isLoading) {
    return (
      <div className="rounded-2xl border border-border/60 bg-card shadow-sm p-5 space-y-4">
        <div className="flex justify-between items-center">
          <Skeleton className="h-5 w-32" />
          <Skeleton className="h-5 w-16" />
        </div>
        {[1, 2, 3].map((i) => (
          <div key={i} className="flex items-center gap-3 rounded-xl px-3 py-3">
            <Skeleton className="h-9 w-9 rounded-xl shrink-0" />
            <div className="flex-1 space-y-1.5">
              <Skeleton className="h-4 w-2/3" />
              <Skeleton className="h-3 w-1/3" />
            </div>
            <Skeleton className="h-8 w-8 rounded-lg" />
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-border/60 bg-card shadow-sm hover:shadow-md transition-shadow duration-200 overflow-hidden h-full">
      {/* Header */}
      <div className="flex items-center justify-between px-5 pt-5 pb-4 border-b border-border/60">
        <div className="flex items-center gap-2.5">
          <h2 className="text-base font-semibold text-foreground">
            {t('learnerDashboard.certificates')}
          </h2>
          {certificates.length > 0 && (
            <span className="rounded-full bg-violet-50 px-2 py-0.5 text-[11px] font-semibold text-violet-700">
              {certificates.length} earned
            </span>
          )}
        </div>
        <Button
          variant="ghost"
          size="sm"
          className="h-8 gap-1 text-xs font-medium text-violet-600 hover:text-violet-700"
          asChild
        >
          <Link href={`/${locale}/dashboard/learner/certifications`}>
            {t('learnerDashboard.viewAll')} <ChevronRight className="h-3.5 w-3.5" />
          </Link>
        </Button>
      </div>

      <div className="p-4">
        {certificates.length === 0 ? (
          <div className="flex flex-col items-center py-8 text-center">
            <div className="mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-violet-50">
              <Trophy className="h-7 w-7 text-violet-400" />
            </div>
            <p className="mb-1 font-semibold text-foreground">{t('learnerDashboard.noCertificates')}</p>
            <p className="max-w-[180px] text-xs text-muted-foreground">
              Complete courses to earn your first certificate.
            </p>
          </div>
        ) : (
          <div className="space-y-1.5">
            {certificates.map((cert) => (
              <div
                key={cert.id}
                className="group flex items-center gap-3 rounded-xl px-3 py-2.5 transition-colors hover:bg-violet-50/60"
              >
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-violet-50 ring-1 ring-violet-100">
                  <Award className="h-4 w-4 text-violet-600" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold leading-tight text-foreground">
                    {cert.title}
                  </p>
                  <p className="mt-0.5 text-[11px] text-muted-foreground/70">{cert.date} · {cert.level}</p>
                </div>
                <button
                  onClick={() => void handleDownload(cert)}
                  disabled={downloadingCertificationId === cert.id}
                  title="Download certificate"
                  className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-border text-muted-foreground opacity-0 transition-all hover:border-violet-200 hover:bg-violet-50 hover:text-violet-600 group-hover:opacity-100 disabled:cursor-not-allowed disabled:opacity-100"
                >
                  <Download className="h-3.5 w-3.5" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
