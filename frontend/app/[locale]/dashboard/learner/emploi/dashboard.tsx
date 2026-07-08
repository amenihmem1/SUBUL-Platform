"use client";

import { useState, useEffect, useRef, Suspense, useCallback, useMemo } from "react";
import { useSearchParams } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";

import axios from "axios";
import ReactMarkdown from "react-markdown";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";

import { api } from "@/lib/api/client";
import { getToken } from "@/lib/auth/token";
import {
  PIPE_STEPS, SOURCES, initPipeSteps,
  scoreColor, interpBadge, pipeColor, pipeBg, pipeBorder,
  type PipeState,
} from "@/lib/theme";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import ATSScoreModal from "@/components/learner/ATSScoreModal";
import { cn } from "@/lib/utils";
import { cvKeys } from "@/hooks/api/useCvBooster";

interface Job {
  url: string; source: string; title: string; industry: string;
  location: string; remote: string; salary: string; contract: string;
  education: string; experience: string; description: string;
  skills_req: string; skills_bon: string;
  cosine: number;
  cosine_score?: number;
  match_score: number;
  gap_missing: string[]; gap_matched?: string[];
  gap_coverage?: number; gap_total: number;
  xai?: {
    cosine_score: number; match_score: number;
    explanations: string[]; score_formula: string; interpretation: string;
    tip?: string;
    strength?: string;
  };
}

function normalizeScore(v: number | undefined | null): number {
  if (!v) return 0;
  return v > 1 ? v / 100 : v;
}

function apiMatchToJob(raw: Record<string, unknown>): Job {
  const ms = Number(raw.match_score ?? raw.total ?? 0);
  const matchNorm = ms > 1 ? ms / 100 : ms;
  const cos = Number(raw.cosine ?? 0);
  const cosNorm = cos > 1 ? cos / 100 : cos;
  const gapMissing = Array.isArray(raw.gap_missing) ? (raw.gap_missing as string[]) : [];
  return {
    url: String(raw.url || ""),
    source: String(raw.source || ""),
    title: String(raw.title || ""),
    industry: String(raw.company || raw.industry || ""),
    location: String(raw.location || ""),
    remote: String(raw.remote || ""),
    salary: String(raw.salary || ""),
    contract: String(raw.contract || ""),
    education: "",
    experience: String(raw.experience || raw.seniority || ""),
    description: String(raw.description || ""),
    skills_req: String(raw.must_have || raw.skills_req || ""),
    skills_bon: String(raw.nice_to_have || raw.skills_bon || ""),
    cosine: cosNorm,
    cosine_score: cosNorm,
    match_score: matchNorm,
    gap_missing: gapMissing,
    gap_total: gapMissing.length,
  };
}

function sseCardToJob(card: Record<string, unknown>): Job {
  const msRaw = Number(card.match_score ?? -1);
  const matchNorm = msRaw < 0 ? 0 : msRaw > 1 ? msRaw / 100 : msRaw;
  const cos = Number(card.cosine ?? 0);
  const cosNorm = cos > 1 ? cos / 100 : cos;
  const gapMissing = Array.isArray(card.gap_missing) ? (card.gap_missing as string[]) : [];
  return {
    url: String(card.url || ""),
    source: String(card.source || ""),
    title: String(card.title || ""),
    industry: String(card.industry || ""),
    location: String(card.location || ""),
    remote: String(card.remote || ""),
    salary: String(card.salary || ""),
    contract: String(card.contract || ""),
    education: String(card.education || ""),
    experience: String(card.experience || ""),
    description: String(card.description || ""),
    skills_req: String(card.skills_req || ""),
    skills_bon: String(card.skills_bon || ""),
    cosine: cosNorm,
    cosine_score: cosNorm,
    match_score: matchNorm,
    gap_missing: gapMissing,
    gap_total: Number(card.gap_total) || gapMissing.length,
    xai: card.xai as Job["xai"],
  };
}

interface RoadmapItem {
  skill: string; week_start: number; week_end: number;
  duration: string; difficulty: string; resources: string[]; priority: string;
}

interface Message { role: "user" | "assistant"; content: string; }

type Tab = "matches" | "gap" | "roadmap" | "market" | "report";

function buildJdText(job: Job): string {
  return [job.title, job.description, job.skills_req, job.skills_bon]
    .filter(Boolean)
    .join("\n\n");
}

function extractApiError(e: unknown): string {
  if (axios.isAxiosError(e)) {
    const d = e.response?.data;
    if (d && typeof d === "object" && "message" in d) {
      const m = (d as { message: unknown }).message;
      if (Array.isArray(m)) return m.map(String).join("; ");
      if (typeof m === "string") return m;
    }
    if (typeof d === "string" && d) return d;
    const st = e.response?.status;
    if (st) return `Request failed (${st})`;
    return e.message || "Request failed";
  }
  if (e instanceof Error) return e.message;
  return "Request failed";
}

function enrichGapRoadmapMessage(e: unknown, raw: string): string {
  const status = axios.isAxiosError(e) ? e.response?.status : undefined;
  const lower = raw.toLowerCase();
  if (status === 400 || /no skills|skills provided|skill/i.test(lower)) {
    return `${raw} Open the Matches tab and run a job scan once your CV is processed so we can load your skills.`;
  }
  if (status === 503 || status === 502 || /market|unavailable|not initialized/i.test(lower)) {
    return `${raw} The job search service may still be starting—wait a moment and try again.`;
  }
  return raw;
}

function mapAtsResponseToModal(d: Record<string, unknown>) {
  const breakdown = (d.breakdown as Record<string, number> | undefined) || {};
  const sections: Record<string, { score: number; max: number; detail?: string }> = {};
  for (const [k, v] of Object.entries(breakdown)) {
    sections[k.replace(/_/g, " ")] = { score: Math.round(Number(v)), max: 100, detail: "" };
  }
  const collectMatched = (sr: unknown): string[] => {
    if (!sr || typeof sr !== "object") return [];
    const m = (sr as { matched?: unknown[] }).matched;
    if (!Array.isArray(m)) return [];
    return m
      .map((row) => {
        if (row && typeof row === "object" && "jd_skill" in row) {
          return String((row as { jd_skill: string }).jd_skill);
        }
        return "";
      })
      .filter(Boolean);
  };
  const skillsMatched = [...collectMatched(d.skills_result), ...collectMatched(d.preferred_result)];
  const uniq = [...new Set(skillsMatched)];
  const missReq = Array.isArray(d.missing_required) ? (d.missing_required as string[]) : [];
  const missPref = Array.isArray(d.missing_preferred) ? (d.missing_preferred as string[]) : [];
  const suggestions = Array.isArray(d.suggestions) ? (d.suggestions as string[]).map(String) : [];
  return {
    total_score: Number(d.total_score) || 0,
    sections: Object.keys(sections).length ? sections : undefined,
    keywords_matched: uniq.slice(0, 24),
    keywords_missing: [...missReq, ...missPref].slice(0, 24),
    suggestions,
  };
}

// ─── ScoreBars ───────────────────────────────────────────────────────────────

function ScoreBars({ job }: { job: Job }) {
  return (
    <div className="flex flex-col gap-1.5 my-2">
      {[
        { label: "Title Match", sub: "cosine", value: normalizeScore(job.cosine ?? job.cosine_score) },
        { label: "AI Match", sub: "biencoder", value: normalizeScore(job.match_score) },
      ].map(({ label, sub, value }) =>
        value > 0 ? (
          <div key={label} className="flex items-center gap-2">
            <div className="w-[68px] shrink-0">
              <div className="text-[9px] text-muted-foreground font-mono uppercase font-bold leading-tight">
                {label}
              </div>
              <div className="text-[8px] text-muted-foreground/60 font-mono leading-tight">
                {sub}
              </div>
            </div>
            <div className="flex-1 h-1 bg-border rounded-sm overflow-hidden">
              <div
                className="h-full rounded-sm transition-[width] duration-500"
                style={{ width: `${value * 100}%`, background: scoreColor(value) }}
              />
            </div>
            <span
              className="text-[10px] font-bold min-w-[42px] text-right font-mono"
              style={{ color: scoreColor(value) }}
            >
              {(value * 100).toFixed(1)}%
            </span>
          </div>
        ) : null,
      )}
    </div>
  );
}

// ─── JobCard ─────────────────────────────────────────────────────────────────

function scoreToInterp(score: number): string {
  if (score >= 0.75) return "excellent";
  if (score >= 0.55) return "good";
  if (score >= 0.40) return "moderate";
  return "low";
}

function JobCard({ job, onAtsScore, isScanning }: { job: Job; onAtsScore?: (job: Job) => void; isScanning?: boolean }) {
  const [expanded, setExpanded] = useState(false);
  const [showXAI, setShowXAI] = useState(false);
  const [showAllGap, setShowAllGap] = useState(false);

  const score = normalizeScore(job.match_score) || normalizeScore(job.cosine ?? job.cosine_score) || 0;
  const col = scoreColor(score);
  const interpolated = scoreToInterp(score);
  const xaiInterp = typeof job.xai?.interpretation === 'string' ? job.xai.interpretation.toLowerCase() : "";
  const validInterp = ["excellent", "good", "moderate", "low"].includes(xaiInterp) ? xaiInterp : undefined;
  const interp = isScanning ? interpolated : (validInterp || interpolated);
  const b = interpBadge(interp);

  const missingAll = Array.isArray(job.gap_missing) ? job.gap_missing : [];
  const matchedAll = Array.isArray(job.gap_matched) ? job.gap_matched : [];
  const PREVIEW_MISS = 3;
  const PREVIEW_MATCH = 2;
  const extraMissing = missingAll.length - PREVIEW_MISS;
  const visibleMissing = showAllGap ? missingAll : missingAll.slice(0, PREVIEW_MISS);
  const visibleMatched = showAllGap ? matchedAll : matchedAll.slice(0, PREVIEW_MATCH);

  return (
    <div
      className="bg-card rounded-xl px-4 py-3.5 flex flex-col gap-[7px] border border-t-[3px]"
      style={{ borderColor: `${col}33`, borderTopColor: col }}
    >
      {/* Header row */}
      <div className="flex gap-2.5 items-start">
        <div className="w-[34px] h-[34px] rounded-lg shrink-0 bg-gradient-to-br from-primary to-accent flex items-center justify-center font-extrabold text-[13px] text-white">
          {(job.industry || job.title || "?").charAt(0).toUpperCase()}
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-xs font-bold text-foreground leading-tight">
            {job.title}
            {isScanning && (
              <span className="ml-2 px-2 py-0.5 text-[9px] font-semibold rounded-full border border-foreground/20 bg-foreground/5 text-foreground/80">
                Preview
              </span>
            )}
          </div>
          <div className="text-[10px] text-muted-foreground mt-0.5">{job.industry || "—"}</div>
        </div>
        <div className="text-right shrink-0">
          <div className="text-base font-extrabold font-mono leading-none" style={{ color: col }}>
            {(score * 100).toFixed(1)}%
          </div>
          {b && (
            <span
              className="text-[9px] px-1.5 py-px rounded font-bold inline-block"
              style={{ background: b.bg, color: b.color }}
            >
              {b.label}
            </span>
          )}
          <div className="text-[9px] text-muted-foreground/70 font-mono mt-0.5">{job.source}</div>
        </div>
      </div>

      {/* Location / remote / salary */}
      <div className="text-[10px] text-muted-foreground flex flex-wrap gap-[5px]">
        {job.location && <span>📍 {job.location}</span>}
        {job.remote && <span className="text-accent font-semibold">{job.remote}</span>}
        {job.salary && job.salary !== "Not specified" && (
          <span className="text-amber-600">💰 {job.salary}</span>
        )}
      </div>

      <ScoreBars job={job} />

      {/* Skills Gap */}
      {job.gap_total > 0 && (
        <div className="border-t border-border pt-[7px]">
          <div className="flex justify-between mb-1">
            <span className="text-[9px] text-muted-foreground uppercase tracking-wide">Skills Gap</span>
            <span className={cn("text-[9px] font-bold", missingAll.length === 0 ? "text-emerald-600" : "text-amber-600")}>
              {job.gap_total - missingAll.length}/{job.gap_total} covered
            </span>
          </div>
          <div className="flex flex-wrap gap-[3px]">
            {visibleMissing.map(s => (
              <span key={s} className="text-[9px] px-1.5 py-px rounded bg-red-600/[0.07] text-red-600 border border-red-600/20">
                {s}
              </span>
            ))}
            {visibleMatched.map(s => (
              <span key={s} className="text-[9px] px-1.5 py-px rounded bg-emerald-600/[0.07] text-emerald-600 border border-emerald-600/20">
                ✓ {s}
              </span>
            ))}
            {!showAllGap && extraMissing > 0 && (
              <button
                onClick={() => setShowAllGap(true)}
                className="text-[9px] px-1.5 py-px rounded bg-amber-600/10 text-amber-600 border border-amber-600/30 font-mono font-bold cursor-pointer"
              >
                +{extraMissing}
              </button>
            )}
            {showAllGap && extraMissing > 0 && (
              <button
                onClick={() => setShowAllGap(false)}
                className="text-[9px] px-1.5 py-px rounded bg-secondary text-muted-foreground border border-border font-mono font-bold cursor-pointer"
              >
                ▲ less
              </button>
            )}
          </div>
        </div>
      )}

      {/* XAI explanation */}
      <div className="border-t border-border pt-2">
        <button
          onClick={() => setShowXAI(!showXAI)}
          className="border rounded-md text-[10px] py-1 px-2.5 cursor-pointer font-mono text-left w-full transition-colors duration-200"
          style={{ background: showXAI ? `${col}0d` : "transparent", borderColor: `${col}44`, color: col }}
        >
          {showXAI ? "▲ Hide explanation" : "🔍 Explain scores (XAI)"}
        </button>
        {showXAI && (
          <div className="mt-2 bg-secondary border border-border rounded-[10px] p-3">
            <div className="flex items-center gap-2 mb-2.5">
              <span className="text-xs font-bold text-foreground">Score Explanation</span>
              <span
                className="text-[10px] px-2 py-0.5 rounded font-bold"
                style={{ background: b.bg, color: b.color }}
              >
                {b.label}
              </span>
            </div>

            {/* Cosine similarity */}
            {(() => {
              const cosP = normalizeScore(job.xai?.cosine_score ?? job.cosine ?? job.cosine_score);
              const cosCol = scoreColor(cosP);
              return (
                <div className="flex items-start gap-2.5 p-[7px_10px] bg-card rounded-lg mb-1.5 border border-border">
                  <div className="min-w-[130px]">
                    <div className="text-[10px] font-bold text-muted-foreground uppercase tracking-wide font-mono mb-1">
                      🎯 Cosine Similarity
                    </div>
                    <div className="h-1 rounded-full bg-border overflow-hidden mb-[3px]">
                      <div className="h-full rounded-full" style={{ width: `${cosP * 100}%`, background: cosCol }} />
                    </div>
                    <span className="text-xs font-extrabold font-mono" style={{ color: cosCol }}>
                      {(cosP * 100).toFixed(1)}%
                    </span>
                  </div>
                  <div className="text-[11px] text-foreground/70 leading-relaxed pt-0.5">
                    <strong className="text-foreground">Title Match</strong> —{" "}
                    {cosP >= 0.75
                      ? "Your job title strongly aligns with this role."
                      : cosP >= 0.55
                        ? "Your profile partially matches the job title."
                        : "Limited title overlap — consider tailoring your headline."}
                  </div>
                </div>
              );
            })()}

            {/* AI Match */}
            {(() => {
              const aiP = normalizeScore(job.xai?.match_score ?? job.match_score);
              const aiCol = scoreColor(aiP);
              return (
                <div className="flex items-start gap-2.5 p-[7px_10px] bg-card rounded-lg mb-1.5 border border-border">
                  <div className="min-w-[130px]">
                    <div className="text-[10px] font-bold text-muted-foreground uppercase tracking-wide font-mono mb-1">
                      🤖 AI Match
                    </div>
                    <div className="h-1 rounded-full bg-border overflow-hidden mb-[3px]">
                      <div className="h-full rounded-full" style={{ width: `${aiP * 100}%`, background: aiCol }} />
                    </div>
                    <span className="text-xs font-extrabold font-mono" style={{ color: aiCol }}>
                      {(aiP * 100).toFixed(1)}%
                    </span>
                  </div>
                  <div className="text-[11px] text-foreground/70 leading-relaxed pt-0.5">
                    <strong className="text-foreground">BiEncoder Score</strong> —{" "}
                    {job.xai?.explanations?.[0]
                      ? job.xai.explanations[0]
                      : aiP >= 0.75
                        ? "Excellent overall fit."
                        : aiP >= 0.55
                          ? "Good fit — a few gaps exist."
                          : "Moderate fit — key requirements may be missing."}
                  </div>
                </div>
              );
            })()}

            {/* Skills Coverage */}
            {job.gap_total > 0 && (() => {
              const covered = job.gap_total - missingAll.length;
              const pct = Math.round(covered / job.gap_total * 100);
              const covCol = pct >= 70 ? "hsl(var(--success))" : pct >= 40 ? "hsl(var(--warning))" : "hsl(var(--destructive))";
              return (
                <div className="flex items-start gap-2.5 p-[7px_10px] bg-card rounded-lg mb-1 border border-border">
                  <div className="min-w-[130px]">
                    <div className="text-[10px] font-bold text-muted-foreground uppercase tracking-wide font-mono mb-1">
                      📊 Skills Coverage
                    </div>
                    <div className="h-1 rounded-full bg-border overflow-hidden mb-[3px]">
                      <div className="h-full rounded-full" style={{ width: `${pct}%`, background: covCol }} />
                    </div>
                    <span className="text-xs font-extrabold font-mono" style={{ color: covCol }}>
                      {covered}/{job.gap_total}
                    </span>
                  </div>
                  <div className="text-[11px] text-foreground/70 leading-relaxed pt-0.5">
                    <strong className="text-foreground">{pct}% covered</strong> —{" "}
                    {missingAll.length === 0
                      ? "You meet all required skills! 🎉"
                      : `Missing: ${missingAll.slice(0, 4).join(", ")}${missingAll.length > 4 ? ` +${missingAll.length - 4} more` : ""}.`}
                  </div>
                </div>
              );
            })()}

            {/* Extra explanations */}
            {job.xai?.explanations?.slice(1).map((e, i) => (
              <div key={i} className="text-[10px] text-muted-foreground leading-normal p-2 bg-background rounded-md mt-1 font-mono italic">
                {e}
              </div>
            ))}

            {/* Tip */}
            {job.xai?.tip && job.xai.tip.trim() && (
              <div className="mt-2 p-2.5 rounded-lg border border-amber-400/25 bg-gradient-to-br from-amber-400/[0.12] to-amber-400/[0.04]">
                <div className="text-[9px] font-extrabold text-amber-600 uppercase tracking-widest mb-1">
                  💡 Tip for this role
                </div>
                <div className="text-[11px] text-foreground/70 leading-normal">{job.xai.tip}</div>
              </div>
            )}

            {/* Strength */}
            {job.xai?.strength && job.xai.strength.trim() && (
              <div className="mt-1.5 p-2.5 rounded-lg border border-emerald-600/20 bg-gradient-to-br from-emerald-600/[0.08] to-emerald-600/[0.03]">
                <div className="text-[9px] font-extrabold text-emerald-600 uppercase tracking-widest mb-1">
                  ✓ Your strength to highlight
                </div>
                <div className="text-[11px] text-foreground/70 leading-normal">{job.xai.strength}</div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Expanded details */}
      {expanded && (
        <div className="border-t border-border pt-2 flex flex-col gap-1.5">
          {job.skills_req && (
            <div>
              <div className="text-[9px] text-muted-foreground uppercase mb-1">Required Skills</div>
              <div className="flex flex-wrap gap-[3px]">
                {job.skills_req.split(",").slice(0, 6).map(s => s.trim()).filter(Boolean).map(s => (
                  <span key={s} className="text-[9px] px-1.5 py-px rounded bg-accent/[0.07] text-accent border border-accent/20">
                    {s}
                  </span>
                ))}
              </div>
            </div>
          )}
          {job.description && (
            <div className="text-[11px] text-muted-foreground leading-relaxed max-h-[100px] overflow-y-auto bg-background rounded-md p-2 font-mono">
              {job.description.slice(0, 300)}…
            </div>
          )}
          <a
            href={job.url}
            target="_blank"
            rel="noopener"
            className="block text-center p-2 bg-gradient-to-r from-primary to-accent rounded-lg text-xs font-bold text-white no-underline"
          >
            Apply →
          </a>
        </div>
      )}

      {/* Footer buttons */}
      <div className="flex gap-2">
        <button
          onClick={() => setExpanded(!expanded)}
          className="flex-1 bg-transparent border border-border rounded-md text-muted-foreground text-[10px] py-1 px-2 cursor-pointer font-mono"
        >
          {expanded ? "▲ Show less" : "▼ More details"}
        </button>
        {onAtsScore && (
          <Button
            variant="outline"
            size="sm"
            className="text-[10px] h-auto py-1 px-2.5 font-mono"
            onClick={() => onAtsScore(job)}
          >
            📊 ATS Score
          </Button>
        )}
      </div>
    </div>
  );
}

// ─── Charts ──────────────────────────────────────────────────────────────────

function VerticalChart({ data, title, valueKey, labelKey, barColor = "hsl(var(--accent))", height = 220 }: {
  data: any[]; title: string; valueKey: string; labelKey: string; barColor?: string; height?: number;
}) {
  if (!data?.length) return null;
  const maxVal = Math.max(...data.map(d => d[valueKey]));
  const BW = 44, GAP = 10, M = { top: 20, right: 16, bottom: 64, left: 36 };
  const cH = height - M.top - M.bottom;
  const cW = data.length * (BW + GAP) - GAP;
  return (
    <Card className="p-4">
      <div className="text-[13px] font-bold text-foreground mb-3.5">{title}</div>
      <div className="overflow-x-auto">
        <svg width={cW + M.left + M.right} height={height} className="block">
          {[0, Math.round(maxVal / 2), maxVal].map(t => {
            const y = M.top + cH - (t / maxVal) * cH;
            return (
              <g key={t}>
                <line x1={M.left} x2={M.left + cW} y1={y} y2={y} stroke="hsl(var(--border))" strokeWidth={1} strokeDasharray={t === 0 ? "0" : "4 3"} />
                <text x={M.left - 6} y={y + 4} textAnchor="end" fontSize={9} fill="hsl(var(--muted-foreground))">{t}</text>
              </g>
            );
          })}
          {data.map((d, i) => {
            const x = M.left + i * (BW + GAP);
            const bH = Math.max(2, (d[valueKey] / maxVal) * cH);
            const y = M.top + cH - bH;
            const lbl: string = d[labelKey] || "";
            const tr = lbl.length > 9 ? lbl.slice(0, 8) + "…" : lbl;
            return (
              <g key={lbl}>
                <rect x={x} y={M.top} width={BW} height={cH} fill="hsl(var(--secondary))" rx={4} />
                <rect x={x} y={y} width={BW} height={bH} fill={barColor} rx={4} opacity={0.9}><title>{lbl}: {d[valueKey]}</title></rect>
                <text x={x + BW / 2} y={y - 5} textAnchor="middle" fontSize={10} fontWeight="700" fill={barColor}>{d[valueKey]}</text>
                <text x={x + BW / 2} y={M.top + cH + 14} textAnchor="end" fontSize={9} fill="hsl(var(--muted-foreground))" transform={`rotate(-35,${x + BW / 2},${M.top + cH + 14})`}>{tr}</text>
              </g>
            );
          })}
          <line x1={M.left} x2={M.left} y1={M.top} y2={M.top + cH} stroke="hsl(var(--border))" strokeWidth={1} />
        </svg>
      </div>
    </Card>
  );
}

function HorizontalChart({ data, title, valueKey, labelKey, barColor = "hsl(var(--primary))" }: {
  data: any[]; title: string; valueKey: string; labelKey: string; barColor?: string;
}) {
  if (!data?.length) return null;
  const maxVal = Math.max(...data.map(d => d[valueKey]));
  const RH = 24, GAP = 4, LW = 110, BA = 200;
  const vb = `0 0 ${LW + BA + 44} ${data.length * (RH + GAP) + 4}`;
  return (
    <div className="w-full min-w-0">
      {title && <div className="text-[12px] font-semibold text-foreground mb-2">{title}</div>}
      <svg viewBox={vb} className="block w-full" style={{ height: data.length * (RH + GAP) + 4 }}>
        {data.map((d, i) => {
          const y = i * (RH + GAP);
          const bW = Math.max(4, (d[valueKey] / maxVal) * BA);
          const lbl: string = d[labelKey] || "";
          const tr = lbl.length > 16 ? lbl.slice(0, 15) + "…" : lbl;
          return (
            <g key={lbl}>
              <text x={LW - 6} y={y + RH / 2 + 4} textAnchor="end" fontSize={9} fill="hsl(var(--muted-foreground))">{tr}</text>
              <rect x={LW} y={y + 3} width={BA} height={RH - 6} fill="hsl(var(--secondary))" rx={3} />
              <rect x={LW} y={y + 3} width={bW} height={RH - 6} fill={barColor} rx={3} opacity={0.85}><title>{lbl}: {d[valueKey]}</title></rect>
              <text x={LW + bW + 5} y={y + RH / 2 + 4} fontSize={9} fontWeight="700" fill={barColor}>{d[valueKey]}</text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}

// ─── ScanningBanner ──────────────────────────────────────────────────────────

function ScanningBanner({ pipeSteps, pipeRole, enrichN }: {
  pipeSteps: Record<string, PipeState>; pipeRole: string; enrichN: number;
}) {
  return (
    <div className="bg-card border border-border rounded-2xl px-[22px] py-4 mb-5 shadow-[0_2px_12px_rgba(122,63,176,0.08)] relative overflow-hidden">
      <div className="absolute top-0 left-0 right-0 h-[3px] bg-gradient-to-r from-primary to-accent" />

      <div className="flex items-center justify-between mb-3.5">
        <div className="flex items-center gap-2.5">
          <div className="flex gap-1">
            {[0, 120, 240].map(d => (
              <div
                key={d}
                className="w-1.5 h-1.5 rounded-full bg-primary"
                style={{ animation: `dot-bounce 0.9s ${d}ms ease-in-out infinite` }}
              />
            ))}
          </div>
          <span className="text-sm font-bold text-foreground">
            Analyzing CV{pipeRole ? ` — ${pipeRole}` : "…"}
          </span>
        </div>
        {enrichN > 0 && (
          <span className="text-xs text-muted-foreground font-mono">
            Enriched: <b className="text-primary">{enrichN}</b>
          </span>
        )}
      </div>

      <div className="flex flex-wrap gap-1.5 mb-2.5">
        {PIPE_STEPS.map((step: any) => (
          <div
            key={step.id}
            className="flex items-center gap-[5px] px-2.5 py-1 rounded-[7px] text-[10px] font-semibold font-mono transition-all duration-300 border"
            style={{
              borderColor: pipeBorder(pipeSteps[step.id]),
              background: pipeBg(pipeSteps[step.id]),
              color: pipeColor(pipeSteps[step.id]),
            }}
          >
            <span
              className="w-[5px] h-[5px] rounded-full bg-current inline-block shrink-0"
              style={{ animation: pipeSteps[step.id] === "active" ? "dot-pulse 1.1s infinite" : "none" }}
            />
            {step.icon} {step.label}
          </div>
        ))}
      </div>

      <div className="flex flex-wrap gap-[5px]">
        {SOURCES.map((src: any) => (
          <div
            key={src}
            className="flex items-center gap-[3px] px-2 py-0.5 rounded-[5px] text-[9px] font-semibold font-mono transition-all duration-300 border"
            style={{
              borderColor: pipeBorder(pipeSteps[src]),
              background: pipeBg(pipeSteps[src]),
              color: pipeColor(pipeSteps[src]),
            }}
          >
            {pipeSteps[src] === "done" ? "✓" : (
              <span
                className="w-1 h-1 rounded-full bg-current inline-block"
                style={{ animation: "dot-pulse 1.1s infinite" }}
              />
            )}
            {" "}{src}
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── CvInfoBar ───────────────────────────────────────────────────────────────

function CvInfoBar({
  fileName,
  jobCount,
  isScanning,
  isReplacing,
  replaceStatus,
  replaceError,
  onReplaceClick,
  onScanWithNewCv,
}: {
  fileName?: string | null;
  jobCount: number;
  isScanning: boolean;
  isReplacing: boolean;
  replaceStatus: "idle" | "uploading" | "done" | "error";
  replaceError: string;
  onReplaceClick: () => void;
  onScanWithNewCv: () => void;
}) {
  return (
    <div className="mb-4">
      <div className="flex items-center justify-between px-4 py-2.5 rounded-xl border border-border bg-card/60">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-7 h-7 rounded-lg bg-emerald-500/10 flex items-center justify-center text-sm shrink-0">
            ✅
          </div>
          <div className="min-w-0">
            <div className="text-xs font-semibold text-foreground leading-tight truncate max-w-[220px]">
              {isReplacing ? "Uploading new CV…" : (fileName || "CV ready")}
            </div>
            <div className="text-[10px] text-muted-foreground">
              {isReplacing
                ? "Please wait…"
                : replaceStatus === "done"
                ? "CV replaced — ready for a fresh scan"
                : jobCount > 0
                ? `${jobCount} job match${jobCount !== 1 ? "es" : ""} loaded`
                : "Ready for job matching"}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0 ml-3">
          {replaceStatus === "done" && !isScanning && (
            <Button
              size="sm"
              className="text-[10px] h-7 px-3 bg-primary hover:bg-primary/90"
              onClick={onScanWithNewCv}
            >
              🔍 Scan with new CV
            </Button>
          )}
          <Button
            variant="outline"
            size="sm"
            className="text-[10px] h-7 px-2.5 gap-1"
            onClick={onReplaceClick}
            disabled={isScanning || isReplacing}
          >
            📎 Replace CV
          </Button>
        </div>
      </div>
      {replaceStatus === "error" && replaceError && (
        <div className="mt-1.5 px-3 py-2 rounded-lg border border-destructive/25 bg-destructive/5 text-[11px] text-destructive">
          ⚠ {replaceError}
        </div>
      )}
    </div>
  );
}

// ─── ScanLoadingScreen ────────────────────────────────────────────────────────

const SCAN_STEPS_DEF = [
  { id: "cv",       label: "Reading CV",          icon: "📄" },
  { id: "scraping", label: "Searching boards",    icon: "🌐" },
  { id: "scoring",  label: "AI scoring",          icon: "🤖" },
  { id: "ranking",  label: "Ranking results",     icon: "🏆" },
];

function ScanLoadingScreen({
  scanJobs,
  pipeRole,
  enrichN,
}: {
  scanJobs: Job[];
  pipeRole: string;
  enrichN: number;
}) {
  const [activeStep, setActiveStep] = useState(0);
  const [progress, setProgress] = useState(5);

  useEffect(() => {
    if (enrichN > 0) { setActiveStep(3); setProgress(p => Math.max(p, 82)); }
    else if (scanJobs.length > 0) { setActiveStep(2); setProgress(p => Math.max(p, 52)); }
    else if (pipeRole) { setActiveStep(1); setProgress(p => Math.max(p, 22)); }
  }, [scanJobs.length, pipeRole, enrichN]);

  useEffect(() => {
    const caps = [20, 50, 80, 92];
    const cap = caps[activeStep] ?? 92;
    const interval = setInterval(() => {
      setProgress(p => (p < cap ? Math.min(p + 0.4, cap) : p));
    }, 280);
    return () => clearInterval(interval);
  }, [activeStep]);

  return (
    <div className="py-10 px-4 flex flex-col items-center gap-6">
      {/* Progress bar */}
      <div className="w-full max-w-sm">
        <div className="flex justify-between mb-2">
          <span className="text-xs font-semibold text-foreground">
            {SCAN_STEPS_DEF[activeStep]?.icon}{" "}
            {SCAN_STEPS_DEF[activeStep]?.label}…
          </span>
          <span className="text-[11px] font-mono text-muted-foreground">{Math.round(progress)}%</span>
        </div>
        <div className="h-1.5 rounded-full bg-border overflow-hidden">
          <div
            className="h-full rounded-full bg-gradient-to-r from-primary to-accent transition-[width] duration-700"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      {/* Step indicators */}
      <div className="flex gap-2 w-full max-w-sm">
        {SCAN_STEPS_DEF.map((step, i) => (
          <div
            key={step.id}
            className={cn(
              "flex-1 flex flex-col items-center gap-1.5 rounded-xl border py-3 transition-all duration-500",
              i < activeStep
                ? "border-emerald-500/30 bg-emerald-500/5 opacity-80"
                : i === activeStep
                ? "border-primary/40 bg-primary/5 shadow-sm"
                : "border-border opacity-35",
            )}
          >
            <span className="text-base">{step.icon}</span>
            <span className={cn(
              "text-[9px] font-bold text-center leading-tight",
              i < activeStep ? "text-emerald-600" : i === activeStep ? "text-primary" : "text-muted-foreground",
            )}>
              {i < activeStep ? "✓" : i === activeStep ? "…" : "·"}
            </span>
          </div>
        ))}
      </div>

      {/* Live count */}
      {scanJobs.length > 0 ? (
        <div className="flex items-center gap-2">
          <div className="flex gap-1">
            {[0, 100, 200].map(d => (
              <div key={d} className="w-1.5 h-1.5 rounded-full bg-primary" style={{ animation: `dot-bounce 0.9s ${d}ms ease-in-out infinite` }} />
            ))}
          </div>
          <span className="text-sm font-bold text-foreground">
            {scanJobs.length} job{scanJobs.length !== 1 ? "s" : ""} found
          </span>
          {pipeRole && <span className="text-xs text-muted-foreground">· {pipeRole}</span>}
        </div>
      ) : (
        <div className="text-center">
          <div className="flex justify-center gap-[7px] mb-3">
            {[0, 150, 300].map(d => (
              <div key={d} className="w-[11px] h-[11px] rounded-full bg-primary" style={{ animation: `dot-bounce 0.9s ${d}ms ease-in-out infinite` }} />
            ))}
          </div>
          <div className="text-[13px] text-muted-foreground">
            {pipeRole
              ? `Matching jobs for ${pipeRole}…`
              : "Scraping boards · AI scoring · Skills gap analysis"}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── ChatSidebar ─────────────────────────────────────────────────────────────

function ChatSidebar({ userId, jobs = [] }: { userId: number; jobs?: Job[] }) {
  const [msgs, setMsgs] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [chatErr, setChatErr] = useState("");
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const endRef = useRef<HTMLDivElement>(null);

  const [activeLang, setActiveLang] = useState<"fr" | "en">("fr");

  useEffect(() => {
    const container = messagesContainerRef.current;
    if (!container) return;

    // Keep scroll within chat panel only (avoid jumping the whole dashboard page)
    container.scrollTop = container.scrollHeight;
  }, [msgs]);

  useEffect(() => {
    if (userId <= 0) return;
    let cancelled = false;
    void api
      .get<{ messages?: { role: string; content: string }[] }>(`/api/job-search/chat/history?user_id=${userId}`)
      .then((r) => {
        if (cancelled) return;
        const raw = r.data?.messages ?? [];
        const mapped = raw
          .filter((m) => m && (m.role === "user" || m.role === "assistant") && typeof m.content === "string")
          .map((m) => ({ role: m.role as "user" | "assistant", content: m.content }));
        if (mapped.length > 0) {
          setMsgs((prev) => (prev.length > 0 ? prev : mapped));
        }
      })
      .catch(() => {
        /* history optional */
      });
    return () => {
      cancelled = true;
    };
  }, [userId]);

  async function _sendMessage(msg: string, _voiceLang?: string) {
    if (!msg.trim() || loading) return;
    setInput("");
    setChatErr("");
    setMsgs(p => [...p, { role: "user", content: msg }]);
    setLoading(true);

    const jobsContext = jobs.slice(0, 30).map(j => ({
      title: j.title,
      industry: j.industry,
      location: j.location,
      salary: j.salary,
      remote: j.remote,
      contract: j.contract,
      experience: j.experience,
      match_score: normalizeScore(j.match_score),
      cosine: normalizeScore(j.cosine ?? j.cosine_score),
      missing: j.gap_missing || [],
      url: j.url,
      source: j.source,
    }));

    try {
      const r = await api.post<{ response?: string }>("/api/job-search/chat", {
        message: msg,
        user_id: String(userId),
        jobs_context: jobsContext,
      });
      const text = typeof r.data?.response === "string" ? r.data.response : "";
      setMsgs((p) => [...p, { role: "assistant", content: text || "(No response)" }]);
    } catch (e: unknown) {
      setChatErr(extractApiError(e));
    } finally {
      setLoading(false);
    }
  }

  const send = useCallback(() => {
    const msg = input.trim();
    if (!msg) return;
    _sendMessage(msg, activeLang);
  }, [input, loading, activeLang]); // eslint-disable-line react-hooks/exhaustive-deps

  const sendVoice = useCallback((text: string, lang?: string) => {
    _sendMessage(text, lang);
  }, [loading]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="w-[300px] shrink-0 bg-card border border-border rounded-2xl px-4 py-4 flex flex-col sticky top-0 max-h-[calc(100dvh-120px)] shadow-sm overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between mb-3 pb-3 border-b border-border">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-primary/20 to-accent/20 flex items-center justify-center text-sm shrink-0">🤖</div>
          <div className="min-w-0">
            <div className="font-bold text-sm text-foreground leading-tight">Career Assistant</div>
            <div className="text-[10px] text-muted-foreground truncate">
              {jobs.length > 0 ? `${jobs.length} job${jobs.length !== 1 ? "s" : ""} in context` : "AI-powered career guidance"}
            </div>
          </div>
        </div>
        {msgs.length > 0 && (
          <button
            type="button"
            onClick={() => setMsgs([])}
            className="text-[10px] text-muted-foreground hover:text-foreground px-1.5 py-0.5 rounded hover:bg-muted/60 transition-colors cursor-pointer"
            title="Clear chat"
          >
            ✕
          </button>
        )}
      </div>

      {/* Messages */}
      <div ref={messagesContainerRef} className="flex-1 overflow-y-auto overflow-x-hidden flex flex-col gap-2 pr-0.5 min-h-0">
        {msgs.length === 0 && (
          <div className="flex flex-col gap-2 mt-4 px-1">
            <div className="text-center text-[28px] mb-1">🤖</div>
            <p className="text-xs font-semibold text-foreground text-center leading-tight mb-0.5">Career Assistant</p>
            <p className="text-[11px] text-muted-foreground text-center leading-relaxed mb-2">
              {jobs.length > 0
                ? `${jobs.length} match${jobs.length !== 1 ? "es" : ""} loaded — ask anything`
                : "Ask about matches, skills gaps, or your roadmap"}
            </p>
            {(jobs.length > 0
              ? ["Which job fits me best?", "What skills am I missing most?", "Which company should I apply to first?", "Summarize my top 3 opportunities"]
              : ["Which jobs fit me best?", "What skills am I missing?", "Build my learning roadmap"]
            ).map(q => (
              <button
                key={q}
                type="button"
                onClick={() => { if (!loading) void _sendMessage(q); }}
                className="text-left text-[11px] px-3 py-2 rounded-lg border border-border bg-muted/40 hover:bg-primary/5 hover:border-primary/30 text-muted-foreground hover:text-foreground transition-all cursor-pointer"
              >
                💬 {q}
              </button>
            ))}
          </div>
        )}
        {msgs.map((m, i) => {
          // System summary messages (e.g. [RÉSUMÉ SESSION] …)
          const isSystemMsg = m.role === "assistant" && /^\[.{1,30}\]/u.test(m.content.trimStart());
          if (isSystemMsg) {
            return (
              <div key={i} className="self-stretch mx-1 px-3 py-2 rounded-lg bg-muted/60 border border-border/60 text-[10px] text-muted-foreground italic leading-relaxed break-words">
                {m.content}
              </div>
            );
          }
          return (
            <div
              key={i}
              className={cn(
                "text-[12px] leading-relaxed min-w-0 break-words",
                m.role === "user"
                  ? "self-end max-w-[88%] px-3 py-2 rounded-2xl rounded-tr-sm bg-primary/10 border border-primary/20 text-foreground"
                  : "self-start w-full px-3 py-2.5 rounded-2xl rounded-tl-sm bg-background border border-border text-foreground",
              )}
            >
              {m.role === "assistant" ? (
                <div className={cn(
                  "prose prose-xs dark:prose-invert max-w-none",
                  "[&_*]:break-words [&_a]:break-all [&_a]:text-primary [&_a]:underline",
                  "[&_p]:text-[12px] [&_p]:leading-relaxed [&_p]:my-0.5",
                  "[&_strong]:text-foreground [&_strong]:font-semibold",
                  "[&_ul]:my-1 [&_ol]:my-1 [&_li]:text-[12px] [&_li]:my-0",
                  "[&_code]:text-accent [&_code]:bg-accent/10 [&_code]:px-1 [&_code]:rounded [&_code]:text-[11px]",
                  "[&_h1]:text-sm [&_h1]:font-bold [&_h2]:text-xs [&_h2]:font-semibold [&_h3]:text-xs [&_h3]:font-semibold",
                )}>
                  <ReactMarkdown>{m.content}</ReactMarkdown>
                </div>
              ) : (
                <span className="break-words">{m.content}</span>
              )}
            </div>
          );
        })}
        {loading && (
          <div className="self-start px-3 py-2 rounded-2xl rounded-tl-sm bg-background border border-border flex gap-1 items-center">
            {[0, 150, 300].map(d => (
              <div
                key={d}
                className="w-[5px] h-[5px] rounded-full bg-muted-foreground/60"
                style={{ animation: `dot-bounce 0.9s ${d}ms ease-in-out infinite` }}
              />
            ))}
          </div>
        )}
        {chatErr && (
          <div className="text-[11px] text-destructive bg-destructive/5 border border-destructive/20 rounded-lg px-3 py-2">
            ⚠ {chatErr}
          </div>
        )}
        <div ref={endRef} />
      </div>

      {/* Input area */}
      <div className="flex gap-2 mt-3 items-center pt-3 border-t border-border">
        <Input
          className="flex-1 h-9 text-xs"
          placeholder={jobs.length > 0 ? "Ask about your matches…" : "Ask anything…"}
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => e.key === "Enter" && !loading && send()}
        />
        <Button
          size="sm"
          className="h-9 px-3 text-xs bg-primary hover:bg-primary/90"
          onClick={send}
          disabled={loading}
        >
          →
        </Button>
      </div>
    </div>
  );
}

// ─── GapTab ──────────────────────────────────────────────────────────────────

type GapDataNormalized = {
  top_missing_skills: { skill: string; frequency: number }[];
  top_matched_skills: { skill: string; frequency: number }[];
  missing_enriched?: { skill: string; frequency: number; difficulty?: string; tip?: string; impact_pct?: number }[];
  coverage: number;
  total_market_skills: number;
  total_jobs?: number;
  cv_skills_preview?: string;
};

function normalizeGapResponse(apiData: any): GapDataNormalized | null {
  if (!apiData || typeof apiData !== "object") return null;
  const missing = apiData.missing || [];
  const matched = apiData.matched || [];
  const toPairs = (arr: any[]): { skill: string; frequency: number }[] =>
    arr.map((item: any) =>
      Array.isArray(item)
        ? { skill: String(item[0] ?? ""), frequency: Number(item[1] ?? 0) }
        : { skill: String(item?.skill ?? item), frequency: Number(item?.frequency ?? item?.count ?? 0) },
    ).filter((d: { skill: string; frequency: number }) => d.skill);
  const enriched = (apiData.missing_enriched || []).map((e: any) => ({
    skill: String(e?.skill ?? ""),
    frequency: Number(e?.count ?? e?.frequency ?? 0),
    difficulty: e?.difficulty,
    tip: e?.tip,
    impact_pct: e?.impact_pct != null ? Number(e.impact_pct) : undefined,
  })).filter((d: { skill: string }) => d.skill);
  return {
    top_missing_skills: enriched.length
      ? enriched.map((e: any) => ({ skill: e.skill, frequency: e.frequency }))
      : toPairs(apiData.top_missing_skills || missing).slice(0, 25),
    top_matched_skills: toPairs(apiData.top_missing_skills ? [] : matched).slice(0, 25),
    missing_enriched: enriched.length ? enriched : undefined,
    coverage: Number(apiData.coverage) || 0,
    total_market_skills: Number(apiData.total_market_skills) || 0,
    total_jobs: apiData.total_jobs != null ? Number(apiData.total_jobs) : undefined,
    cv_skills_preview: typeof apiData.cv_skills === "string" ? apiData.cv_skills : undefined,
  };
}

function GapTab({
  gapData,
  gapLoad,
  gapError,
  showLoadingPlaceholder,
  onAnalyze,
  onGoToRoadmap,
  onRefresh,
}: {
  gapData: any;
  gapLoad: boolean;
  gapError?: string;
  showLoadingPlaceholder?: boolean;
  onAnalyze: () => void;
  onGoToRoadmap?: () => void;
  onRefresh?: () => void;
}) {
  const normalized = normalizeGapResponse(gapData);
  const hasData = normalized && (normalized.top_missing_skills.length > 0 || normalized.top_matched_skills.length > 0 || normalized.total_market_skills > 0);
  const showLoading = gapLoad || !!showLoadingPlaceholder;

  return (
    <Card className="rounded-2xl p-4 shadow-[0_2px_16px_rgba(122,63,176,0.06)] w-full min-w-0">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-2 mb-4">
        <div>
          <h2 className="text-base font-extrabold text-foreground">📊 Skills Gap</h2>
          <p className="text-[12px] text-muted-foreground mt-0.5">
            Missing skills vs your profile — prioritise what to learn.
          </p>
        </div>
        {hasData && (
          <div className="flex gap-1.5 flex-wrap">
            {onGoToRoadmap && (
              <Button size="sm" className="text-xs h-7 px-2.5 bg-primary hover:bg-primary/90" onClick={onGoToRoadmap}>
                🗺️ Roadmap
              </Button>
            )}
            {onRefresh && (
              <Button size="sm" variant="outline" className="text-xs h-7 px-2.5" onClick={onRefresh}>
                🔄 Refresh
              </Button>
            )}
          </div>
        )}
      </div>

      {showLoading && (
        <div className="text-center py-10 text-muted-foreground">
          <div className="flex justify-center gap-1.5 mb-3">
            {[0, 120, 240].map(d => (
              <div key={d} className="w-2 h-2 rounded-full bg-primary" style={{ animation: `dot-bounce 0.8s ${d}ms ease-in-out infinite` }} />
            ))}
          </div>
          <div className="text-sm font-semibold">Analyzing skills gap…</div>
        </div>
      )}

      {!showLoading && gapError && (
        <div className="py-8 px-4 text-center">
          <div className="text-sm text-destructive font-medium mb-3 leading-relaxed">{gapError}</div>
          <Button size="sm" className="bg-primary hover:bg-primary/90" onClick={onAnalyze}>Retry</Button>
        </div>
      )}

      {!showLoading && !gapError && !hasData && (
        <div className="text-center py-10 px-4">
          <div className="text-[36px] mb-3">📊</div>
          <div className="text-sm font-bold text-foreground mb-1.5">Analyze your skills gap</div>
          <div className="text-[12px] text-muted-foreground mb-5 max-w-[340px] mx-auto">
            See which skills appear most in job listings but are missing from your profile. Run a scan first, then analyze.
          </div>
          <Button size="sm" className="bg-primary hover:bg-primary/90" onClick={onAnalyze}>Analyze Skills Gap</Button>
          {gapData && typeof gapData?.detail === "string" && (
            <div className="mt-3 text-xs text-amber-600">{gapData.detail}</div>
          )}
        </div>
      )}

      {!showLoading && !gapError && hasData && normalized && (
        <div className="flex flex-col gap-4 min-w-0">
          {/* Stat pills */}
          <div className="flex gap-2 flex-wrap">
            <div className="bg-background border border-border rounded-lg px-3 py-2 text-center min-w-[90px]">
              <div className="text-lg font-extrabold text-primary leading-none">{Math.round(normalized.coverage * 100)}%</div>
              <div className="text-[10px] text-muted-foreground mt-0.5">Coverage</div>
            </div>
            <div className="bg-background border border-border rounded-lg px-3 py-2 text-center min-w-[90px]">
              <div className="text-lg font-extrabold text-foreground leading-none">{normalized.total_market_skills}</div>
              <div className="text-[10px] text-muted-foreground mt-0.5">Market skills</div>
            </div>
            {normalized.total_jobs != null && (
              <div className="bg-background border border-border rounded-lg px-3 py-2 text-center min-w-[90px]">
                <div className="text-lg font-extrabold text-foreground leading-none">{normalized.total_jobs}</div>
                <div className="text-[10px] text-muted-foreground mt-0.5">Jobs scanned</div>
              </div>
            )}
          </div>

          {/* Impact hint */}
          {normalized.missing_enriched && normalized.missing_enriched.length > 0 && (() => {
            const top3 = normalized.missing_enriched!.slice(0, 3);
            const sumImpact = top3.reduce((s, e) => s + (e.impact_pct ?? 0), 0);
            return sumImpact > 0 ? (
              <div className="border rounded-lg px-3 py-2 bg-primary/[0.05] border-primary/20 text-[12px] text-foreground">
                💡 Learning <strong>top 3</strong> missing skills could unlock <strong>~{Math.round(sumImpact)}%</strong> more jobs.
              </div>
            ) : null;
          })()}

          {/* Priority skills list */}
          {normalized.missing_enriched && normalized.missing_enriched.length > 0 && (
            <div className="bg-background border border-border rounded-lg p-3">
              <div className="text-[10px] text-muted-foreground mb-2 uppercase tracking-wide font-semibold">Learn first</div>
              <div className="flex flex-col gap-1.5">
                {normalized.missing_enriched!.slice(0, 6).map((item, i) => {
                  const diff = (item.difficulty || "").toLowerCase();
                  return (
                    <div key={item.skill} className="flex items-center gap-2 px-2.5 py-1.5 bg-card rounded-md border border-border min-w-0">
                      <span className="text-[10px] font-bold text-muted-foreground shrink-0 w-5">#{i + 1}</span>
                      <span className="text-[12px] font-semibold text-foreground truncate flex-1">{item.skill}</span>
                      {item.impact_pct != null && item.impact_pct > 0 && (
                        <span className="text-[10px] text-muted-foreground font-mono shrink-0">{item.impact_pct}%</span>
                      )}
                      {item.difficulty && (
                        <span className={cn(
                          "text-[9px] px-1.5 py-0.5 rounded border font-semibold shrink-0",
                          diff === "beginner" && "bg-emerald-600/10 text-emerald-600 border-emerald-600/25",
                          diff === "advanced" && "bg-amber-600/10 text-amber-600 border-amber-600/25",
                          diff !== "beginner" && diff !== "advanced" && "bg-accent/10 text-accent border-accent/25",
                        )}>
                          {item.difficulty}
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Horizontal bar chart — fits any container width */}
          <div className="min-w-0 w-full">
            <div className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide mb-2">
              Top missing skills (frequency in job listings)
            </div>
            <HorizontalChart
              data={normalized.top_missing_skills.slice(0, 15)}
              title=""
              valueKey="frequency"
              labelKey="skill"
              barColor="hsl(var(--primary))"
            />
          </div>

          {/* Matched skills */}
          {normalized.top_matched_skills.length > 0 && (
            <div className="bg-background border border-border rounded-lg p-3">
              <div className="text-[10px] text-muted-foreground mb-2 uppercase tracking-wide font-semibold">Your skills in demand</div>
              <div className="flex flex-wrap gap-1">
                {normalized.top_matched_skills.map(({ skill, frequency }) => (
                  <span key={skill} className="text-[10px] px-2 py-0.5 rounded bg-emerald-600/[0.08] text-emerald-600 border border-emerald-600/25">
                    ✓ {skill} <span className="opacity-60">({frequency})</span>
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* CV skills preview */}
          {normalized.cv_skills_preview && (
            <div className="bg-background border border-border rounded-lg p-3">
              <div className="text-[10px] text-muted-foreground mb-2 uppercase tracking-wide font-semibold">Your current skills</div>
              <div className="flex flex-wrap gap-1">
                {normalized.cv_skills_preview.split(",").slice(0, 24).map((s: string) => s.trim()).filter(Boolean).map((s: string) => (
                  <span key={s} className="text-[10px] px-1.5 py-0.5 rounded bg-secondary text-accent border border-border">
                    {s}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </Card>
  );
}

// ─── RoadmapTab ──────────────────────────────────────────────────────────────

type RoadmapPhaseItem = {
  skill: string;
  jobs_count: number;
  difficulty: string;
  weeks: number;
  tip: string;
  project_ideas?: string[];
  prerequisites: string[];
  xai?: { rank: number; reason: string; market_impact_pct?: number; prereqs_met?: string[]; prereqs_missing?: string[]; llm_insight?: string };
};

function RoadmapPhaseCard({ item }: { item: RoadmapPhaseItem }) {
  const [expanded, setExpanded] = useState(false);
  const diff = (item.difficulty || "").toLowerCase();
  const xai = item.xai;

  return (
    <div className="bg-background border border-border rounded-xl p-4 flex flex-col gap-2">
      <div className="flex flex-wrap gap-2 items-center">
        <span className="font-bold text-[13px] text-foreground">{item.skill}</span>
        <span className={cn(
          "text-[9px] px-[7px] py-0.5 rounded border",
          diff === "beginner" && "bg-emerald-600/10 text-emerald-600 border-emerald-600/25",
          diff === "advanced" && "bg-amber-600/10 text-amber-600 border-amber-600/25",
          diff !== "beginner" && diff !== "advanced" && "bg-accent/10 text-accent border-accent/25",
        )}>
          {item.difficulty}
        </span>
        <span className="text-[10px] text-muted-foreground font-mono">~{item.weeks}w</span>
        {xai?.market_impact_pct != null && (
          <span className="text-[10px] text-accent">{xai.market_impact_pct}% of jobs</span>
        )}
      </div>
      <div className="text-[11px] text-muted-foreground">📚 {item.tip}</div>

      {item.project_ideas && item.project_ideas.length > 0 && (
        <div className="text-[11px] text-accent p-2 bg-accent/[0.06] rounded-md border-l-[3px] border-l-accent">
          <div className="font-semibold mb-1">🛠️ Small project ideas</div>
          <ul className="m-0 pl-4">
            {item.project_ideas.map((idea, i) => (
              <li key={i} className="mb-0.5">{idea}</li>
            ))}
          </ul>
        </div>
      )}

      {xai?.llm_insight && (
        <div className="text-[11px] text-accent italic p-2 bg-accent/[0.06] rounded-md border-l-[3px] border-l-accent">
          💡 {xai.llm_insight}
        </div>
      )}

      {item.prerequisites && item.prerequisites.length > 0 && (
        <div className="text-[10px] text-muted-foreground">
          Prerequisites: {item.prerequisites.join(", ")}
          {xai?.prereqs_met?.length ? <span className="text-emerald-600"> — You have: {xai.prereqs_met.join(", ")}</span> : null}
          {xai?.prereqs_missing?.length ? <span className="text-amber-600"> — Learn first: {xai.prereqs_missing.join(", ")}</span> : null}
        </div>
      )}

      {xai?.reason && (
        <>
          <button
            type="button"
            className="text-[10px] text-accent bg-transparent border-0 cursor-pointer p-0 text-left font-semibold"
            onClick={() => setExpanded(!expanded)}
          >
            {expanded ? "▼ Hide why this order" : "▶ Why this order?"}
          </button>
          {expanded && <div className="text-[11px] text-muted-foreground leading-normal">{xai.reason}</div>}
        </>
      )}
    </div>
  );
}

function RoadmapTab({
  roadData,
  roadLoad,
  roadError,
  showLoadingPlaceholder,
  onGenerate,
  onRefresh,
}: {
  roadData: any;
  roadLoad: boolean;
  roadError?: string;
  showLoadingPlaceholder?: boolean;
  onGenerate: () => void;
  onRefresh?: () => void;
}) {
  const showLoading = roadLoad || !!showLoadingPlaceholder;
  const phases = roadData?.phases || {};
  const beginner = (phases.beginner || []) as RoadmapPhaseItem[];
  const intermediate = (phases.intermediate || []) as RoadmapPhaseItem[];
  const advanced = (phases.advanced || []) as RoadmapPhaseItem[];
  const hasData = beginner.length > 0 || intermediate.length > 0 || advanced.length > 0;
  const totalWeeks = roadData?.total_weeks ?? 0;
  const coverage = roadData?.coverage != null ? Math.round(Number(roadData.coverage) * 100) : null;
  const message = roadData?.message || "Based on your skills gap and market demand.";

  return (
    <Card className="rounded-2xl p-7 shadow-[0_2px_16px_rgba(122,63,176,0.06)]">
      <div className="mb-5">
        <h2 className="text-lg font-extrabold text-foreground mb-1">🗺️ Learning Roadmap</h2>
        <p className="text-[13px] text-muted-foreground">
          A phased plan from your skills gap. Start with Beginner, then Intermediate, then Advanced when you have the prerequisites.
        </p>
      </div>

      {showLoading && (
        <div className="text-center py-12 text-muted-foreground">
          <div className="flex justify-center gap-1.5 mb-3">
            {[0, 120, 240].map(d => (
              <div key={d} className="w-2 h-2 rounded-full bg-primary" style={{ animation: `dot-bounce 0.8s ${d}ms ease-in-out infinite` }} />
            ))}
          </div>
          <div className="text-sm font-semibold">Generating roadmap…</div>
        </div>
      )}

      {!showLoading && roadError && (
        <div className="text-center py-10 px-6">
          <div className="text-sm text-destructive font-medium mb-4 max-w-lg mx-auto leading-relaxed">{roadError}</div>
          <Button className="bg-primary hover:bg-primary/90" onClick={onGenerate}>Retry</Button>
        </div>
      )}

      {!showLoading && !roadError && !hasData && (
        <div className="text-center py-12 px-6">
          <div className="text-[42px] mb-4">🗺️</div>
          <div className="text-base font-bold text-foreground mb-2">Your personalized learning roadmap</div>
          <div className="text-[13px] text-muted-foreground mb-6 max-w-[400px] mx-auto">
            We&apos;ll build a phased plan (Beginner → Intermediate → Advanced) from your skills gap. Run a scan first so we have your skills.
          </div>
          <Button className="bg-primary hover:bg-primary/90" onClick={onGenerate}>Generate Learning Roadmap</Button>
          {roadData?.detail && <div className="mt-4 text-xs text-amber-600">{roadData.detail}</div>}
        </div>
      )}

      {!showLoading && !roadError && hasData && (
        <div className="flex flex-col gap-5">
          <div className="flex gap-3 flex-wrap items-center justify-between">
            <div className="flex gap-3 flex-wrap items-center">
              <div className="bg-background border border-border rounded-xl p-4 min-w-[100px] text-center">
                <div className="text-[22px] font-extrabold text-primary">{totalWeeks}w</div>
                <div className="text-[10px] text-muted-foreground">Total plan</div>
              </div>
              {coverage != null && (
                <div className="bg-background border border-border rounded-xl p-4 min-w-[100px] text-center">
                  <div className="text-[22px] font-extrabold text-foreground">{coverage}%</div>
                  <div className="text-[10px] text-muted-foreground">Market coverage</div>
                </div>
              )}
            </div>
            {onRefresh && <Button variant="outline" onClick={onRefresh}>🔄 Refresh roadmap</Button>}
          </div>
          <div className="text-xs text-muted-foreground">{message}</div>

          {beginner.length > 0 && (
            <div>
              <div className="text-[11px] text-muted-foreground mb-2 uppercase tracking-wide">Beginner — foundations</div>
              <div className="flex flex-col gap-2.5">
                {beginner.map(item => <RoadmapPhaseCard key={item.skill} item={item} />)}
              </div>
            </div>
          )}
          {intermediate.length > 0 && (
            <div>
              <div className="text-[11px] text-muted-foreground mb-2 uppercase tracking-wide">Intermediate — core skills</div>
              <div className="flex flex-col gap-2.5">
                {intermediate.map(item => <RoadmapPhaseCard key={item.skill} item={item} />)}
              </div>
            </div>
          )}
          {advanced.length > 0 && (
            <div>
              <div className="text-[11px] text-muted-foreground mb-2 uppercase tracking-wide">Advanced — specialization</div>
              <div className="flex flex-col gap-2.5">
                {advanced.map(item => <RoadmapPhaseCard key={item.skill} item={item} />)}
              </div>
            </div>
          )}
        </div>
      )}
    </Card>
  );
}

// ─── MatchesTab ──────────────────────────────────────────────────────────────

const EMPLOI_PAGE_SIZE = 20;

function MatchesTab({ isScanning, scanJobs, pipeRole, enrichN, jobs, jobsLoad, jobsError, scanError, onDismissScanError, onRetryJobs, roleFilter, setRoleFilter, locFilter, setLocFilter, minFit, setMinFit, onSearch, page, onPageChange, onAtsScore }: {
  isScanning: boolean; scanJobs: Job[]; pipeRole: string; enrichN: number;
  jobs: Job[]; jobsLoad: boolean;
  jobsError: string;
  scanError: string;
  onDismissScanError: () => void;
  onRetryJobs: () => void;
  roleFilter: string; setRoleFilter: (v: string) => void;
  locFilter: string; setLocFilter: (v: string) => void;
  minFit: number; setMinFit: (v: number) => void;
  onSearch: () => void;
  page: number;
  onPageChange: (p: number) => void;
  onAtsScore?: (job: Job) => void;
}) {
  const filteredAndSortedJobs = useMemo(() => {
    let list = [...jobs];
    if (roleFilter.trim()) {
      const words = roleFilter.trim().toLowerCase().split(/\s+/).filter(Boolean);
      list = list.filter(j => {
        const text = `${j.title || ""} ${j.industry || ""} ${j.description || ""}`.toLowerCase();
        return words.some(w => text.includes(w));
      });
    }
    if (locFilter.trim()) {
      const loc = locFilter.trim().toLowerCase();
      list = list.filter(j => {
        const jLoc = (j.location || "").toLowerCase();
        const jRemote = (j.remote || "").toLowerCase();
        return jLoc.includes(loc) || (loc.includes("remote") && (jRemote.includes("remote") || jLoc.includes("remote")));
      });
    }
    if (minFit > 0) {
      list = list.filter(j => normalizeScore(j.match_score) >= minFit);
    }
    list.sort((a, b) => (normalizeScore(b.match_score) || 0) - (normalizeScore(a.match_score) || 0));
    return list;
  }, [jobs, roleFilter, locFilter, minFit]);

  const totalCount = filteredAndSortedJobs.length;
  const totalPages = Math.max(1, Math.ceil(totalCount / EMPLOI_PAGE_SIZE));
  const start = (page - 1) * EMPLOI_PAGE_SIZE;
  const paginatedJobs = filteredAndSortedJobs.slice(start, start + EMPLOI_PAGE_SIZE);

  useEffect(() => {
    if (totalPages > 0 && page > totalPages) onPageChange(1);
  }, [totalPages, page, onPageChange]);

  return (
    <div>
      {(jobsError || scanError) && (
        <div className="mb-4 rounded-xl border border-destructive/25 bg-destructive/5 px-4 py-3 text-sm space-y-2">
          {jobsError ? (
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="text-destructive font-medium">Could not load matches: {jobsError}</span>
              <Button variant="outline" size="sm" onClick={onRetryJobs}>Retry</Button>
            </div>
          ) : null}
          {scanError ? (
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="text-destructive font-medium">Job scan failed: {scanError}</span>
              <Button variant="ghost" size="sm" onClick={onDismissScanError}>Dismiss</Button>
            </div>
          ) : null}
        </div>
      )}
      {/* Filters bar */}
      <Card className="flex gap-3 items-center flex-wrap p-4 mb-4">
        <Input className="w-[175px] h-9 text-xs" placeholder="Filter by role" value={roleFilter} onChange={e => setRoleFilter(e.target.value)} />
        <Input className="w-[155px] h-9 text-xs" placeholder="Filter by location" value={locFilter} onChange={e => setLocFilter(e.target.value)} />
        <Select value={String(minFit)} onValueChange={v => setMinFit(parseFloat(v))}>
          <SelectTrigger className="w-[155px] h-9 text-xs">
            <SelectValue placeholder="Min fit" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="0">All scores</SelectItem>
            <SelectItem value="0.4">≥ 40% AI Match</SelectItem>
            <SelectItem value="0.55">≥ 55% AI Match</SelectItem>
            <SelectItem value="0.75">≥ 75% AI Match</SelectItem>
          </SelectContent>
        </Select>
        <Button onClick={onSearch} disabled={isScanning} className="bg-primary hover:bg-primary/90">Search</Button>
        <span className="text-[11px] text-muted-foreground">
          {isScanning
            ? `${scanJobs.length} job${scanJobs.length > 1 ? "s" : ""} found so far (scan in progress)`
            : `${filteredAndSortedJobs.length} jobs · Cosine + AI Match`}
        </span>
      </Card>

      {/* Loading matches (after scan finished) */}
      {jobsLoad && !isScanning && (
        <div className="flex flex-col items-center justify-center py-20 gap-4">
          <div className="flex gap-[7px]">
            {[0, 150, 300].map(d => (
              <div key={d} className="w-2.5 h-2.5 rounded-full bg-primary" style={{ animation: `dot-bounce 0.9s ${d}ms ease-in-out infinite` }} />
            ))}
          </div>
          <div className="text-center">
            <p className="text-[15px] font-bold text-foreground mb-1">Loading your matches…</p>
            <p className="text-[12px] text-muted-foreground">Fetching personalised results from database</p>
          </div>
        </div>
      )}

      {/* Scanning — full loader until first job arrives, then cards stream in */}
      {isScanning && scanJobs.length === 0 && (
        <ScanLoadingScreen scanJobs={scanJobs} pipeRole={pipeRole} enrichN={enrichN} />
      )}
      {isScanning && scanJobs.length > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-3.5">
            <div className="flex gap-1">
              {[0, 100, 200].map(d => (
                <div key={d} className="w-1.5 h-1.5 rounded-full bg-primary" style={{ animation: `dot-bounce 0.9s ${d}ms ease-in-out infinite` }} />
              ))}
            </div>
            <span className="text-[13px] font-bold text-foreground">
              {scanJobs.length} job{scanJobs.length > 1 ? "s" : ""} matched · still scanning…
            </span>
          </div>
          <div className="grid grid-cols-[repeat(auto-fill,minmax(310px,1fr))] gap-3.5">
            {scanJobs.map((job, i) => (
              <div key={job.url + i} style={{ animation: "card-in .4s ease both" }}>
                <JobCard job={job} onAtsScore={onAtsScore} isScanning />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* No jobs */}
      {!isScanning && !jobsLoad && jobs.length === 0 && !jobsError && (
        <div className="text-center py-[70px] px-5 text-muted-foreground">
          <div className="text-4xl mb-3.5">🔍</div>
          <div className="text-[15px] font-semibold text-foreground mb-2">No jobs yet</div>
          <div className="text-xs mb-6 max-w-md mx-auto">
            Run a job scan to scrape boards, score roles against your CV, and save matches here. Use Search above or the button below.
          </div>
          <Button onClick={onSearch} disabled={isScanning} className="bg-primary hover:bg-primary/90">
            Run job scan
          </Button>
        </div>
      )}

      {/* Job results */}
      {!isScanning && jobs.length > 0 && (
        <div>
          <div className="grid grid-cols-[repeat(auto-fill,minmax(310px,1fr))] gap-3.5">
            {filteredAndSortedJobs.length === 0 ? (
              <div className="col-span-full text-center py-10 px-5 text-muted-foreground">
                <div className="text-[15px] font-semibold text-foreground mb-2">No jobs match your filters</div>
                <div className="text-xs">Try loosening the role, location or minimum score.</div>
              </div>
            ) : (
              paginatedJobs.map((job, i) => <JobCard key={`${job.url}-${i}`} job={job} onAtsScore={onAtsScore} />)
            )}
          </div>

          {/* Pagination */}
          {totalCount > EMPLOI_PAGE_SIZE && (
            <div className="flex items-center justify-between mt-4 pt-4 border-t border-border">
              <span className="text-xs text-muted-foreground">
                Showing {start + 1}–{Math.min(start + EMPLOI_PAGE_SIZE, totalCount)} of {totalCount} jobs
              </span>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={() => onPageChange(Math.max(1, page - 1))} disabled={page <= 1}>
                  Previous
                </Button>
                <span className="text-xs text-muted-foreground self-center">Page {page} of {totalPages}</span>
                <Button variant="outline" size="sm" onClick={() => onPageChange(Math.min(totalPages, page + 1))} disabled={page >= totalPages}>
                  Next
                </Button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── ReportTab ───────────────────────────────────────────────────────────────

function ReportTab({
  repMarkdown,
  repLoad,
  repError,
  userId,
  onGenerate,onDownloadPDF,
}: {
  repMarkdown: string;
  repLoad: boolean;
  repError: string;
  userId: number;
  onGenerate: () => void;onDownloadPDF: () => void;
}) {
  const [copied, setCopied] = useState(false);

  function copyToClipboard() {
    navigator.clipboard.writeText(repMarkdown).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  // Extract a rough word count from markdown
  const wordCount = repMarkdown
    ? repMarkdown.replace(/[#*`_>[\]()!]/g, "").split(/\s+/).filter(Boolean).length
    : 0;

  // Pull h2 headings for a quick table-of-contents strip
  const sections = repMarkdown
    ? [...repMarkdown.matchAll(/^##\s+(.+)$/gm)].map(m => m[1].trim())
    : [];

  

  return (
    <Card className="rounded-2xl overflow-hidden shadow-[0_2px_16px_rgba(122,63,176,0.06)]">
      {/* Card header */}
      <div className="px-7 pt-6 pb-4 border-b border-border flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-extrabold text-foreground mb-1">📄 Career Report</h2>
          <p className="text-[13px] text-muted-foreground max-w-xl">
            A personalised summary of your profile, top matches, skills gap, and learning roadmap.
          </p>
        </div>
        <div className="flex gap-2 flex-wrap">
          {repMarkdown && !repLoad && (
            <Button variant="outline" size="sm" onClick={copyToClipboard} className="text-xs">
              {copied ? "✓ Copied" : "Copy"}
            </Button>
          )}
          {repMarkdown && !repLoad && (
            <Button variant="outline" size="sm" onClick={onDownloadPDF} className="text-xs">
              Download PDF
            </Button>
          )}
          <Button
            variant="outline"
            size="sm"
            className="text-xs"
            onClick={onGenerate}
            disabled={repLoad || userId <= 0}
          >
            {repMarkdown ? "Regenerate" : "Generate"}
          </Button>
        </div>
      </div>

      <div className="px-7 py-6">
        {/* Loading */}
        {repLoad && (
          <div className="text-center py-14 text-muted-foreground">
            <div className="flex justify-center gap-1.5 mb-3">
              {[0, 120, 240].map(d => (
                <div key={d} className="w-2 h-2 rounded-full bg-primary" style={{ animation: `dot-bounce 0.8s ${d}ms ease-in-out infinite` }} />
              ))}
            </div>
            <div className="text-sm font-semibold">Generating career report…</div>
            <div className="text-xs mt-1 text-muted-foreground/60">Analysing matches, gaps, and roadmap — this may take a moment</div>
          </div>
        )}

        {/* Error */}
        {!repLoad && repError && (
          <div className="rounded-xl border border-destructive/20 bg-destructive/5 p-5 flex flex-col gap-3">
            <div className="flex items-start gap-3">
              <span className="text-lg shrink-0">⚠️</span>
              <div>
                <div className="text-sm font-semibold text-destructive mb-1">Report generation failed</div>
                <div className="text-[13px] text-muted-foreground leading-relaxed">{repError}</div>
              </div>
            </div>
            <Button size="sm" className="self-start bg-primary hover:bg-primary/90" onClick={onGenerate}>
              Try again
            </Button>
          </div>
        )}

        {/* Empty state */}
        {!repLoad && !repError && !repMarkdown && userId > 0 && (
          <div className="text-center py-14 px-6">
            <div className="text-[48px] mb-4">📄</div>
            <div className="text-base font-bold text-foreground mb-2">Generate your career report</div>
            <div className="text-[13px] text-muted-foreground mb-6 max-w-[420px] mx-auto leading-relaxed">
              A markdown summary covering your top job matches, skills gap, and a personalised learning roadmap.
              Run a job scan first so all sections are populated.
            </div>
            <Button className="bg-primary hover:bg-primary/90" onClick={onGenerate} disabled={userId <= 0}>
              Generate Report
            </Button>
            <div className="mt-4 flex flex-wrap justify-center gap-2">
              {["Profile overview", "Top matches", "Skills gap", "Roadmap", "Next steps"].map(s => (
                <span key={s} className="text-[10px] px-2 py-1 rounded-full bg-muted border border-border text-muted-foreground">
                  {s}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Report content */}
        {!repLoad && !repError && repMarkdown && (
          <div className="flex flex-col gap-4">
            {/* Meta bar */}
            <div className="flex flex-wrap items-center gap-3">
              <span className="text-[11px] text-muted-foreground font-mono">{wordCount} words</span>
              {sections.length > 0 && (
                <>
                  <span className="text-muted-foreground/40 text-xs">·</span>
                  <div className="flex flex-wrap gap-1.5">
                    {sections.slice(0, 6).map(s => (
                      <span key={s} className="text-[10px] px-2 py-0.5 rounded-full bg-primary/8 text-primary border border-primary/20 font-medium">
                        {s}
                      </span>
                    ))}
                  </div>
                </>
              )}
            </div>

            {/* Markdown body */}
            <div className={cn(
              "rounded-xl border border-border bg-muted/20 p-6",
              "prose prose-sm dark:prose-invert max-w-none",
              "[&_h1]:text-xl [&_h1]:font-extrabold [&_h1]:text-foreground [&_h1]:mb-3 [&_h1]:mt-0",
              "[&_h2]:text-base [&_h2]:font-bold [&_h2]:text-foreground [&_h2]:border-b [&_h2]:border-border [&_h2]:pb-1.5 [&_h2]:mt-6 [&_h2]:mb-3",
              "[&_h3]:text-[13px] [&_h3]:font-semibold [&_h3]:text-foreground [&_h3]:mt-4 [&_h3]:mb-2",
              "[&_p]:text-[13px] [&_p]:text-muted-foreground [&_p]:leading-relaxed",
              "[&_li]:text-[13px] [&_li]:text-muted-foreground",
              "[&_strong]:text-foreground [&_strong]:font-semibold",
              "[&_code]:text-accent [&_code]:bg-accent/10 [&_code]:px-1.5 [&_code]:py-0.5 [&_code]:rounded [&_code]:text-[11px]",
              "[&_hr]:border-border",
              "[&_blockquote]:border-l-primary [&_blockquote]:bg-primary/5 [&_blockquote]:rounded-r-lg [&_blockquote]:py-1",
            )}>
              <ReactMarkdown>{repMarkdown}</ReactMarkdown>
            </div>
          </div>
        )}
      </div>
    </Card>
  );
}

// ─── Dashboard ───────────────────────────────────────────────────────────────

function Dashboard() {
  const queryClient = useQueryClient();
  const searchParams = useSearchParams();

  const [userId, setUserId] = useState(0);
  const [userIdReady, setUserIdReady] = useState(false);
  const scanStartedRef = useRef(false);
  const bypassCacheRef = useRef(false);
  const replaceCvInputRef = useRef<HTMLInputElement>(null);
  const [replaceCvStatus, setReplaceCvStatus] = useState<"idle" | "uploading" | "done" | "error">("idle");
  const [replaceCvError, setReplaceCvError] = useState("");

  useEffect(() => {
    api
      .get("/api/users/me")
      .then((r) => {
        if (r.data?.id) setUserId(r.data.id);
      })
      .catch(() => {})
      .finally(() => setUserIdReady(true));
  }, []);
  const [isScanning, setIsScanning] = useState(false);
  const [pipeSteps, setPipeSteps] = useState<Record<string, PipeState>>(initPipeSteps());
  const [pipeRole, setPipeRole] = useState("");
  const [scanJobs, setScanJobs] = useState<Job[]>([]);
  const [enrichN, setEnrichN] = useState(0);
  const [activeTab, setActiveTab] = useState<Tab>("matches");
  const [jobs, setJobs] = useState<Job[]>([]);
  const [jobsLoad, setJobsLoad] = useState(false);
  const [jobsError, setJobsError] = useState("");
  const [scanError, setScanError] = useState("");
  const [jobsPage, setJobsPage] = useState(1);
  const [roleFilter, setRoleFilter] = useState("");
  const [locFilter, setLocFilter] = useState("");
  const [minFit, setMinFit] = useState(0);
  const [gapData, setGapData] = useState<any>(null);
  const [gapLoad, setGapLoad] = useState(false);
  const [gapError, setGapError] = useState("");
  const [roadData, setRoadData] = useState<any>(null);
  const [roadLoad, setRoadLoad] = useState(false);
  const [roadError, setRoadError] = useState("");
  const [mktData, setMktData] = useState<any>(null);
  const [mktLoad, setMktLoad] = useState(false);
  const [repMarkdown, setRepMarkdown] = useState("");
  const [repError, setRepError] = useState("");
  const [repLoad, setRepLoad] = useState(false);

  const [atsModal, setAtsModal] = useState<{ job: Job } | null>(null);
  const [atsData, setAtsData] = useState<any>(null);
  const [atsLoading, setAtsLoading] = useState(false);
  const [atsError, setAtsError] = useState("");

  const loadJobs = useCallback(async () => {
    setJobsLoad(true);
    setJobsError("");
    try {
      const r = await api.get<{ matches?: Record<string, unknown>[] }>("/api/job-search/jobs");
      const list = r.data?.matches || [];
      setJobs(list.map((m) => apiMatchToJob(m)));
    } catch (e: unknown) {
      setJobs([]);
      setJobsError(extractApiError(e));
    } finally {
      setJobsLoad(false);
    }
  }, []);

  const runScan = useCallback(async () => {
    if (isScanning) return;
    setIsScanning(true);
    setScanError("");
    setScanJobs([]);
    setPipeRole("");
    setPipeSteps(initPipeSteps());
    setEnrichN(0);
    const token = getToken();
    if (!token) {
      setScanError("Please sign in again to run a scan.");
      setIsScanning(false);
      await loadJobs();
      return;
    }
    const bypass = bypassCacheRef.current;
    bypassCacheRef.current = false;
    try {
      const res = await fetch("/api/job-search/scan", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ bypass_cache: bypass }),
        credentials: "include",
      });
      if (!res.ok) {
        let msg = `Scan failed (${res.status})`;
        try {
          const t = await res.text();
          if (t) msg = t.slice(0, 400);
        } catch { /* noop */ }
        setScanError(msg);
        return;
      }
      if (!res.body) {
        setScanError("Scan returned an empty response.");
        return;
      }
      const reader = res.body.getReader();
      const dec = new TextDecoder();
      let buf = "";
      outer: for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        buf += dec.decode(value, { stream: true });
        const chunks = buf.split("\n\n");
        buf = chunks.pop() || "";
        for (const block of chunks) {
          const line = block.trim().split("\n").find((l) => l.startsWith("data: "));
          if (!line) continue;
          const json = line.slice(6).trim();
          if (!json) continue;
          try {
            const ev = JSON.parse(json) as Record<string, unknown>;
            if (ev.event === "start" || ev.event === "cv_ready") {
              if (typeof ev.role === "string") setPipeRole(ev.role);
              setPipeSteps(p => ({ ...p, cv: "done", scraping: "active" }));
            } else if (ev.event === "scraping") {
              const src = typeof ev.source === "string" ? ev.source.toLowerCase() : "";
              if (src) setPipeSteps(p => ({ ...p, [src]: "active", scraping: "active" }));
            } else if (ev.event === "scraped") {
              const src = typeof ev.source === "string" ? ev.source.toLowerCase() : "";
              if (src) setPipeSteps(p => ({ ...p, [src]: "done" }));
            } else if (ev.event === "job") {
              setScanJobs((prev) => [...prev, sseCardToJob(ev)]);
            } else if (ev.event === "enrich") {
              setEnrichN(Number(ev.n) || 0);
              setPipeSteps(p => ({ ...p, enrich: "active" }));
            } else if (ev.event === "done") {
              setPipeSteps(p => Object.fromEntries(Object.keys(p).map(k => [k, "done"])) as Record<string, PipeState>);
              reader.cancel().catch(() => {});
              break outer;
            } else if (ev.event === "error") {
              setScanError(String(ev.detail || ev.message || "Scan error"));
              reader.cancel().catch(() => {});
              break outer;
            }
          } catch { /* ignore malformed chunk */ }
        }
      }
    } catch (e: unknown) {
      setScanError(extractApiError(e));
    } finally {
      setIsScanning(false);
      await loadJobs();
    }
  }, [isScanning, loadJobs]);

  useEffect(() => {
    if (!userIdReady) return;
    void loadJobs();
  }, [userIdReady, loadJobs]);

  useEffect(() => {
    if (!userIdReady) return;
    if (searchParams.get("scan") !== "1") return;
    if (scanStartedRef.current) return;
    scanStartedRef.current = true;
    void runScan();
  }, [userIdReady, searchParams, runScan]);

  const loadGap = useCallback(async () => {
    setGapLoad(true);
    setGapError("");
    try {
      const r = await api.post("/api/job-search/gap", {});
      setGapData(r.data);
    } catch (e: unknown) {
      setGapData(null);
      setGapError(enrichGapRoadmapMessage(e, extractApiError(e)));
    } finally {
      setGapLoad(false);
    }
  }, []);

  const loadRoadmap = useCallback(async () => {
    setRoadLoad(true);
    setRoadError("");
    try {
      const r = await api.post("/api/job-search/roadmap", {});
      setRoadData(r.data);
    } catch (e: unknown) {
      setRoadData(null);
      setRoadError(enrichGapRoadmapMessage(e, extractApiError(e)));
    } finally {
      setRoadLoad(false);
    }
  }, []);

  const loadMarket = useCallback(async () => {
    if (!userIdReady || userId <= 0) return;
    setMktLoad(true);
    setMktData(null);
    try {
      const r = await api.get("/api/job-search/market");
      setMktData(r.data);
    } catch (e: unknown) {
      setMktData({ _error: extractApiError(e) });
    } finally {
      setMktLoad(false);
    }
  }, [userId, userIdReady]);

  const loadReport = useCallback(async () => {
    if (!userIdReady || userId <= 0) return;
    setRepLoad(true);
    setRepError("");
    setRepMarkdown("");
    try {
      const r = await api.post("/api/job-search/report", {});
      const payload = r.data as { report?: string; markdown?: string };
      const md = payload?.report ?? payload?.markdown ?? "";
      setRepMarkdown(typeof md === "string" ? md : String(md));
    } catch (e: unknown) {
      setRepError(enrichGapRoadmapMessage(e, extractApiError(e)));
    } finally {
      setRepLoad(false);
    }
  }, [userId, userIdReady]);

  // Ajouter dans Dashboard, vers ligne ~1930
const downloadReportPDF = useCallback(async () => {
  setRepError("");
  try {
    const response = await api.post(
      "/api/job-search/report/pdf",
      { user_id: userId },        // ← passer le user_id
      { responseType: "blob" }
    );
    const blob =
      response.data instanceof Blob
        ? response.data
        : new Blob([response.data], { type: "application/pdf" });

    const url = window.URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", "subul-career-report.pdf");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
  } catch (e) {
    setRepError(extractApiError(e) || "Unable to download PDF report.");
  }
}, [userId]);




  useEffect(() => {
    if (activeTab !== "market" || !userIdReady || userId <= 0) return;
    void loadMarket();
  }, [activeTab, userId, userIdReady, loadMarket]);

  useEffect(() => {
    if (activeTab !== "report" || !userIdReady || userId <= 0) return;
    void loadReport();
  }, [activeTab, userId, userIdReady, loadReport]);

  useEffect(() => {
    if (!atsModal) return;
    const job = atsModal.job;
    const job_description = [job.title, job.industry, job.description, job.skills_req, job.skills_bon]
      .filter(Boolean)
      .join("\n\n")
      .slice(0, 12000);
    let cancelled = false;
    setAtsLoading(true);
    setAtsError("");
    setAtsData(null);
    void api
      .post("/api/job-search/ats-score", { job_description })
      .then((r) => {
        if (cancelled) return;
        const d = r.data;
        if (d && typeof d === "object") {
          setAtsData(mapAtsResponseToModal(d as Record<string, unknown>));
        } else {
          setAtsError("Unexpected ATS response");
        }
      })
      .catch((e: unknown) => {
        if (!cancelled) setAtsError(extractApiError(e));
      })
      .finally(() => {
        if (!cancelled) setAtsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [atsModal]);

  const retryJobs = useCallback(() => {
    setJobsError("");
    void loadJobs();
  }, [loadJobs]);

  const handleReplaceCvFile = useCallback(async (file: File) => {
    setReplaceCvStatus("uploading");
    setReplaceCvError("");
    try {
      const fd = new FormData();
      fd.append("file", file);
      await api.post("/api/cv/save", fd, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      // Clear all old scan/job state so next scan starts fresh
      setJobs([]);
      setScanJobs([]);
      setGapData(null);
      setRoadData(null);
      setMktData(null);
      setRepMarkdown("");
      setScanError("");
      setJobsError("");
      bypassCacheRef.current = true;
      // Invalidate React Query cache so the new CV is reflected everywhere
      await queryClient.invalidateQueries({ queryKey: cvKeys.status() });
      await queryClient.invalidateQueries({ queryKey: cvKeys.document() });
      setReplaceCvStatus("done");
    } catch (e: unknown) {
      setReplaceCvError(extractApiError(e));
      setReplaceCvStatus("error");
    }
  }, [queryClient]);




  return (
    <div>
      {/* Custom keyframe animations */}
      <style>{`
@keyframes dot-bounce{0%,100%{transform:translateY(0);opacity:.4}50%{transform:translateY(-8px);opacity:1}}
@keyframes dot-pulse{0%,100%{opacity:1;transform:scale(1)}50%{opacity:.3;transform:scale(1.8)}}
@keyframes card-in{from{opacity:0;transform:translateY(14px)}to{opacity:1;transform:translateY(0)}}
      `}</style>

      {/* Hidden file input for CV replacement */}
      <input
        ref={replaceCvInputRef}
        type="file"
        accept=".pdf,.docx,.doc,.txt"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) void handleReplaceCvFile(file);
          e.target.value = "";
        }}
      />

      <div className="flex gap-5 items-start">
        <ChatSidebar userId={userId} jobs={jobs} />

        <div className="flex-1 min-w-0">
          {/* CV Info bar */}
          <CvInfoBar
            fileName={null}
            jobCount={jobs.length}
            isScanning={isScanning}
            isReplacing={replaceCvStatus === "uploading"}
            replaceStatus={replaceCvStatus}
            replaceError={replaceCvError}
            onReplaceClick={() => replaceCvInputRef.current?.click()}
            onScanWithNewCv={() => {
              setReplaceCvStatus("idle");
              void runScan();
            }}
          />

          {/* Tab bar */}
          <div className="flex items-center bg-muted/50 border border-border rounded-xl p-1 mb-5 gap-0.5 flex-wrap">
            {(["matches", "gap", "roadmap", "market", "report"] as Tab[]).map(tab => (
              <button
                key={tab}
                type="button"
                onClick={() => setActiveTab(tab)}
                className={cn(
                  "flex-1 min-w-[76px] px-3 py-1.5 rounded-lg text-xs font-semibold transition-all duration-150 cursor-pointer whitespace-nowrap",
                  activeTab === tab
                    ? "bg-card text-primary shadow-sm border border-border"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted/70 border border-transparent",
                )}
              >
                {{ matches: "🏆 Matches", gap: "📊 Skills Gap", roadmap: "🗺️ Roadmap", market: "📈 Market", report: "📄 Report" }[tab]}
              </button>
            ))}
          </div>

          {/* Tab content */}
          {activeTab === "matches" && (
            <MatchesTab
              isScanning={isScanning}
              scanJobs={scanJobs}
              pipeRole={pipeRole}
              enrichN={enrichN}
              jobs={jobs}
              jobsLoad={jobsLoad}
              jobsError={jobsError}
              scanError={scanError}
              onDismissScanError={() => setScanError("")}
              onRetryJobs={retryJobs}
              roleFilter={roleFilter}
              setRoleFilter={setRoleFilter}
              locFilter={locFilter}
              setLocFilter={setLocFilter}
              minFit={minFit}
              setMinFit={setMinFit}
              onSearch={runScan}
              page={jobsPage}
              onPageChange={setJobsPage}
              onAtsScore={(job) => {
                setAtsModal({ job });
                setAtsData(null);
                setAtsError("");
                setAtsLoading(true);
              }}
            />
          )}
          {activeTab === "gap" && (
            <GapTab
              gapData={gapData}
              gapLoad={gapLoad}
              gapError={gapError}
              onAnalyze={loadGap}
              onGoToRoadmap={() => setActiveTab("roadmap")}
              onRefresh={loadGap}
            />
          )}
          {activeTab === "roadmap" && (
            <RoadmapTab
              roadData={roadData}
              roadLoad={roadLoad}
              roadError={roadError}
              onGenerate={loadRoadmap}
              onRefresh={loadRoadmap}
            />
          )}
          {activeTab === "market" && (
            <Card className="rounded-2xl p-7 shadow-[0_2px_16px_rgba(122,63,176,0.06)]">
              <div className="flex flex-wrap items-start justify-between gap-3 mb-5">
                <div>
                  <h2 className="text-lg font-extrabold text-foreground mb-1">📈 Market</h2>
                  <p className="text-[13px] text-muted-foreground max-w-xl">
                    Aggregated stats from the job corpus and your saved matches. Run a scan on Matches so averages reflect your profile.
                  </p>
                </div>
                <Button variant="outline" size="sm" onClick={() => void loadMarket()} disabled={mktLoad || userId <= 0}>
                  Refresh
                </Button>
              </div>
              {mktLoad && (
                <div className="text-center py-12 text-muted-foreground">
                  <div className="flex justify-center gap-1.5 mb-3">
                    {[0, 120, 240].map(d => (
                      <div key={d} className="w-2 h-2 rounded-full bg-primary" style={{ animation: `dot-bounce 0.8s ${d}ms ease-in-out infinite` }} />
                    ))}
                  </div>
                  <div className="text-sm font-semibold">Loading market data…</div>
                </div>
              )}
              {!mktLoad && mktData?._error && (
                <div className="text-sm text-destructive font-medium py-8">{mktData._error}</div>
              )}
              {!mktLoad && mktData && !mktData._error && (
                <div className="flex flex-col gap-5 text-sm">
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    <div className="rounded-xl border border-border bg-background p-4 text-center">
                      <div className="text-2xl font-extrabold text-primary">{mktData.total_jobs ?? "—"}</div>
                      <div className="text-[10px] text-muted-foreground uppercase tracking-wide">Jobs indexed</div>
                    </div>
                    <div className="rounded-xl border border-border bg-background p-4 text-center">
                      <div className="text-2xl font-extrabold text-foreground">
                        {mktData.remote_ratio != null ? `${Math.round(Number(mktData.remote_ratio) * 100)}%` : "—"}
                      </div>
                      <div className="text-[10px] text-muted-foreground uppercase tracking-wide">Remote ratio</div>
                    </div>
                    {mktData.avg_ai_score != null && (
                      <div className="rounded-xl border border-border bg-background p-4 text-center">
                        <div className="text-2xl font-extrabold text-foreground">{mktData.avg_ai_score}%</div>
                        <div className="text-[10px] text-muted-foreground uppercase tracking-wide">Avg AI match</div>
                      </div>
                    )}
                    {mktData.score_breakdown && (
                      <div className="rounded-xl border border-border bg-background p-4 col-span-2 sm:col-span-1">
                        <div className="text-[10px] text-muted-foreground uppercase tracking-wide mb-1">Match tiers (your saves)</div>
                        <div className="text-xs text-foreground">
                          Excellent {mktData.score_breakdown.excellent ?? 0} · Good {mktData.score_breakdown.good ?? 0} ·
                          Mod. {mktData.score_breakdown.moderate ?? 0} · Low {mktData.score_breakdown.low ?? 0}
                        </div>
                      </div>
                    )}
                  </div>
                  {mktData.sources && typeof mktData.sources === "object" && (
                    <div>
                      <div className="text-[11px] text-muted-foreground uppercase tracking-wide mb-2">Sources</div>
                      <div className="flex flex-wrap gap-2">
                        {Object.entries(mktData.sources as Record<string, number>).map(([k, v]) => (
                          <span key={k} className="text-[10px] px-2 py-1 rounded-full bg-muted border border-border">
                            {k}: {String(v)}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                  {mktData.sources && typeof mktData.sources === "object" && (
                    <div className="rounded-xl border border-border bg-background p-4">
                      <div className="text-[11px] text-muted-foreground uppercase tracking-wide mb-3">Job Sources Distribution</div>
                      <div className="h-64">
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart data={Object.entries(mktData.sources as Record<string, number>).map(([source, count]) => ({ source, count })).slice(0, 10)}>
                            <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                            <XAxis 
                              dataKey="source" 
                              fontSize={10} 
                              angle={-45} 
                              textAnchor="end" 
                              height={60} 
                              interval={0} 
                            />
                            <YAxis fontSize={10} />
                            <Tooltip 
                              formatter={(value) => [value, 'Jobs']}
                              labelStyle={{ color: 'hsl(var(--foreground))' }}
                              contentStyle={{ backgroundColor: 'hsl(var(--background))', border: '1px solid hsl(var(--border))' }}
                            />
                            <Bar dataKey="count" fill="hsl(var(--primary))" radius={[2, 2, 0, 0]} />
                          </BarChart>
                        </ResponsiveContainer>
                      </div>
                    </div>
                  )}
                  {Array.isArray(mktData.top_locations) && mktData.top_locations.length > 0 && (
                    <div className="rounded-xl border border-border bg-background p-4">
                      <div className="text-[11px] text-muted-foreground uppercase tracking-wide mb-3">Top Job Locations</div>
                      <div className="h-64">
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart data={mktData.top_locations.slice(0, 10)}>
                            <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                            <XAxis 
                              dataKey="location" 
                              fontSize={10} 
                              angle={-45} 
                              textAnchor="end" 
                              height={60} 
                              interval={0} 
                            />
                            <YAxis fontSize={10} />
                            <Tooltip 
                              formatter={(value) => [value, 'Jobs']}
                              labelStyle={{ color: 'hsl(var(--foreground))' }}
                              contentStyle={{ backgroundColor: 'hsl(var(--background))', border: '1px solid hsl(var(--border))' }}
                            />
                            <Bar dataKey="count" fill="hsl(var(--primary))" radius={[2, 2, 0, 0]} />
                          </BarChart>
                        </ResponsiveContainer>
                      </div>
                    </div>
                  )}
                  {Array.isArray(mktData.top_companies) && mktData.top_companies.length > 0 && (
                    <div className="rounded-xl border border-border bg-background p-4">
                      <div className="text-[11px] text-muted-foreground uppercase tracking-wide mb-3">Top Companies</div>
                      <div className="h-64">
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart data={mktData.top_companies.slice(0, 10)}>
                            <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                            <XAxis 
                              dataKey="company" 
                              fontSize={10} 
                              angle={-45} 
                              textAnchor="end" 
                              height={60} 
                              interval={0} 
                            />
                            <YAxis fontSize={10} />
                            <Tooltip 
                              formatter={(value) => [value, 'Jobs']}
                              labelStyle={{ color: 'hsl(var(--foreground))' }}
                              contentStyle={{ backgroundColor: 'hsl(var(--background))', border: '1px solid hsl(var(--border))' }}
                            />
                            <Bar dataKey="count" fill="hsl(var(--primary))" radius={[2, 2, 0, 0]} />
                          </BarChart>
                        </ResponsiveContainer>
                      </div>
                    </div>
                  )}
                  {Array.isArray(mktData.top_skills) && mktData.top_skills.length > 0 && (
                    <div>
                      <div className="text-[11px] text-muted-foreground uppercase tracking-wide mb-2">Top skills in market</div>
                      <div className="flex flex-wrap gap-2">
                        {mktData.top_skills.slice(0, 20).map((row: { skill: string; count: number }) => (
                          <span key={row.skill} className="text-[10px] px-2 py-1 rounded-full bg-primary/8 text-primary border border-primary/20 font-medium">
                            {row.skill}
                            <span className="text-muted-foreground ml-1">({row.count})</span>
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                  {Array.isArray(mktData.top_skills) && mktData.top_skills.length > 0 && (
                    <div className="rounded-xl border border-border bg-background p-4">
                      <div className="text-[11px] text-muted-foreground uppercase tracking-wide mb-3">Top Skills Distribution</div>
                      <div className="h-64">
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart data={mktData.top_skills.slice(0, 10)}>
                            <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                            <XAxis 
                              dataKey="skill" 
                              fontSize={10} 
                              angle={-45} 
                              textAnchor="end" 
                              height={60} 
                              interval={0} 
                            />
                            <YAxis fontSize={10} />
                            <Tooltip 
                              formatter={(value) => [value, 'Jobs']}
                              labelStyle={{ color: 'hsl(var(--foreground))' }}
                              contentStyle={{ backgroundColor: 'hsl(var(--background))', border: '1px solid hsl(var(--border))' }}
                            />
                            <Bar dataKey="count" fill="hsl(var(--primary))" radius={[2, 2, 0, 0]} />
                          </BarChart>
                        </ResponsiveContainer>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </Card>
          )}
          {activeTab === "report" && (
            <ReportTab
              repMarkdown={repMarkdown}
              repLoad={repLoad}
              repError={repError}
              userId={userId}
              onGenerate={loadReport}
              onDownloadPDF={downloadReportPDF} 
            />
          )}
        </div>
      </div>

      {/* ATS Score Modal */}
      {atsModal && (
        <ATSScoreModal
          job={atsModal.job}
          data={atsData}
          loading={atsLoading}
          error={atsError}
          onClose={() => { setAtsModal(null); setAtsData(null); setAtsError(""); }}
          // onBoostCV is optional — modal handles the full boost flow internally
        />
      )}
    </div>
  );
}

// ─── Export ───────────────────────────────────────────────────────────────────

export default function EmploiDashboard() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-background flex items-center justify-center text-muted-foreground">
          Loading…
        </div>
      }
    >
      <Dashboard />
    </Suspense>
  );
}
