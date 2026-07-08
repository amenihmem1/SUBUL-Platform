"use client";

import { useMemo, useState } from "react";
import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useTranslation } from "@/contexts/LanguageContext";
import { CheckCircle, FileText, RefreshCw, Search, Sparkles, Upload, Wand2 } from "lucide-react";
import {
  analyzeLearnerEmploi,
  type LearnerEmploiAnalyzeResponse,
  type LearnerEmploiJob,
  type LearnerEmploiAtsResult,
} from "@/services/learner-emploi";

type Phase = "idle" | "analyzing" | "review" | "edit";

interface ResumeEditForm {
  role: string;
  summary: string;
  skills: string;
  experience: string;
  education: string;
  projects: string;
  certifications: string;
}

export interface LearnerEmploiBoostFlowResult {
  review: LearnerEmploiAnalyzeResponse["resume_review"];
  jobs: LearnerEmploiJob[];
  atsByJob: LearnerEmploiAtsResult[];
}

export default function LearnerEmploiBoostFlow({
  onComplete,
  onLoadingChange,
}: {
  onComplete: (data: LearnerEmploiBoostFlowResult) => void;
  onLoadingChange?: (loading: boolean) => void;
}) {
  const { t } = useTranslation();
  const [phase, setPhase] = useState<Phase>("idle");
  const [file, setFile] = useState<File | null>(null);
  const [targetRole, setTargetRole] = useState("");
  const [error, setError] = useState("");
  const [result, setResult] = useState<LearnerEmploiAnalyzeResponse | null>(null);
  const [dragging, setDragging] = useState(false);
  const [factIdx, setFactIdx] = useState(0);
  const [loadStep, setLoadStep] = useState(0);
  const [showExplain, setShowExplain] = useState(false);
  const [editForm, setEditForm] = useState<ResumeEditForm>({
    role: "",
    summary: "",
    skills: "",
    experience: "",
    education: "",
    projects: "",
    certifications: "",
  });
  const [liveAts, setLiveAts] = useState<LearnerEmploiAtsResult[]>([]);
  const [uploadName, setUploadName] = useState("");

  const topAts = useMemo(() => {
    if (!result) return [];
    const rows = liveAts.length > 0 ? liveAts : result.ats_by_job;
    return [...rows].sort((a, b) => b.score - a.score).slice(0, 3);
  }, [result, liveAts]);

  const currentStep = useMemo(() => {
    if (phase === "idle") return 1;
    if (phase === "analyzing") return 2;
    if (phase === "review") return 3;
    if (phase === "edit") return 4;
    return 1;
  }, [phase]);

  useEffect(() => {
    if (!result || phase !== "edit") return;
    const timer = setTimeout(() => {
      setLiveAts(recomputeAts(result, editForm));
    }, 350);
    return () => clearTimeout(timer);
  }, [editForm, result, phase]);

  useEffect(() => {
    if (phase !== "analyzing") return;
    const facts = [
      String(t("cv.facts.fact1")),
      String(t("cv.facts.fact2")),
      String(t("cv.facts.fact3")),
      String(t("cv.facts.fact4")),
      String(t("cv.facts.fact5")),
    ];
    setFactIdx(0);
    setLoadStep(1);
    const delays = [700, 1300, 1700];
    let acc = 0;
    delays.forEach((ms, i) => {
      acc += ms;
      setTimeout(() => setLoadStep(i + 2), acc);
    });
    const ticker = setInterval(() => {
      setFactIdx((prev) => (prev + 1) % facts.length);
    }, 2600);
    return () => clearInterval(ticker);
  }, [phase, t]);

  useEffect(() => {
    onLoadingChange?.(phase === "analyzing");
  }, [phase, onLoadingChange]);

  async function runAnalysis() {
    if (!file) return;
    setError("");
    setShowExplain(false);
    setPhase("analyzing");
    try {
      const data = await analyzeLearnerEmploi({
        resume: file,
        targetRole: targetRole || undefined,
        maxJobs: 60,
      });
      setResult(data);
      setLiveAts(data.ats_by_job);
      setEditForm(toInitialEditForm(data, targetRole));
      setPhase("review");
    } catch (e) {
      const message = e instanceof Error ? e.message : String(t("learnerJobs.aiFlow.unableAnalyze"));
      setError(message);
      setPhase("idle");
    }
  }

  function applyAndShowJobs() {
    if (!result) return;
    const atsRows = phase === "edit" ? liveAts : result.ats_by_job;
    onComplete({
      review: result.resume_review,
      jobs: result.jobs,
      atsByJob: atsRows,
    });
  }

  return (
    <div className="space-y-5">
      <div className="space-y-1">
        <h3 className="text-lg font-semibold">{t("learnerJobs.aiFlow.title") as string}</h3>
        <p className="text-sm text-muted-foreground">
          {t("learnerJobs.aiFlow.subtitle") as string}
        </p>
      </div>

      <div className="rounded-lg border border-border p-3">
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          {[
            { id: 1, label: String(t("learnerJobs.aiFlow.stepUpload")) },
            { id: 2, label: String(t("learnerJobs.aiFlow.stepAnalyze")) },
            { id: 3, label: String(t("learnerJobs.aiFlow.stepReview")) },
              { id: 4, label: String(t("learnerJobs.aiFlow.stepEdit")) },
          ].map((step) => {
            const active = step.id === currentStep;
              const done = step.id < currentStep;
            return (
              <div
                key={step.id}
                className={`rounded-md px-2 py-2 text-center text-[11px] font-medium ${
                  done
                    ? "bg-emerald-500/10 text-emerald-700 border border-emerald-600/30"
                    : active
                    ? "bg-primary/10 text-primary border border-primary/30"
                    : "bg-muted/40 text-muted-foreground border border-border"
                }`}
              >
                <div className="mb-1 text-[10px] font-bold">{t("learnerJobs.aiFlow.stepLabel", { count: step.id }) as string}</div>
                <div>{step.label}</div>
              </div>
            );
          })}
        </div>
      </div>

      {phase === "idle" && (
        <div className="space-y-4">
          <div className="rounded-2xl border border-primary/20 bg-primary/5 p-4 text-center">
            <div className="mb-2 inline-flex items-center gap-2 rounded-full border border-primary/20 bg-background px-3 py-1 text-[11px] font-semibold text-primary">
              <Sparkles size={12} />
              {t("cv.poweredBy") as string}
            </div>
            <p className="text-sm text-muted-foreground">{t("cv.heroSubtitle") as string}</p>
          </div>
          <div className="space-y-2">
            <label className="text-xs font-medium text-muted-foreground">{t("learnerJobs.aiFlow.targetRoleLabel") as string}</label>
            <Input
              value={targetRole}
              onChange={(e) => setTargetRole(e.target.value)}
              placeholder={t("learnerJobs.aiFlow.targetRolePlaceholder") as string}
            />
          </div>
          <div className="space-y-2">
            <label className="text-xs font-medium text-muted-foreground">{t("learnerJobs.aiFlow.resumeFileLabel") as string}</label>
            <label
              className={`block cursor-pointer rounded-2xl border-2 border-dashed p-6 text-center transition-colors ${
                dragging ? "border-primary bg-primary/5" : "border-border hover:border-primary/40"
              }`}
              onDragOver={(e) => {
                e.preventDefault();
                setDragging(true);
              }}
              onDragLeave={() => setDragging(false)}
              onDrop={(e) => {
                e.preventDefault();
                setDragging(false);
                const picked = e.dataTransfer.files?.[0] ?? null;
                setFile(picked);
                setUploadName(picked?.name || "");
              }}
            >
              <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10">
                <Upload size={20} className="text-primary" />
              </div>
              <p className="text-sm font-semibold">{dragging ? (t("cv.dropHere") as string) : (t("cv.dragHere") as string)}</p>
              <p className="mt-1 text-xs text-muted-foreground">{uploadName || (t("cv.browseFiles") as string)}</p>
              <Input
                className="mt-3"
                type="file"
                accept=".pdf,.docx,.txt"
                onChange={(e) => {
                  const picked = e.target.files?.[0] ?? null;
                  setFile(picked);
                  setUploadName(picked?.name || "");
                }}
              />
            </label>
          </div>
          {error ? <p className="text-xs text-red-600">{error}</p> : null}
          <Button onClick={runAnalysis} disabled={!file} className="w-full bg-primary hover:bg-primary/90">
            {t("learnerJobs.aiFlow.analyzeCta") as string}
          </Button>
        </div>
      )}

      {phase === "analyzing" && (
        <div className="space-y-4 rounded-2xl border border-border p-5">
          <div className="flex items-center justify-center gap-3">
            <div className="relative flex h-10 w-10 items-center justify-center">
              <div className="absolute inset-0 rounded-full border-2 border-primary/20 border-t-primary animate-spin" />
              <RefreshCw size={16} className="text-primary" />
            </div>
            <p className="text-sm font-semibold">{t("learnerJobs.aiFlow.analyzing") as string}</p>
          </div>
          <div className="space-y-2">
            {[String(t("cv.loadStep1")), String(t("cv.loadStep2")), String(t("cv.loadStep3"))].map((label, idx) => {
              const n = idx + 1;
              const done = loadStep > n;
              const active = loadStep === n;
              return (
                <div
                  key={label}
                  className={`flex items-center gap-3 rounded-xl border px-3 py-2 text-xs ${
                    done ? "border-emerald-500/20 bg-emerald-500/5 text-emerald-700" : active ? "border-primary/20 bg-primary/5 text-primary" : "border-border text-muted-foreground"
                  }`}
                >
                  {done ? <CheckCircle size={14} /> : <div className={`h-2 w-2 rounded-full ${active ? "bg-primary" : "bg-muted-foreground/40"}`} />}
                  <span>{label}</span>
                </div>
              );
            })}
          </div>
          <p className="rounded-lg bg-muted/40 px-3 py-2 text-center text-xs italic text-muted-foreground">
            {[String(t("cv.facts.fact1")), String(t("cv.facts.fact2")), String(t("cv.facts.fact3")), String(t("cv.facts.fact4")), String(t("cv.facts.fact5"))][factIdx]}
          </p>
        </div>
      )}

      {phase === "review" && result && (
        <div className="space-y-4">
          <div className="rounded-2xl border border-border p-4">
            <div className="mb-3 flex items-center justify-between">
              <span className="text-sm font-semibold">{t("learnerJobs.aiFlow.reviewScore") as string}</span>
              <span className="rounded-full bg-primary/10 px-3 py-1 text-base font-bold text-primary">{Math.round(result.resume_review.score)}/100</span>
            </div>
            <p className="mb-3 text-sm text-muted-foreground">
              {(result as LearnerEmploiAnalyzeResponse).canonical_score?.next_actions?.[0]?.reason || (t("learnerJobs.aiFlow.subtitle") as string)}
            </p>
            <div className="mb-3 flex flex-wrap gap-2">
              <Button variant="outline" size="sm" onClick={() => setShowExplain((v) => !v)}>
                <Search size={14} className="mr-1" />
                {t("cv.explainAtsScore") as string}
              </Button>
              <Button size="sm" onClick={() => setPhase("edit")}>
                <Wand2 size={14} className="mr-1" />
                {t("learnerJobs.aiFlow.editResumeCta") as string}
              </Button>
            </div>
            {showExplain && (
              <div className="mb-3 rounded-xl border border-border bg-muted/20 p-3 text-xs text-muted-foreground">
                {(result.resume_review.weaknesses || []).slice(0, 5).map((w) => (
                  <p key={w} className="mb-1 last:mb-0">- {w}</p>
                ))}
              </div>
            )}
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <p className="text-sm font-semibold text-emerald-700 mb-1">{t("learnerJobs.aiFlow.strengths") as string}</p>
                <ul className="text-xs text-muted-foreground list-disc pl-4 space-y-0.5">
                  {result.resume_review.strengths.slice(0, 4).map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              </div>
              <div>
                <p className="text-sm font-semibold text-amber-700 mb-1">{t("learnerJobs.aiFlow.suggestions") as string}</p>
                <ul className="text-xs text-muted-foreground list-disc pl-4 space-y-0.5">
                  {result.resume_review.suggested_improvements.slice(0, 5).map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-border p-4">
            <p className="text-sm font-semibold mb-2">{t("learnerJobs.aiFlow.topAtsPreview") as string}</p>
            <div className="space-y-2">
              {topAts.map((row) => {
                const job = result.jobs.find((j) => j.id === row.job_id);
                if (!job) return null;
                return (
                  <div key={row.job_id} className="flex items-center justify-between rounded-md bg-muted/40 px-3 py-2">
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate">{job.title}</p>
                      <p className="text-xs text-muted-foreground truncate">{job.company} · {job.source}</p>
                    </div>
                    <span className="text-xs font-bold text-primary">{Math.round(row.score)}%</span>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="flex items-center justify-between rounded-2xl border border-border p-4">
            <p className="text-sm text-muted-foreground">
              {t("learnerJobs.aiFlow.readyJobs", { count: result.meta.total_returned }) as string}{" "}
              {t("learnerJobs.aiFlow.fromSources", { count: result.meta.sources_used.length }) as string}
            </p>
            <div className="flex items-center gap-2">
              <Button variant="outline" onClick={() => setPhase("edit")}>
                {t("learnerJobs.aiFlow.editResumeCta") as string}
              </Button>
              <Button onClick={applyAndShowJobs} className="bg-primary hover:bg-primary/90">
                {t("learnerJobs.aiFlow.displayJobsCta") as string}
              </Button>
            </div>
          </div>
        </div>
      )}

      {phase === "edit" && result && (
        <div className="space-y-4">
          <div className="rounded-lg border border-border p-4">
            <p className="mb-3 text-sm font-semibold">{t("learnerJobs.aiFlow.editorTitle") as string}</p>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-2">
                <label className="text-xs font-medium text-muted-foreground">{t("learnerJobs.aiFlow.targetRoleLabel") as string}</label>
                <Input
                  value={editForm.role}
                  onChange={(e) => setEditForm((prev) => ({ ...prev, role: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-medium text-muted-foreground">{t("learnerJobs.aiFlow.skillsLabel") as string}</label>
                <Input
                  value={editForm.skills}
                  onChange={(e) => setEditForm((prev) => ({ ...prev, skills: e.target.value }))}
                  placeholder={t("learnerJobs.aiFlow.skillsPlaceholder") as string}
                />
              </div>
            </div>
            <div className="mt-3 space-y-2">
              <label className="text-xs font-medium text-muted-foreground">{t("learnerJobs.aiFlow.summaryLabel") as string}</label>
              <textarea
                className="min-h-[84px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                value={editForm.summary}
                onChange={(e) => setEditForm((prev) => ({ ...prev, summary: e.target.value }))}
              />
            </div>
            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              <EditorBlock
                label={t("learnerJobs.aiFlow.experienceLabel") as string}
                value={editForm.experience}
                onChange={(value) => setEditForm((prev) => ({ ...prev, experience: value }))}
              />
              <EditorBlock
                label={t("learnerJobs.aiFlow.educationLabel") as string}
                value={editForm.education}
                onChange={(value) => setEditForm((prev) => ({ ...prev, education: value }))}
              />
              <EditorBlock
                label={t("learnerJobs.aiFlow.projectsLabel") as string}
                value={editForm.projects}
                onChange={(value) => setEditForm((prev) => ({ ...prev, projects: value }))}
              />
              <EditorBlock
                label={t("learnerJobs.aiFlow.certificationsLabel") as string}
                value={editForm.certifications}
                onChange={(value) => setEditForm((prev) => ({ ...prev, certifications: value }))}
              />
            </div>
            <div className="mt-3">
              <p className="mb-2 text-xs font-semibold text-amber-700">{t("learnerJobs.aiFlow.suggestions") as string}</p>
              <div className="flex flex-wrap gap-2">
                {result.resume_review.suggested_improvements.slice(0, 8).map((suggestion) => (
                  <button
                    key={suggestion}
                    type="button"
                    className="rounded-full border border-amber-500/30 bg-amber-500/10 px-2 py-1 text-[11px] text-amber-800"
                    onClick={() => {
                      setEditForm((prev) => ({
                        ...prev,
                        summary: prev.summary ? `${prev.summary}\n- ${suggestion}` : `- ${suggestion}`,
                      }));
                    }}
                  >
                    {t("learnerJobs.aiFlow.applySuggestion") as string}: {suggestion}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="rounded-lg border border-border p-4">
            <p className="mb-2 text-sm font-semibold">{t("learnerJobs.aiFlow.livePreview") as string}</p>
            <div className="space-y-2">
              {topAts.map((row) => {
                const job = result.jobs.find((j) => j.id === row.job_id);
                if (!job) return null;
                return (
                  <div key={row.job_id} className="flex items-center justify-between rounded-md bg-muted/40 px-3 py-2">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium">{job.title}</p>
                      <p className="truncate text-xs text-muted-foreground">{job.company} · {job.source}</p>
                    </div>
                    <span className="text-xs font-bold text-primary">{Math.round(row.score)}%</span>
                  </div>
                );
              })}
            </div>
            <div className="mt-3 flex items-center justify-end gap-2">
              <Button variant="outline" onClick={() => setPhase("review")}>
                {t("learnerJobs.aiFlow.backToReview") as string}
              </Button>
              <Button onClick={applyAndShowJobs} className="bg-primary hover:bg-primary/90">
                {t("learnerJobs.aiFlow.applyChangesCta") as string}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function EditorBlock({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <div className="space-y-2">
      <label className="text-xs font-medium text-muted-foreground">{label}</label>
      <textarea
        className="min-h-[88px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
    </div>
  );
}

function toInitialEditForm(result: LearnerEmploiAnalyzeResponse, targetRole: string): ResumeEditForm {
  const sections = result.parsed_resume?.sections || {};
  return {
    role: targetRole || result.parsed_resume?.role_hint || "",
    summary: (sections.summary || []).join("\n"),
    skills: (result.parsed_resume?.skills || []).join(", "),
    experience: (sections.experience || []).join("\n"),
    education: (sections.education || []).join("\n"),
    projects: (sections.projects || []).join("\n"),
    certifications: (sections.certifications || []).join("\n"),
  };
}

function recomputeAts(result: LearnerEmploiAnalyzeResponse, form: ResumeEditForm): LearnerEmploiAtsResult[] {
  const skills = form.skills
    .split(",")
    .map((v) => v.trim().toLowerCase())
    .filter(Boolean);
  const role = form.role.toLowerCase();

  return result.ats_by_job.map((row) => {
    const job = result.jobs.find((j) => j.id === row.job_id);
    const jobText = `${job?.title || ""} ${job?.description || ""}`.toLowerCase();
    const missing = row.missing_skills || [];
    const coveredMissing = missing.filter((m) => skills.some((s) => s.includes(m.toLowerCase()) || m.toLowerCase().includes(s))).length;
    const roleBoost = role && (job?.title || "").toLowerCase().includes(role) ? 4 : 0;
    const skillsBoost = missing.length > 0 ? Math.round((coveredMissing / missing.length) * 12) : 4;
    const keywordBoost = skills.filter((s) => jobText.includes(s)).length;
    const nextScore = Math.max(0, Math.min(100, row.score + roleBoost + skillsBoost + Math.min(keywordBoost, 6)));
    return {
      ...row,
      score: nextScore,
      missing_skills: missing.filter((m) => !skills.some((s) => s.includes(m.toLowerCase()) || m.toLowerCase().includes(s))),
    };
  }).sort((a, b) => b.score - a.score);
}
