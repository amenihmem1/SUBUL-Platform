"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams, usePathname } from "next/navigation";
import { ArrowLeft, Sparkles } from "lucide-react";
import { api, API_PATHS } from "@/lib/api/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useTranslation } from "@/contexts/LanguageContext";

type JobDetail = {
  id: string;
  title: string;
  company: string;
  location: string;
  description: string;
  compatibility_pct: number;
  similarity_pct: number;
  source: string;
  posted: string;
  url: string;
  remote?: string | boolean;
  salary?: string;
};

export default function EmploiOfferDetailPage() {
  const { t } = useTranslation();
  const params = useParams();
  const pathname = usePathname();
  const locale = pathname.split("/")[1] || "fr";
  const rawJobId = typeof params?.jobId === "string" ? params.jobId : "";
  const [job, setJob] = useState<JobDetail | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!rawJobId) {
      setLoading(false);
      setError("missing_id");
      return;
    }
    let cancelled = false;
    const path = `jobs/${encodeURIComponent(rawJobId)}`;
    api
      .get<JobDetail>(API_PATHS.learnerEmploi(path))
      .then((r) => {
        if (!cancelled) setJob(r.data);
      })
      .catch(() => {
        if (!cancelled) setError("load_failed");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [rawJobId]);

  const boostHref = `/${locale}/dashboard/learner/emploi/boost?job_id=${encodeURIComponent(rawJobId)}`;

  if (loading) {
    return (
      <div className="mx-auto max-w-3xl space-y-6 p-6">
        <div className="flex flex-wrap items-center gap-3">
          <Skeleton className="h-9 w-28 rounded-md" />
          <Skeleton className="h-9 w-44 rounded-md" />
        </div>
        <Card className="border-primary/20 p-6 shadow-sm space-y-4">
          <Skeleton className="h-8 w-4/5 max-w-xl rounded-md" />
          <Skeleton className="h-4 w-3/5 max-w-md rounded-md" />
          <Skeleton className="h-3 w-40 rounded-md" />
          <div className="grid grid-cols-2 gap-3 pt-2">
            <Skeleton className="h-[72px] w-full rounded-lg" />
            <Skeleton className="h-[72px] w-full rounded-lg" />
          </div>
          <Skeleton className="h-3 w-2/3 max-w-sm rounded-md" />
        </Card>
        <Card className="p-6 space-y-3">
          <Skeleton className="h-5 w-36 rounded-md" />
          <Skeleton className="h-4 w-full rounded-md" />
          <Skeleton className="h-4 w-full rounded-md" />
          <Skeleton className="h-4 w-[92%] rounded-md" />
          <Skeleton className="h-4 w-[70%] rounded-md" />
        </Card>
      </div>
    );
  }

  if (error || !job) {
    return (
      <div className="space-y-4 p-6">
        <p className="text-sm text-destructive">{t("learnerJobs.offerDetail.notFound") as string}</p>
        <Button variant="outline" asChild>
          <Link href={`/${locale}/dashboard/learner/emploi`}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            {t("learnerJobs.offerDetail.back") as string}
          </Link>
        </Button>
      </div>
    );
  }

  const externalUrl = job.url.startsWith("http") ? job.url : null;

  return (
    <div className="mx-auto max-w-3xl space-y-6 p-6">
      <div className="flex flex-wrap items-center gap-3">
        <Button variant="ghost" size="sm" asChild>
          <Link href={`/${locale}/dashboard/learner/emploi`}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            {t("learnerJobs.offerDetail.back") as string}
          </Link>
        </Button>
        <Button className="gap-2" asChild>
          <Link href={boostHref}>
            <Sparkles className="h-4 w-4" />
            {t("learnerJobs.offerDetail.cvBooster") as string}
          </Link>
        </Button>
      </div>

      <Card className="border-primary/20 p-6 shadow-sm">
        <h1 className="text-xl font-bold">{job.title}</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {job.company} · {job.location}
        </p>
        {job.posted ? (
          <p className="mt-1 text-xs text-muted-foreground">
            {t("learnerJobs.offerDetail.posted") as string}: {job.posted}
          </p>
        ) : null}
        <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-2">
          <div className="rounded-lg border border-border/80 bg-muted/30 px-3 py-2">
            <p className="text-[10px] font-semibold uppercase text-muted-foreground">
              {t("learnerJobs.aiFlow.cardCompatibility") as string}
            </p>
            <p className="text-lg font-bold text-primary">{Math.round(job.compatibility_pct)}%</p>
          </div>
          <div className="rounded-lg border border-border/80 bg-muted/30 px-3 py-2">
            <p className="text-[10px] font-semibold uppercase text-muted-foreground">
              {t("learnerJobs.aiFlow.cardSimilarity") as string}
            </p>
            <p className="text-lg font-bold text-primary">{Math.round(job.similarity_pct)}%</p>
          </div>
        </div>
        <p className="mt-3 text-xs text-muted-foreground">
          {t("learnerJobs.offerDetail.source") as string}: {job.source}
          {job.salary ? ` · ${job.salary}` : ""}
        </p>
      </Card>

      <Card className="p-6">
        <h2 className="mb-3 text-sm font-semibold">{t("learnerJobs.offerDetail.description") as string}</h2>
        <div className="prose prose-sm dark:prose-invert max-w-none whitespace-pre-wrap text-sm">
          {job.description || "—"}
        </div>
      </Card>

      {externalUrl ? (
        <p>
          <a
            href={externalUrl}
            target="_blank"
            rel="noreferrer"
            className="text-sm font-medium text-primary hover:underline"
          >
            {t("learnerJobs.offerDetail.openOriginal") as string} →
          </a>
        </p>
      ) : null}
    </div>
  );
}
