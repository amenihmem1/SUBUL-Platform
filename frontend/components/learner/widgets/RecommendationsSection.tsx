'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { Sparkles, ChevronRight, Award, Clock, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui';
import { Badge } from '@/components/ui';
import { useTranslation } from '@/contexts/LanguageContext';
import { useCertificationRecommendations } from '@/hooks/api/useRoadmap';
import { Skeleton } from '@/components/ui/skeleton';

interface Recommendation {
  title: string;
  reason: string;
  cta: string;
  urgency?: 'high';
  badge?: string;
  provider?: string;
  difficulty?: string;
  domain?: string;
}

function mapCertificationToRecommendations(
  data: {
    currentFocus?: Array<{ title: string; provider: string; domain: string; difficulty?: string; urgency?: 'high' }>;
    strengths?: Array<{ title: string; provider: string; domain: string; reason: string }>;
    suggestedTopics?: Array<{ title: string; provider: string; domain: string; description?: string }>;
    estimatedCompletionTime?: string;
  } | null,
  t: any
): Recommendation[] {
  if (!data) return [];
  const recs: Recommendation[] = [];

  (data.currentFocus ?? []).forEach((item, i) => {
    recs.push({
      title: item.title,
      reason: t('learnerDashboard.currentFocusReason') || `Recommended for ${item.domain}`,
      cta: t('learnerDashboard.startCertification') || 'Start Certification',
      urgency: item.urgency || (i === 0 ? 'high' : undefined),
      badge: item.provider,
      provider: item.provider,
      difficulty: item.difficulty,
      domain: item.domain,
    });
  });

  (data.strengths ?? []).forEach((item) => {
    if (recs.length >= 6) return;
    recs.push({
      title: item.title,
      reason: item.reason,
      cta: t('learnerDashboard.viewCertification') || 'View Certification',
      badge: item.provider,
      provider: item.provider,
      domain: item.domain,
    });
  });

  (data.suggestedTopics ?? []).forEach((item) => {
    if (recs.length >= 6) return;
    recs.push({
      title: item.title,
      reason: item.description || t('learnerDashboard.recommendedNextStepReason'),
      cta: t('learnerDashboard.exploreCertification') || 'Explore Certification',
      badge: item.provider,
      provider: item.provider,
      domain: item.domain,
    });
  });

  if (recs.length === 0) {
    recs.push({
      title: t('learnerDashboard.exploreYourRoadmap'),
      reason: t('learnerDashboard.completeAssessmentMessage'),
      cta: t('learnerDashboard.viewRoadmap'),
    });
  }

  return recs.slice(0, 6);
}

const DOMAIN_ACCENT: Record<string, { bg: string; text: string }> = {
  cloud:  { bg: 'bg-violet-50',  text: 'text-violet-700' },
  cyber:  { bg: 'bg-violet-50', text: 'text-violet-700' },
  ai:     { bg: 'bg-rose-50',   text: 'text-rose-700' },
  devops: { bg: 'bg-violet-50', text: 'text-violet-700' },
};

export function RecommendationsSection() {
  const { t } = useTranslation();
  const router = useRouter();
  const pathname = usePathname();
  const locale = pathname.split('/')[1] || 'fr';
  const { data, isLoading, refetch } = useCertificationRecommendations();
  const recommendations = mapCertificationToRecommendations(data ?? null, t);

  return (
    <section>
      {/* Header */}
      <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-lg font-semibold text-foreground">
            {t('learnerDashboard.recommendedForYou')}
          </h2>
          <p className="mt-0.5 text-sm text-muted-foreground">
            Certifications curated for your learning path
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            className="h-8 gap-1.5 text-xs text-muted-foreground hover:text-violet-600"
            onClick={() => refetch()}
            disabled={isLoading}
          >
            <Sparkles className="h-3.5 w-3.5" />
            Refresh
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="h-8 gap-1 text-xs text-violet-600 hover:text-violet-700"
            asChild
          >
            <Link href={`/${locale}/dashboard/learner/certifications`}>
              {t('learnerDashboard.viewAll')}
              <ChevronRight className="h-3.5 w-3.5" />
            </Link>
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {isLoading
          ? [1, 2, 3].map((i) => (
              <div key={i} className="rounded-2xl border border-border bg-card p-5">
                <Skeleton className="mb-3 h-5 w-3/4" />
                <Skeleton className="mb-1.5 h-4 w-full" />
                <Skeleton className="mb-4 h-4 w-4/5" />
                <Skeleton className="h-9 w-full rounded-xl" />
              </div>
            ))
          : recommendations.map((rec, i) => {
              const domainStyle = DOMAIN_ACCENT[rec.domain?.toLowerCase() ?? ''] ?? DOMAIN_ACCENT.cyber;
              return (
                <div
                  key={i}
                  className={`group flex flex-col overflow-hidden rounded-2xl border bg-card transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md ${
                    rec.urgency === 'high'
                      ? 'border-rose-200 hover:border-rose-300'
                      : 'border-border/70 hover:border-violet-200'
                  }`}
                >
                  {/* Top accent bar */}
                  <div
                    className={`h-1 w-full ${
                      rec.urgency === 'high'
                        ? 'bg-gradient-to-r from-rose-500 to-violet-500'
                        : 'bg-gradient-to-r from-violet-500 to-rose-400'
                    }`}
                  />

                  <div className="flex flex-1 flex-col p-5">
                    {/* Provider + difficulty badges */}
                    <div className="mb-3 flex flex-wrap items-center gap-1.5">
                      {rec.badge && (
                        <span className="rounded-full bg-violet-50 px-2 py-0.5 text-[11px] font-semibold text-violet-700">
                          {rec.badge}
                        </span>
                      )}
                      {rec.difficulty && (
                        <span className="rounded-full bg-violet-50 px-2 py-0.5 text-[11px] font-medium text-violet-500">
                          {rec.difficulty}
                        </span>
                      )}
                      {rec.urgency === 'high' && (
                        <span className="rounded-full bg-rose-50 px-2 py-0.5 text-[11px] font-semibold text-rose-600">
                          Urgent
                        </span>
                      )}
                    </div>

                    <h3 className="mb-2 text-sm font-semibold leading-snug text-foreground line-clamp-2">
                      {rec.title}
                    </h3>
                    <p className="mb-4 flex-1 text-xs leading-relaxed text-muted-foreground line-clamp-2">
                      {rec.reason}
                    </p>

                    <div className="mb-4 flex items-center gap-3 text-xs text-muted-foreground">
                      {rec.domain && (
                        <span className={`flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium ${domainStyle.bg} ${domainStyle.text}`}>
                          <Award className="h-3 w-3" />
                          {rec.domain}
                        </span>
                      )}
                      {data?.estimatedCompletionTime && (
                        <span className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {data.estimatedCompletionTime}
                        </span>
                      )}
                    </div>

                    <Button
                      className="mt-auto w-full gap-1.5 rounded-xl bg-violet-600 text-xs text-white hover:bg-violet-700"
                      onClick={() => router.push(`/${locale}/dashboard/learner/certifications`)}
                    >
                      {rec.cta}
                      <ArrowRight className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              );
            })}
      </div>
    </section>
  );
}
