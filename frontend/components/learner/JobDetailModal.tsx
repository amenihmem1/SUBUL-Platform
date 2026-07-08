"use client";

import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  X, MapPin, Briefcase, DollarSign, Clock, ExternalLink,
  CheckCircle2, XCircle, Sparkles, Bot, BookmarkPlus, Send,
  ChevronDown, ChevronUp, Star, Building2, Wifi,
} from "lucide-react";
import { Button } from "@/components/ui/button";

// ── Types ────────────────────────────────────────────────────────────────────

export interface JobForModal {
  url: string;
  title: string;
  industry: string;       // company / industry
  location: string;
  remote: string;
  salary: string;
  contract: string;
  experience: string;
  description: string;
  skills_req: string;
  skills_bon: string;
  source: string;
  match_score: number;
  cosine?: number;
  cosine_score?: number;
  gap_missing: string[];
  gap_matched?: string[];
  gap_total: number;
  gap_coverage?: number;
  xai?: {
    cosine_score: number;
    match_score: number;
    explanations: string[];
    score_formula: string;
    interpretation: string;
    tip?: string;
    strength?: string;
  };
}

interface JobDetailModalProps {
  job: JobForModal | null;
  open: boolean;
  onClose: () => void;
  onAskAI?: (job: JobForModal) => void;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function normalizeScore(v: number | undefined | null): number {
  if (!v && v !== 0) return 0;
  return v > 1 ? v / 100 : v;
}

function scoreColor(v: number): string {
  if (v >= 0.75) return "#22c55e";
  if (v >= 0.55) return "#f59e0b";
  if (v >= 0.4)  return "#f97316";
  return "#ef4444";
}

function scoreLabel(v: number): string {
  if (v >= 0.75) return "Excellent Match";
  if (v >= 0.55) return "Good Match";
  if (v >= 0.4)  return "Moderate Match";
  return "Low Match";
}

function ScoreArc({ value }: { value: number }) {
  const pct = Math.round(value * 100);
  const col = scoreColor(value);
  const r = 36;
  const circ = 2 * Math.PI * r;
  const dash = (pct / 100) * circ;

  return (
    <div className="relative flex items-center justify-center w-24 h-24">
      <svg className="absolute inset-0 -rotate-90" width="96" height="96" viewBox="0 0 96 96">
        <circle cx="48" cy="48" r={r} fill="none" stroke="currentColor" className="text-border" strokeWidth="8" />
        <circle
          cx="48" cy="48" r={r} fill="none"
          stroke={col} strokeWidth="8"
          strokeLinecap="round"
          strokeDasharray={`${dash} ${circ}`}
          className="transition-all duration-700"
        />
      </svg>
      <div className="text-center">
        <div className="text-xl font-extrabold font-mono leading-none" style={{ color: col }}>{pct}%</div>
        <div className="text-[9px] text-muted-foreground font-mono uppercase tracking-wide mt-0.5">match</div>
      </div>
    </div>
  );
}

function SkillPill({ label, matched }: { label: string; matched: boolean }) {
  return (
    <span className={[
      "inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-full font-medium border",
      matched
        ? "bg-emerald-50 text-emerald-700 border-emerald-200"
        : "bg-red-50 text-red-600 border-red-200",
    ].join(" ")}>
      {matched
        ? <CheckCircle2 className="w-3 h-3 shrink-0" />
        : <XCircle className="w-3 h-3 shrink-0" />
      }
      {label}
    </span>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="space-y-2">
      <h4 className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground">{title}</h4>
      {children}
    </div>
  );
}

// ── Modal ─────────────────────────────────────────────────────────────────────

export default function JobDetailModal({ job, open, onClose, onAskAI }: JobDetailModalProps) {
  const [descExpanded, setDescExpanded] = useState(false);
  const [saved, setSaved] = useState(false);
  const overlayRef = useRef<HTMLDivElement>(null);

  // Reset state when job changes
  useEffect(() => {
    setDescExpanded(false);
    setSaved(false);
  }, [job?.url]);

  // Close on Escape
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [open, onClose]);

  // Lock body scroll
  useEffect(() => {
    if (open) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => { document.body.style.overflow = ""; };
  }, [open]);

  if (!job) return null;

  const score = normalizeScore(job.match_score) || normalizeScore(job.cosine ?? job.cosine_score) || 0;
  const col = scoreColor(score);
  const label = scoreLabel(score);

  const missing  = Array.isArray(job.gap_missing) ? job.gap_missing : [];
  const matched  = Array.isArray(job.gap_matched) ? job.gap_matched : [];
  const allSkills = [...matched.map(s => ({ label: s, matched: true })), ...missing.map(s => ({ label: s, matched: false }))];

  const descTrimmed = job.description?.length > 600 && !descExpanded
    ? job.description.slice(0, 600) + "…"
    : job.description;

  const explanations = job.xai?.explanations ?? [];
  const tip = job.xai?.tip;
  const strength = job.xai?.strength;

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Backdrop */}
          <motion.div
            ref={overlayRef}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.18 }}
            className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm"
            onClick={onClose}
          />

          {/* Panel */}
          <motion.div
            initial={{ opacity: 0, x: "100%" }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: "100%" }}
            transition={{ type: "spring", damping: 28, stiffness: 280 }}
            className="fixed right-0 top-0 bottom-0 z-50 w-full max-w-xl bg-background shadow-2xl flex flex-col overflow-hidden"
            onClick={e => e.stopPropagation()}
          >
            {/* Top gradient accent */}
            <div className="h-1 w-full bg-gradient-to-r from-violet-500 via-fuchsia-500 to-pink-500 shrink-0" />

            {/* Header */}
            <div className="flex items-start gap-3 px-5 pt-4 pb-3 border-b border-border/60 shrink-0">
              {/* Company avatar */}
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-violet-500 to-fuchsia-600 shadow shadow-violet-500/20 text-white font-extrabold text-base">
                {(job.industry || job.title || "?").charAt(0).toUpperCase()}
              </div>

              <div className="flex-1 min-w-0">
                <h2 className="font-bold text-base text-foreground leading-snug line-clamp-2">{job.title}</h2>
                <div className="flex flex-wrap items-center gap-2 mt-1 text-xs text-muted-foreground">
                  {job.industry && (
                    <span className="flex items-center gap-1">
                      <Building2 className="w-3 h-3" />{job.industry}
                    </span>
                  )}
                  {job.location && (
                    <span className="flex items-center gap-1">
                      <MapPin className="w-3 h-3" />{job.location}
                    </span>
                  )}
                  {job.remote && job.remote !== "Not specified" && (
                    <span className="flex items-center gap-1 text-violet-600 font-medium">
                      <Wifi className="w-3 h-3" />{job.remote}
                    </span>
                  )}
                </div>
              </div>

              <button
                type="button"
                onClick={onClose}
                className="shrink-0 rounded-lg p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
                aria-label="Close"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Scrollable body */}
            <div className="flex-1 overflow-y-auto px-5 py-4 space-y-5">

              {/* Match score + meta pills */}
              <div className="flex items-center gap-5">
                <ScoreArc value={score} />

                <div className="flex-1 space-y-2">
                  <div>
                    <div className="text-sm font-bold" style={{ color: col }}>{label}</div>
                    {job.xai?.interpretation && (
                      <div className="text-xs text-muted-foreground mt-0.5">{job.xai.interpretation}</div>
                    )}
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {job.contract && job.contract !== "Not specified" && (
                      <span className="inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 border border-slate-200">
                        <Briefcase className="w-3 h-3" />{job.contract}
                      </span>
                    )}
                    {job.salary && job.salary !== "Not specified" && (
                      <span className="inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200">
                        <DollarSign className="w-3 h-3" />{job.salary}
                      </span>
                    )}
                    {job.experience && job.experience !== "Not specified" && (
                      <span className="inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200">
                        <Clock className="w-3 h-3" />{job.experience}
                      </span>
                    )}
                    <span className="inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-full bg-slate-100 text-slate-500 border border-slate-200">
                      via {job.source}
                    </span>
                  </div>
                </div>
              </div>

              {/* Why this job matches */}
              {(explanations.length > 0 || strength) && (
                <Section title="Why it matches your CV">
                  <div className="rounded-xl border border-emerald-200 bg-emerald-50/60 px-4 py-3 space-y-1.5">
                    {strength && (
                      <div className="flex items-start gap-2 text-sm text-emerald-800 font-medium">
                        <Star className="w-3.5 h-3.5 text-emerald-600 mt-0.5 shrink-0" />
                        {strength}
                      </div>
                    )}
                    {explanations.map((e, i) => (
                      <div key={i} className="flex items-start gap-2 text-xs text-emerald-700">
                        <CheckCircle2 className="w-3 h-3 text-emerald-600 mt-0.5 shrink-0" />
                        {e}
                      </div>
                    ))}
                  </div>
                </Section>
              )}

              {/* Skill match/gap */}
              {allSkills.length > 0 && (
                <Section title={`Skills — ${matched.length}/${allSkills.length} matched`}>
                  {/* Mini progress bar */}
                  <div className="h-1.5 rounded-full bg-border overflow-hidden mb-2">
                    <div
                      className="h-full rounded-full bg-emerald-500 transition-all duration-500"
                      style={{ width: `${allSkills.length > 0 ? (matched.length / allSkills.length) * 100 : 0}%` }}
                    />
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {allSkills.map(s => (
                      <SkillPill key={s.label} label={s.label} matched={s.matched} />
                    ))}
                  </div>
                  {tip && (
                    <div className="mt-2 flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-700">
                      <Sparkles className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                      <span><span className="font-semibold">Tip: </span>{tip}</span>
                    </div>
                  )}
                </Section>
              )}

              {/* Job description */}
              {job.description && (
                <Section title="Job Description">
                  <div className="rounded-xl border border-border bg-muted/40 px-4 py-3">
                    <p className="text-xs text-foreground/80 leading-relaxed whitespace-pre-line">{descTrimmed}</p>
                    {job.description.length > 600 && (
                      <button
                        type="button"
                        onClick={() => setDescExpanded(v => !v)}
                        className="mt-2 flex items-center gap-1 text-xs text-violet-600 hover:text-violet-800 font-medium"
                      >
                        {descExpanded
                          ? <><ChevronUp className="w-3.5 h-3.5" />Show less</>
                          : <><ChevronDown className="w-3.5 h-3.5" />Read more</>
                        }
                      </button>
                    )}
                  </div>
                </Section>
              )}

              {/* Required skills raw text (if no structured gap data) */}
              {allSkills.length === 0 && job.skills_req && (
                <Section title="Required Skills">
                  <div className="rounded-xl border border-border bg-muted/40 px-4 py-3">
                    <p className="text-xs text-foreground/80 leading-relaxed">{job.skills_req}</p>
                  </div>
                </Section>
              )}

              {/* Nice to have */}
              {job.skills_bon && job.skills_bon !== "Not specified" && (
                <Section title="Nice to Have">
                  <div className="rounded-xl border border-border bg-muted/40 px-4 py-3">
                    <p className="text-xs text-foreground/80 leading-relaxed">{job.skills_bon}</p>
                  </div>
                </Section>
              )}

            </div>

            {/* Footer actions */}
            <div className="px-5 py-3 border-t border-border/60 bg-background/95 shrink-0">
              <div className="flex items-center gap-2">
                {/* Apply */}
                <a
                  href={job.url || "#"}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex-1 inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-violet-600 to-fuchsia-600 px-4 py-2.5 text-sm font-bold text-white shadow shadow-violet-500/20 hover:from-violet-700 hover:to-fuchsia-700 transition-all"
                >
                  <ExternalLink className="w-4 h-4" />
                  Apply Now
                </a>

                {/* Save */}
                <button
                  type="button"
                  onClick={() => setSaved(v => !v)}
                  className={[
                    "inline-flex items-center justify-center gap-1.5 rounded-xl border px-3 py-2.5 text-xs font-semibold transition-all",
                    saved
                      ? "bg-violet-50 border-violet-300 text-violet-700"
                      : "border-border text-muted-foreground hover:border-violet-300 hover:text-violet-700",
                  ].join(" ")}
                  title="Save job"
                >
                  <BookmarkPlus className="w-4 h-4" />
                  {saved ? "Saved" : "Save"}
                </button>

                {/* Ask AI */}
                {onAskAI && (
                  <button
                    type="button"
                    onClick={() => { onAskAI(job); onClose(); }}
                    className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-border px-3 py-2.5 text-xs font-semibold text-muted-foreground hover:border-violet-300 hover:text-violet-700 transition-all"
                    title="Ask AI about this job"
                  >
                    <Bot className="w-4 h-4" />
                    Ask AI
                  </button>
                )}
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
