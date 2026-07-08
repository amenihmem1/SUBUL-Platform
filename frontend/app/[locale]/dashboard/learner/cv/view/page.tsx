"use client";

import { usePathname, useRouter } from "next/navigation";
import { ArrowLeft, Briefcase, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useCvDocument } from "@/hooks/api/useCvBooster";

function Field({ label, value }: { label: string; value?: string }) {
  if (!value?.trim()) return null;
  return (
    <div>
      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="mt-0.5 text-sm text-foreground whitespace-pre-wrap">{value}</p>
    </div>
  );
}

export default function ViewCvPage() {
  const pathname = usePathname();
  const router = useRouter();
  const locale = pathname.split("/")[1] || "en";
  const { data, isLoading, isError, error, refetch } = useCvDocument();

  return (
    <div className="learner-page-shell max-w-4xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <Button
          variant="ghost"
          className="gap-2 w-fit -ml-2 text-muted-foreground"
          onClick={() => router.push(`/${locale}/dashboard/learner/emploi`)}
        >
          <ArrowLeft className="h-4 w-4" />
          Back to job opportunities
        </Button>
        <Button variant="outline" className="gap-2" onClick={() => router.push(`/${locale}/upload-cv`)}>
          <Briefcase className="h-4 w-4" />
          Replace CV
        </Button>
      </div>

      <Card className="border-border/70 shadow-md">
        <CardHeader>
          <CardTitle className="text-2xl font-bold tracking-tight">Your saved CV</CardTitle>
          <CardDescription>
            Profile stored from your last upload. This is read-only; use Replace CV to update the file.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {isLoading ? (
            <div className="flex items-center justify-center gap-2 py-16 text-muted-foreground text-sm">
              <RefreshCw className="h-4 w-4 animate-spin" />
              Loading your CV…
            </div>
          ) : isError ? (
            <div className="space-y-3">
              <div className="rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">
                {error instanceof Error ? error.message : "Could not load your CV."}
              </div>
              <Button variant="outline" size="sm" className="gap-2" onClick={() => refetch()}>
                <RefreshCw className="h-4 w-4" />
                Retry
              </Button>
            </div>
          ) : data ? (
            <>
              <div className="rounded-xl border bg-muted/30 px-4 py-3 space-y-1">
                <p className="text-lg font-semibold">
                  {[data.first_name, data.last_name].filter(Boolean).join(" ") || "Your profile"}
                </p>
                <p className="text-sm text-muted-foreground">
                  {[data.email, data.linkedin].filter(Boolean).join(" · ") || null}
                </p>
                {(data.cv_file_name || data.updated_at) && (
                  <p className="text-xs text-muted-foreground mt-2">
                    {data.cv_file_name ? `File: ${data.cv_file_name}` : null}
                    {data.cv_file_name && data.updated_at ? " · " : null}
                    {data.updated_at ? `Updated: ${data.updated_at}` : null}
                  </p>
                )}
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Target role" value={data.role} />
                <Field label="Seniority" value={data.seniority} />
                <Field label="Years of experience" value={data.years_exp} />
                <Field label="Domain / industry" value={data.industry} />
                <Field label="Education" value={data.education} />
                <Field label="Languages" value={data.languages} />
              </div>

              <Field label="Professional summary" value={data.summary} />
              <Field label="Skills" value={data.skills} />
              <Field label="Key highlights" value={data.bullets} />

              {data.full_text?.trim() ? (
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">
                    Full CV text
                  </p>
                  {data.full_text_truncated ? (
                    <p className="text-xs text-amber-700 dark:text-amber-400 mb-2">
                      Showing the first portion of your CV text (very long documents are truncated here).
                    </p>
                  ) : null}
                  <pre className="rounded-lg border bg-muted/40 p-4 text-xs leading-relaxed whitespace-pre-wrap max-h-[480px] overflow-y-auto font-mono">
                    {data.full_text}
                  </pre>
                </div>
              ) : null}
            </>
          ) : null}
        </CardContent>
      </Card>
    </div>
  );
}
