"use client";

import Image from "next/image";
import Link from "next/link";
import type { ReactNode } from "react";
import { useEffect, useMemo, useState } from "react";
import styles from "./dashboard.module.css";
import layoutStyles from "../report/[sessionId]/report-dashboard.module.css";
import { rhApiPath } from "../../lib/apiPath";
import logoImage from "../../assets/subul-logo-transparent.png";

type Language = "fr" | "en";
type Theme = "light" | "dark";

type DashboardPayload = {
  overview: {
    total_candidates: number;
    total_interviews: number;
    completed_interviews: number;
    active_interviews: number;
    average_score: number | null;
    acceptance_rate: number;
    scored_interviews: number;
    high_potential_count: number;
    needs_review_count: number;
  };
  timeline: Array<{ date: string; interviews: number; scored?: number; average_score: number | null }>;
  score_distribution: Array<{ label: string; count: number }>;
  skills: Array<{ skill: string; count: number }>;
  competencies: Array<{ key: string; label: string; average: number | null; samples: number }>;
  emotion_distribution: Array<{ key: string; label: string; count: number; percentage: number }>;
  proctoring_alert_distribution: Array<{ key: string; label: string; count: number; percentage: number }>;
  voice?: {
    samples: number;
    utterances: number;
    speech_rate_wpm_avg: number | null;
    volume_score_avg: number | null;
    silence_pct_avg: number | null;
    pause_rate_per_min_avg: number | null;
    pitch_hz_avg: number | null;
    pitch_variation_hz_avg: number | null;
    filler_density_pct: number | null;
    timeline: Array<{
      date: string;
      samples: number;
      utterances: number;
      speech_rate_wpm_avg: number | null;
      volume_score_avg: number | null;
      silence_pct_avg: number | null;
      pause_rate_per_min_avg: number | null;
      pitch_hz_avg: number | null;
      pitch_variation_hz_avg: number | null;
    }>;
  };
  top_candidates: Array<{
    candidate_key: string;
    candidate_name: string;
    headline: string;
    sessions_count: number;
    completed_count: number;
    best_score: number | null;
    latest_score: number | null;
    latest_session_id: string;
    latest_updated_at: string;
    top_skills: string[];
  }>;
  recent_sessions: Array<{
    session_id: string;
    candidate_name: string;
    headline: string;
    status: "completed" | "active" | "draft";
    score_total: number | null;
    updated_at: string;
  }>;
};

const copy = {
  fr: {
    mainMenu: "Menu principal",
    sidebarWorkspace: "Espace de travail",
    sidebarReports: "Rapports",
    sidebarTools: "Outils",
    interview: "Entretien",
    dashboard: "Analytique",
    hr: "RH",
    insights: "Insights",
    history: "Historique",
    calendar: "Calendrier",
    help: "Aide",
    lightMode: "Mode clair",
    darkMode: "Mode sombre",
    launchInterview: "Lancer un entretien",
    title: "Tableau analytique",
    subtitle:
      "Vue globale des candidats, des entretiens finalises, des scores et des competences recurrentes.",
    totalInterviews: "Entretiens",
    completedInterviews: "Entretiens finalises",
    averageScore: "Score moyen",
    completed: "finalises",
    active: "actifs",
    scored: "scores disponibles",
    highPotential: "hauts potentiels",
    activity: "Activite des entretiens",
    scoredActivity: "Entretiens evalues",
    averageScoreTrend: "Score moyen",
    lastDays: "7 derniers jours",
    range7: "7 jours",
    range14: "14 jours",
    range30: "30 jours",
    scoreDistribution: "Distribution des scores",
    skills: "Competences frequentes",
    competencies: "Moyenne par dimension",
    emotions: "Emotions detectees",
    proctoringAlerts: "Alertes surveillance",
    proctoringNote: "Repartition des alertes detectees pendant les entretiens.",
    noProctoringAlerts: "Aucune alerte enregistree",
    softSkills: "Soft skills",
    overview: "Vue analytique",
    voiceAnalytics: "Analyse vocale",
    voiceSignal: "Signal vocal",
    voiceSamples: "echantillons",
    speechRate: "Debit vocal",
    vocalEnergy: "Energie vocale",
    silence: "Silence",
    pitch: "Hauteur",
    pauses: "Pauses",
    wordsPerMinute: "mots/min",
    scoreLabel: "Score RH",
    voiceNote: "Moyennes consolidees depuis les captures vocales des entretiens finalises.",
    noVoiceData: "Aucune metrique vocale exploitable pour cette periode.",
    recentSessions: "Sessions recentes",
    interviews: "entretiens",
    noScore: "Sans score",
    loading: "Chargement du dashboard RH...",
    unable: "Impossible de charger le dashboard RH.",
  },
  en: {
    mainMenu: "Main menu",
    sidebarWorkspace: "Workspace",
    sidebarReports: "Reports",
    sidebarTools: "Tools",
    interview: "Interview",
    dashboard: "Analytics",
    hr: "HR",
    insights: "Insights",
    history: "History",
    calendar: "Calendar",
    help: "Help",
    lightMode: "Light mode",
    darkMode: "Dark mode",
    launchInterview: "Launch interview",
    title: "HR analytics dashboard",
    subtitle: "Global view of candidates, completed interviews, scores, and recurring skills.",
    totalInterviews: "Interviews",
    completedInterviews: "Completed interviews",
    averageScore: "Average score",
    completed: "completed",
    active: "active",
    scored: "scores available",
    highPotential: "high potential",
    activity: "Interview activity",
    scoredActivity: "Scored interviews",
    averageScoreTrend: "Average score",
    lastDays: "Last 7 days",
    range7: "7 days",
    range14: "14 days",
    range30: "30 days",
    scoreDistribution: "Score distribution",
    skills: "Frequent skills",
    competencies: "Average by dimension",
    emotions: "Detected emotions",
    proctoringAlerts: "Proctoring alerts",
    proctoringNote: "Distribution of alerts detected during interviews.",
    noProctoringAlerts: "No recorded alert",
    softSkills: "Soft skills",
    overview: "Analytics overview",
    voiceAnalytics: "Voice analytics",
    voiceSignal: "Voice signal",
    voiceSamples: "samples",
    speechRate: "Pace",
    vocalEnergy: "Energy",
    silence: "Silence",
    pitch: "Pitch",
    pauses: "Pauses",
    wordsPerMinute: "wpm",
    scoreLabel: "HR score",
    voiceNote: "Averages consolidated from captured interview voice metrics.",
    noVoiceData: "No usable voice metrics for this period.",
    recentSessions: "Recent sessions",
    interviews: "interviews",
    noScore: "No score",
    loading: "Loading HR dashboard...",
    unable: "Unable to load HR dashboard.",
  },
} as const;

function SidebarIcon({ type }: { type: "interview" | "dashboard" | "hire" | "file" | "history" | "calendar" | "help" }) {
  if (type === "interview") {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M7 6h10a3 3 0 0 1 3 3v6a3 3 0 0 1-3 3h-6l-4 3v-3H7a3 3 0 0 1-3-3V9a3 3 0 0 1 3-3Z" />
        <path d="M9 11h6" />
        <path d="M9 14h4" />
      </svg>
    );
  }
  if (type === "history") {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M9 5.5A2.5 2.5 0 0 1 11.5 3h1A2.5 2.5 0 0 1 15 5.5V6h1.5A2.5 2.5 0 0 1 19 8.5v9a2.5 2.5 0 0 1-2.5 2.5h-9A2.5 2.5 0 0 1 5 17.5v-9A2.5 2.5 0 0 1 7.5 6H9Z" />
        <path d="M9 6h6" />
        <path d="M12 10v4" />
        <path d="M10 12h4" />
      </svg>
    );
  }
  if (type === "hire") {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M3.5 12s3.2-5.5 8.5-5.5S20.5 12 20.5 12 17.3 17.5 12 17.5 3.5 12 3.5 12Z" />
        <circle cx="12" cy="12" r="2.5" />
        <path d="M17.2 5.2 19 3.4" />
        <path d="M18.7 7.7h2.4" />
      </svg>
    );
  }
  if (type === "file") {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M7 3h7l5 5v11a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2Z" />
        <path d="M14 3v5h5" />
        <path d="M9 13h6" />
      </svg>
    );
  }
  if (type === "calendar") {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M7 3.5v3" />
        <path d="M17 3.5v3" />
        <path d="M4.5 8.5h15" />
        <path d="M6.5 5.5h11a2 2 0 0 1 2 2v10a3 3 0 0 1-3 3h-9a3 3 0 0 1-3-3v-10a2 2 0 0 1 2-2Z" />
      </svg>
    );
  }
  if (type === "help") {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18Z" />
        <path d="M9.4 9.2a2.7 2.7 0 1 1 4.2 2.2c-.9.6-1.6 1.1-1.6 2.1" />
        <path d="M12 16.8h.01" />
      </svg>
    );
  }
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M4 4h6v6H4Z" />
      <path d="M14 4h6v6h-6Z" />
      <path d="M4 14h6v6H4Z" />
      <path d="M14 14h6v6h-6Z" />
    </svg>
  );
}

function MetricIcon({ type }: { type: "interviews" | "completed" | "score" }) {
  if (type === "completed") {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M5 12.5 9.2 17 19 7" />
        <path d="M4.5 5.5h15v13h-15Z" />
      </svg>
    );
  }
  if (type === "score") {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M12 3.5 14.8 9l6.1.9-4.4 4.3 1 6.1-5.5-2.9-5.5 2.9 1-6.1L3.1 9l6.1-.9Z" />
      </svg>
    );
  }
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M7 6h10a3 3 0 0 1 3 3v6a3 3 0 0 1-3 3H7a3 3 0 0 1-3-3V9a3 3 0 0 1 3-3Z" />
      <path d="M8 12h8" />
      <path d="M8 15h5" />
    </svg>
  );
}

function VoiceIcon({ type }: { type: "pace" | "energy" | "silence" | "pitch" }) {
  if (type === "energy") {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M13 2 5 13h6l-1 9 8-12h-6Z" />
      </svg>
    );
  }
  if (type === "silence") {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M4 12h2" />
        <path d="M10 7v10" />
        <path d="M14 9v6" />
        <path d="M18 11v2" />
      </svg>
    );
  }
  if (type === "pitch") {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M4 16c2.5 0 2.5-8 5-8s2.5 8 5 8 2.5-8 6-8" />
        <path d="M4 20h16" />
      </svg>
    );
  }
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M5 12h3" />
      <path d="M10 12h9" />
      <path d="M7 8h10" />
      <path d="M7 16h10" />
    </svg>
  );
}

function pct(value: number, max: number) {
  if (!Number.isFinite(value) || !Number.isFinite(max) || max <= 0) return 0;
  return Math.max(3, Math.min(100, Math.round((value / max) * 100)));
}

function formatShortDate(value: string, language: Language) {
  if (!value || value === "Sans date") return "--";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value.slice(5);
  return date.toLocaleDateString(language === "fr" ? "fr-FR" : "en-US", { day: "2-digit", month: "2-digit" });
}

function buildLinePoints(values: Array<number | null>, width = 640, height = 210, padding = 24) {
  const numericValues = values.map((value) => (typeof value === "number" && Number.isFinite(value) ? value : 0));
  const maxValue = Math.max(1, ...numericValues);
  const step = values.length > 1 ? (width - padding * 2) / (values.length - 1) : 0;
  return numericValues.map((value, index) => {
    const x = padding + step * index;
    const y = height - padding - (value / maxValue) * (height - padding * 2);
    return { x, y, value };
  });
}

function linePath(points: Array<{ x: number; y: number }>) {
  return points.map((point, index) => `${index === 0 ? "M" : "L"} ${point.x} ${point.y}`).join(" ");
}

function smoothLinePath(points: Array<{ x: number; y: number }>) {
  if (!points.length) return "";
  if (points.length === 1) return `M ${points[0].x} ${points[0].y}`;
  return points
    .map((point, index) => {
      if (index === 0) return `M ${point.x} ${point.y}`;
      const previous = points[index - 1];
      const controlX = (previous.x + point.x) / 2;
      return `C ${controlX} ${previous.y}, ${controlX} ${point.y}, ${point.x} ${point.y}`;
    })
    .join(" ");
}

function AnimatedNumber({ value, suffix = "" }: { value: number; suffix?: string }) {
  const [displayValue, setDisplayValue] = useState(0);

  useEffect(() => {
    const target = Number.isFinite(value) ? value : 0;
    const duration = 900;
    const start = performance.now();
    let frameId = 0;

    const tick = (now: number) => {
      const progress = Math.min((now - start) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setDisplayValue(Math.round(target * eased));
      if (progress < 1) frameId = window.requestAnimationFrame(tick);
    };

    frameId = window.requestAnimationFrame(tick);
    return () => window.cancelAnimationFrame(frameId);
  }, [value]);

  return <>{displayValue}{suffix}</>;
}

const emotionColors: Record<string, string> = {
  happy: "#18b8a8",
  neutral: "#8558f2",
  surprise: "#1da6df",
  sad: "#72809a",
  angry: "#e84aa4",
};

const proctoringColors: Record<string, string> = {
  visibilitychange: "#ef4444",
  blur: "#f59e0b",
  window_resize: "#0ea5e9",
  devtools: "#8b5cf6",
  multiple_screens: "#14b8a6",
};

const localizedCompetencyLabels: Record<Language, Record<string, string>> = {
  fr: {
    communication: "Communication",
    teamwork: "Travail d'equipe",
    problem_solving: "Resolution",
    motivation: "Motivation",
  },
  en: {
    communication: "Communication",
    teamwork: "Teamwork",
    problem_solving: "Problem solving",
    motivation: "Motivation",
  },
};

const localizedEmotionLabels: Record<Language, Record<string, string>> = {
  fr: {
    happy: "Sourire",
    neutral: "Neutre",
    surprise: "Surprise",
    sad: "Tristesse",
    angry: "Tension",
  },
  en: {
    happy: "Smile",
    neutral: "Neutral",
    surprise: "Surprise",
    sad: "Sadness",
    angry: "Tension",
  },
};

const localizedProctoringLabels: Record<Language, Record<string, string>> = {
  fr: {
    visibilitychange: "Changement d'onglet",
    blur: "Perte de focus",
    window_resize: "Reduction de fenetre",
    devtools: "Ouverture DevTools",
    multiple_screens: "Plusieurs ecrans",
  },
  en: {
    visibilitychange: "Tab switch",
    blur: "Focus lost",
    window_resize: "Window resized",
    devtools: "DevTools opened",
    multiple_screens: "Multiple screens",
  },
};

const localizedScoreLabels: Record<Language, Record<string, string>> = {
  fr: {
    "Sans score": "Sans score",
  },
  en: {
    "Sans score": "No score",
  },
};

function localizeLabel(labels: Record<Language, Record<string, string>>, language: Language, key: string, fallback: string) {
  return labels[language][key] || fallback;
}

function buildConicGradient(items: DashboardPayload["emotion_distribution"]) {
  let cursor = 0;
  const segments = items
    .filter((item) => item.percentage > 0)
    .map((item) => {
      const start = cursor;
      cursor += item.percentage;
      const color = emotionColors[item.key] || "#94a3b8";
      return `${color} ${start}% ${cursor}%`;
    });
  return segments.length ? `conic-gradient(${segments.join(", ")})` : "conic-gradient(#e2e8f0 0% 100%)";
}

function buildAlertConicGradient(items: DashboardPayload["proctoring_alert_distribution"]) {
  let cursor = 0;
  const segments = items
    .filter((item) => item.percentage > 0)
    .map((item) => {
      const start = cursor;
      cursor += item.percentage;
      const color = proctoringColors[item.key] || "#94a3b8";
      return `${color} ${start}% ${cursor}%`;
    });
  return segments.length ? `conic-gradient(${segments.join(", ")})` : "conic-gradient(#e2e8f0 0% 100%)";
}

function EmotionTooltipIcon({ type }: { type: string }) {
  if (type === "happy") {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <circle cx="12" cy="12" r="8" />
        <path d="M8.5 10h.01" />
        <path d="M15.5 10h.01" />
        <path d="M8.5 14.2c1.8 2 5.2 2 7 0" />
      </svg>
    );
  }
  if (type === "sad") {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <circle cx="12" cy="12" r="8" />
        <path d="M8.5 10h.01" />
        <path d="M15.5 10h.01" />
        <path d="M8.7 16c1.7-1.7 4.9-1.7 6.6 0" />
      </svg>
    );
  }
  if (type === "surprise") {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <circle cx="12" cy="12" r="8" />
        <path d="M8.5 10h.01" />
        <path d="M15.5 10h.01" />
        <circle cx="12" cy="15" r="1.9" />
      </svg>
    );
  }
  if (type === "angry") {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <circle cx="12" cy="12" r="8" />
        <path d="M7.8 9.2 10 10" />
        <path d="M16.2 9.2 14 10" />
        <path d="M9 16h6" />
      </svg>
    );
  }
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <circle cx="12" cy="12" r="8" />
      <path d="M8.5 10h.01" />
      <path d="M15.5 10h.01" />
      <path d="M9 15h6" />
    </svg>
  );
}

export default function DashboardPage() {
  const [language, setLanguage] = useState<Language>("fr");
  const [theme, setTheme] = useState<Theme>("light");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [rangeDays, setRangeDays] = useState(7);
  const [dashboard, setDashboard] = useState<DashboardPayload | null>(null);
  const [hoveredEmotionKey, setHoveredEmotionKey] = useState<string | null>(null);
  const [hoveredProctoringKey, setHoveredProctoringKey] = useState<string | null>(null);
  const [hoveredActivityIndex, setHoveredActivityIndex] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const t = copy[language];

  useEffect(() => {
    if (typeof window === "undefined") return;
    const storedLanguage = window.localStorage.getItem("dashboard-language");
    if (storedLanguage === "fr" || storedLanguage === "en") setLanguage(storedLanguage);
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const storedTheme = window.localStorage.getItem("dashboard-theme");
    if (storedTheme === "light" || storedTheme === "dark") {
      setTheme(storedTheme);
      return;
    }

    if (window.matchMedia("(prefers-color-scheme: dark)").matches) {
      setTheme("dark");
    }
  }, []);

  useEffect(() => {
    if (typeof window !== "undefined") window.localStorage.setItem("dashboard-language", language);
  }, [language]);

  useEffect(() => {
    if (typeof window !== "undefined") window.localStorage.setItem("dashboard-theme", theme);
  }, [theme]);

  useEffect(() => {
    const loadDashboard = async () => {
      setLoading(true);
      setError("");
      try {
        const res = await fetch(rhApiPath(`/api/rh/dashboard?limit=300&days=${rangeDays}`), { cache: "no-store" });
        const data = (await res.json()) as DashboardPayload & { error?: string };
        if (!res.ok) {
          setError(data?.error || t.unable);
          return;
        }
        setDashboard(data);
      } catch (err) {
        setError((err as Error).message);
      } finally {
        setLoading(false);
      }
    };
    void loadDashboard();
  }, [rangeDays, t.unable]);

  const maxScoreDistribution = useMemo(
    () => Math.max(1, ...(dashboard?.score_distribution || []).map((item) => item.count)),
    [dashboard?.score_distribution]
  );
  const maxSkills = useMemo(() => Math.max(1, ...(dashboard?.skills || []).map((item) => item.count)), [dashboard?.skills]);
  const emotionItems = useMemo(
    () =>
      (dashboard?.emotion_distribution || []).map((item) => ({
        ...item,
        label: localizeLabel(localizedEmotionLabels, language, item.key, item.label),
      })),
    [dashboard?.emotion_distribution, language]
  );
  const proctoringItems = useMemo(
    () =>
      (dashboard?.proctoring_alert_distribution || []).map((item) => ({
        ...item,
        label: localizeLabel(localizedProctoringLabels, language, item.key, item.label),
      })),
    [dashboard?.proctoring_alert_distribution, language]
  );
  const skillItems = dashboard?.skills || [];
  const competencyItems = useMemo(
    () =>
      (dashboard?.competencies || []).map((item) => ({
        ...item,
        label: localizeLabel(localizedCompetencyLabels, language, item.key, item.label),
      })),
    [dashboard?.competencies, language]
  );
  const scoreDistributionItems = useMemo(
    () =>
      (dashboard?.score_distribution || []).map((item) => ({
        ...item,
        label: localizedScoreLabels[language][item.label] || item.label,
      })),
    [dashboard?.score_distribution, language]
  );
  const timelineItems = dashboard?.timeline || [];
  const voice = dashboard?.voice;
  const voiceTimelineItems = voice?.timeline || [];
  const scoredTimelineValues = useMemo(
    () => timelineItems.map((item) => item.scored ?? (item.average_score !== null ? item.interviews : 0)),
    [timelineItems]
  );
  const activityPoints = useMemo(
    () => buildLinePoints(scoredTimelineValues),
    [scoredTimelineValues]
  );
  const voiceSpeechValues = useMemo(
    () => voiceTimelineItems.map((item) => item.speech_rate_wpm_avg),
    [voiceTimelineItems]
  );
  const voiceVolumeValues = useMemo(
    () => voiceTimelineItems.map((item) => item.volume_score_avg),
    [voiceTimelineItems]
  );
  const maxVoiceVolume = useMemo(
    () => Math.max(1, ...voiceVolumeValues.map((value) => (typeof value === "number" && Number.isFinite(value) ? value : 0))),
    [voiceVolumeValues]
  );
  const voiceYAxisMax = Math.max(20, Math.ceil(maxVoiceVolume / 10) * 10);
  const activityPath = linePath(activityPoints);
  const activitySmoothPath = smoothLinePath(activityPoints);
  const activityAreaPath = activityPoints.length
    ? `${activitySmoothPath} L ${activityPoints[activityPoints.length - 1].x} 210 L ${activityPoints[0].x} 210 Z`
    : "";
  const hoveredActivity =
    hoveredActivityIndex !== null && timelineItems[hoveredActivityIndex] && activityPoints[hoveredActivityIndex]
      ? {
          item: timelineItems[hoveredActivityIndex],
          point: activityPoints[hoveredActivityIndex],
        }
      : null;
  const completionRate =
    dashboard && dashboard.overview.total_interviews > 0
      ? Math.round((dashboard.overview.completed_interviews / dashboard.overview.total_interviews) * 100)
      : 0;
  const emotionGradient = useMemo(
    () => buildConicGradient(emotionItems),
    [emotionItems]
  );
  const proctoringGradient = useMemo(
    () => buildAlertConicGradient(proctoringItems),
    [proctoringItems]
  );
  const activeEmotion = useMemo(
    () => emotionItems.find((item) => item.key === hoveredEmotionKey) || emotionItems[0],
    [emotionItems, hoveredEmotionKey]
  );
  const activeProctoring = useMemo(
    () => proctoringItems.find((item) => item.key === hoveredProctoringKey) || proctoringItems.find((item) => item.count > 0) || proctoringItems[0],
    [hoveredProctoringKey, proctoringItems]
  );

  return (
    <div
      className={`${layoutStyles.shell} ${sidebarOpen ? layoutStyles.sidebarVisible : ""} ${theme === "dark" ? layoutStyles.themeDark : layoutStyles.themeLight} ${
        theme === "dark" ? styles.dashboardThemeDark : styles.dashboardThemeLight
      }`}
    >
      <button
        type="button"
        className={layoutStyles.sidebarToggle}
        onClick={() => setSidebarOpen((open) => !open)}
        aria-label={sidebarOpen ? "Fermer le menu" : "Ouvrir le menu"}
        aria-expanded={sidebarOpen}
      >
        <span />
        <span />
        <span />
      </button>

      {sidebarOpen && (
        <button type="button" className={layoutStyles.sidebarBackdrop} onClick={() => setSidebarOpen(false)} aria-label="Fermer le menu" />
      )}

      <aside className={`${layoutStyles.sidebar} ${sidebarOpen ? layoutStyles.sidebarOpen : ""}`}>
        <div className={layoutStyles.sidebarTop}>
          <Image className={layoutStyles.logoImage} src={logoImage} alt="SUBUL" priority />
        </div>

        <div className={layoutStyles.menuBlock}>
          <p className={layoutStyles.menuTitle}>{t.mainMenu}</p>
          <nav className={layoutStyles.nav}>
            <span className={layoutStyles.navGroupTitle}>{t.sidebarWorkspace}</span>
            <Link className={`${layoutStyles.navItem} ${layoutStyles.navItemActive}`} href="/dashboard">
              <SidebarIcon type="dashboard" />
              {t.dashboard}
            </Link>
            <Link className={layoutStyles.navItem} href="/">
              <SidebarIcon type="interview" />
              {t.interview}
            </Link>
            <span className={layoutStyles.navGroupTitle}>{t.sidebarReports}</span>
            <button type="button" className={`${layoutStyles.navItem} ${layoutStyles.navButton} ${layoutStyles.navItemDisabled}`} disabled>
              <SidebarIcon type="file" />
              {t.hr}
            </button>
            <button type="button" className={`${layoutStyles.navItem} ${layoutStyles.navButton} ${layoutStyles.navItemDisabled}`} disabled>
              <SidebarIcon type="hire" />
              {t.insights}
            </button>
            <span className={layoutStyles.navGroupTitle}>{t.sidebarTools}</span>
            <Link className={layoutStyles.navItem} href="/history">
              <SidebarIcon type="history" />
              {t.history}
            </Link>
            <Link className={layoutStyles.navItem} href="/calendar">
              <SidebarIcon type="calendar" />
              {t.calendar}
            </Link>
            <Link className={layoutStyles.navItem} href="/help">
              <SidebarIcon type="help" />
              {t.help}
            </Link>
          </nav>
        </div>
      </aside>

      <main className={layoutStyles.main}>
        <section className={layoutStyles.header}>
          <div>
            <h1>{t.title}</h1>
            <p>{t.subtitle}</p>
          </div>
          <div className={layoutStyles.headerActions}>
            <div className={layoutStyles.themeToggle}>
              <button
                type="button"
                className={`${layoutStyles.themeButton} ${theme === "light" ? layoutStyles.themeButtonActive : ""}`}
                onClick={() => setTheme("light")}
                aria-label={t.lightMode}
              >
                <svg viewBox="0 0 24 24" aria-hidden="true">
                  <circle cx="12" cy="12" r="4" />
                  <path d="M12 2.5v2.5" />
                  <path d="M12 19v2.5" />
                  <path d="M4.9 4.9 6.7 6.7" />
                  <path d="M17.3 17.3 19.1 19.1" />
                  <path d="M2.5 12H5" />
                  <path d="M19 12h2.5" />
                  <path d="M4.9 19.1 6.7 17.3" />
                  <path d="M17.3 6.7 19.1 4.9" />
                </svg>
              </button>
              <button
                type="button"
                className={`${layoutStyles.themeButton} ${theme === "dark" ? layoutStyles.themeButtonActive : ""}`}
                onClick={() => setTheme("dark")}
                aria-label={t.darkMode}
              >
                <svg viewBox="0 0 24 24" aria-hidden="true">
                  <path d="M20 14.5A8.5 8.5 0 1 1 9.5 4 7 7 0 0 0 20 14.5Z" />
                </svg>
              </button>
            </div>
            <div className={layoutStyles.languageToggle}>
              <button type="button" className={`${layoutStyles.languageButton} ${language === "fr" ? layoutStyles.languageButtonActive : ""}`} onClick={() => setLanguage("fr")}>
                FR
              </button>
              <button type="button" className={`${layoutStyles.languageButton} ${language === "en" ? layoutStyles.languageButtonActive : ""}`} onClick={() => setLanguage("en")}>
                EN
              </button>
            </div>
            <Link className={layoutStyles.primaryButton} href="/">
              {t.launchInterview}
            </Link>
          </div>
        </section>

        {loading || error || !dashboard ? (
          <section className={`${styles.card} ${styles.empty}`}>{error || t.loading}</section>
        ) : (
          <>
            <section className={styles.kpiGrid}>
              <article className={styles.kpiCard}>
                <span className={styles.kpiIcon}><MetricIcon type="interviews" /></span>
                <div>
                  <span>{t.totalInterviews}</span>
                  <strong><AnimatedNumber value={dashboard.overview.total_interviews} /></strong>
                  <small><AnimatedNumber value={dashboard.overview.active_interviews} /> {t.active}</small>
                </div>
              </article>
              <article className={styles.kpiCard}>
                <span className={styles.kpiIcon}><MetricIcon type="completed" /></span>
                <div>
                  <span>{t.completedInterviews}</span>
                  <strong><AnimatedNumber value={dashboard.overview.completed_interviews} /></strong>
                  <small><AnimatedNumber value={completionRate} suffix="%" /> {t.completed}</small>
                </div>
              </article>
              <article className={styles.kpiCard}>
                <span className={styles.kpiIcon}><MetricIcon type="score" /></span>
                <div>
                  <span>{t.averageScore}</span>
                  <strong>
                    {dashboard.overview.average_score !== null ? (
                      <><AnimatedNumber value={dashboard.overview.average_score} />/100</>
                    ) : "--"}
                  </strong>
                  <small><AnimatedNumber value={dashboard.overview.scored_interviews} /> {t.scored}</small>
                </div>
              </article>
            </section>

            <h2 className={styles.sectionTitle}>{t.overview}</h2>

            <section className={styles.insightGrid}>
              <article className={`${styles.card} ${styles.emotionCard}`}>
                <div className={styles.cardHead}>
                  <h2>{t.emotions}</h2>
                  <span className={styles.pill}>Vision</span>
                </div>
                <div className={styles.donutPanel}>
                  <div className={styles.donutChart} style={{ background: emotionGradient }}>
                    {emotionItems.length ? (
                      <svg className={styles.donutSvg} viewBox="0 0 120 120" aria-label={t.emotions}>
                        <circle className={styles.donutBase} cx="60" cy="60" r="42" pathLength="100" />
                        {emotionItems.reduce(
                          (segments, item) => {
                            const start = segments.offset;
                            segments.nodes.push(
                              <circle
                                className={styles.donutSegment}
                                cx="60"
                                cy="60"
                                r="42"
                                pathLength="100"
                                stroke={emotionColors[item.key] || "#94a3b8"}
                                strokeDasharray={`${Math.max(item.percentage, 0.2)} ${100 - Math.max(item.percentage, 0.2)}`}
                                strokeDashoffset={-start}
                                onMouseEnter={() => setHoveredEmotionKey(item.key)}
                                onMouseLeave={() => setHoveredEmotionKey(null)}
                                onFocus={() => setHoveredEmotionKey(item.key)}
                                onBlur={() => setHoveredEmotionKey(null)}
                                tabIndex={0}
                                role="img"
                                aria-label={`${item.label} ${item.percentage}%`}
                                key={item.key}
                              />
                            );
                            segments.offset += item.percentage;
                            return segments;
                          },
                          { offset: 0, nodes: [] as ReactNode[] }
                        ).nodes}
                      </svg>
                    ) : null}
                    <div className={styles.donutCenter}>
                      <strong>{activeEmotion?.percentage ?? 0}%</strong>
                      <span>{activeEmotion?.label || "--"}</span>
                    </div>
                    {hoveredEmotionKey && activeEmotion ? (
                      <div className={styles.emotionTooltip} role="status">
                        <EmotionTooltipIcon type={activeEmotion.key} />
                        <strong>{activeEmotion.percentage}%</strong>
                      </div>
                    ) : null}
                  </div>
                  <div className={styles.donutLegend}>
                    {emotionItems.map((item) => (
                      <div
                        className={styles.donutLegendItem}
                        onMouseEnter={() => setHoveredEmotionKey(item.key)}
                        onMouseLeave={() => setHoveredEmotionKey(null)}
                        onFocus={() => setHoveredEmotionKey(item.key)}
                        onBlur={() => setHoveredEmotionKey(null)}
                        tabIndex={0}
                        key={item.key}
                      >
                        <span
                          className={styles.emotionLegendIcon}
                          style={{ color: emotionColors[item.key] || "#94a3b8" }}
                          aria-hidden="true"
                        >
                          <EmotionTooltipIcon type={item.key} />
                        </span>
                        <span>{item.label}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </article>

              <article className={`${styles.card} ${styles.emotionCard}`}>
                <div className={styles.cardHead}>
                  <div>
                    <h2>{t.proctoringAlerts}</h2>
                    <p>{t.proctoringNote}</p>
                  </div>
                  <span className={styles.pill}>RH</span>
                </div>
                <div className={styles.donutPanel}>
                  <div className={styles.donutChart} style={{ background: proctoringGradient }}>
                    {proctoringItems.length ? (
                      <svg className={styles.donutSvg} viewBox="0 0 120 120" aria-label={t.proctoringAlerts}>
                        <circle className={styles.donutBase} cx="60" cy="60" r="42" pathLength="100" />
                        {proctoringItems.reduce(
                          (segments, item) => {
                            const start = segments.offset;
                            segments.nodes.push(
                              <circle
                                className={styles.donutSegment}
                                cx="60"
                                cy="60"
                                r="42"
                                pathLength="100"
                                stroke={proctoringColors[item.key] || "#94a3b8"}
                                strokeDasharray={`${Math.max(item.percentage, 0.2)} ${100 - Math.max(item.percentage, 0.2)}`}
                                strokeDashoffset={-start}
                                onMouseEnter={() => setHoveredProctoringKey(item.key)}
                                onMouseLeave={() => setHoveredProctoringKey(null)}
                                onFocus={() => setHoveredProctoringKey(item.key)}
                                onBlur={() => setHoveredProctoringKey(null)}
                                tabIndex={0}
                                role="img"
                                aria-label={`${item.label} ${item.percentage}%`}
                                key={item.key}
                              />
                            );
                            segments.offset += item.percentage;
                            return segments;
                          },
                          { offset: 0, nodes: [] as ReactNode[] }
                        ).nodes}
                      </svg>
                    ) : null}
                    <div className={styles.donutCenter}>
                      <strong>{activeProctoring?.percentage ?? 0}%</strong>
                      <span>{activeProctoring?.label || t.noProctoringAlerts}</span>
                    </div>
                  </div>
                  <div className={styles.donutLegend}>
                    {proctoringItems.map((item) => (
                      <div
                        className={styles.donutLegendItem}
                        onMouseEnter={() => setHoveredProctoringKey(item.key)}
                        onMouseLeave={() => setHoveredProctoringKey(null)}
                        onFocus={() => setHoveredProctoringKey(item.key)}
                        onBlur={() => setHoveredProctoringKey(null)}
                        tabIndex={0}
                        key={item.key}
                      >
                        <i style={{ background: proctoringColors[item.key] || "#94a3b8" }} />
                        <span>{item.label} ({item.count})</span>
                      </div>
                    ))}
                  </div>
                </div>
              </article>

              <article className={styles.card}>
                <div className={styles.cardHead}>
                  <h2>{t.scoreDistribution}</h2>
                  <span className={styles.pill}><AnimatedNumber value={dashboard.overview.scored_interviews} /> {t.scored}</span>
                </div>
                <div className={styles.scoreHistogram}>
                  {scoreDistributionItems.map((item) => (
                    <div className={styles.scoreColumn} key={item.label}>
                      <strong><AnimatedNumber value={item.count} /></strong>
                      <div className={styles.scoreColumnTrack}>
                        <span style={{ height: `${pct(item.count, maxScoreDistribution)}%` }} />
                      </div>
                      <small>{item.label}</small>
                    </div>
                  ))}
                </div>
              </article>

            </section>

            <section className={styles.grid}>
              <article className={`${styles.card} ${styles.skillsCard}`}>
                <div className={styles.cardHead}>
                  <h2>{t.skills}</h2>
                  <span className={styles.pill}>CV</span>
                </div>
                <div className={styles.bars}>
                  {skillItems.slice(0, 8).map((item) => (
                    <div className={styles.barRow} key={item.skill}>
                      <div className={styles.barMeta}>
                        <span>{item.skill}</span>
                        <strong><AnimatedNumber value={item.count} /></strong>
                      </div>
                      <div className={styles.barTrack}>
                        <span style={{ width: `${pct(item.count, maxSkills)}%` }} />
                      </div>
                    </div>
                  ))}
                </div>
              </article>

              <article className={`${styles.card} ${styles.softSkillsCard}`}>
                <div className={styles.cardHead}>
                  <h2>{t.softSkills}</h2>
                  <span className={styles.pill}>RH</span>
                </div>
                <div className={styles.softSkillGrid}>
                  {competencyItems.map((item) => (
                    <div className={styles.softSkillCard} key={item.key}>
                      <div className={styles.softSkillCircle} style={{ background: `conic-gradient(#7c3aed 0% ${item.average ?? 0}%, #e8ddf6 ${item.average ?? 0}% 100%)` }}>
                        <span>{item.average !== null ? <AnimatedNumber value={item.average} suffix="%" /> : "--"}</span>
                      </div>
                      <div>
                        <span>{item.label}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </article>
            </section>

            <section className={`${styles.card} ${styles.voiceCard}`}>
              <div className={styles.cardHead}>
                <div>
                  <h2>{t.voiceAnalytics}</h2>
                  <p>{t.voiceNote}</p>
                </div>
                <div className={styles.voiceHeadActions}>
                  <select
                    className={styles.rangeSelect}
                    value={rangeDays}
                    onChange={(event) => setRangeDays(Number(event.target.value))}
                    aria-label={t.lastDays}
                  >
                    <option value={7}>{t.range7}</option>
                    <option value={14}>{t.range14}</option>
                    <option value={30}>{t.range30}</option>
                  </select>
                  <span className={styles.pill}>
                    {voice?.samples ?? 0} {t.voiceSamples}
                  </span>
                </div>
              </div>

              {voice && voice.samples > 0 ? (
                <div className={styles.voiceLayout}>
                  <div className={styles.voiceKpis}>
                    <div className={styles.voiceKpi}>
                      <div className={styles.voiceKpiTop}>
                        <span className={styles.voiceKpiIcon}><VoiceIcon type="pace" /></span>
                        <span>{t.speechRate}</span>
                      </div>
                      <strong>{voice.speech_rate_wpm_avg ?? "--"}</strong>
                      <small>{t.wordsPerMinute}</small>
                    </div>
                    <div className={styles.voiceKpi}>
                      <div className={styles.voiceKpiTop}>
                        <span className={styles.voiceKpiIcon}><VoiceIcon type="energy" /></span>
                        <span>{t.vocalEnergy}</span>
                      </div>
                      <strong>{voice.volume_score_avg ?? "--"}%</strong>
                      <small>{t.voiceSignal}</small>
                    </div>
                    <div className={styles.voiceKpi}>
                      <div className={styles.voiceKpiTop}>
                        <span className={styles.voiceKpiIcon}><VoiceIcon type="silence" /></span>
                        <span>{t.silence}</span>
                      </div>
                      <strong>{voice.silence_pct_avg ?? "--"}%</strong>
                      <small>{t.pauses} {voice.pause_rate_per_min_avg ?? "--"}/min</small>
                    </div>
                    <div className={styles.voiceKpi}>
                      <div className={styles.voiceKpiTop}>
                        <span className={styles.voiceKpiIcon}><VoiceIcon type="pitch" /></span>
                        <span>{t.pitch}</span>
                      </div>
                      <strong>{voice.pitch_hz_avg ?? "--"}</strong>
                      <small>Hz</small>
                    </div>
                  </div>

                  <div className={styles.voiceChart}>
                    <div className={styles.voiceBarChart} role="img" aria-label={t.voiceAnalytics}>
                      <div className={styles.voiceYAxis}>
                        {[voiceYAxisMax, Math.round(voiceYAxisMax * 0.75), Math.round(voiceYAxisMax * 0.5), Math.round(voiceYAxisMax * 0.25), 0].map((tick) => (
                          <span key={tick}>{tick}</span>
                        ))}
                      </div>
                      <div
                        className={styles.voicePlot}
                        style={{ "--voice-day-count": voiceTimelineItems.length } as React.CSSProperties}
                      >
                        {[0, 1, 2, 3, 4].map((line) => (
                          <span className={styles.voiceGridLine} style={{ top: `${line * 25}%` }} key={line} />
                        ))}
                        {voiceTimelineItems.map((item, index) => {
                          const value = item.volume_score_avg ?? 0;
                          const height = Math.max(2, Math.min(100, (value / voiceYAxisMax) * 100));
                          return (
                            <div className={styles.voiceBarColumn} key={item.date}>
                              <div className={styles.voiceBarWrap}>
                                <span className={styles.voiceBarTooltip}>
                                  <strong>{formatShortDate(item.date, language)}</strong>
                                  {t.vocalEnergy}: {item.volume_score_avg !== null ? `${item.volume_score_avg}%` : "--"}
                                </span>
                                <span
                                  className={`${styles.voiceBar} ${styles[`voiceBarTone${(index % 6) + 1}` as keyof typeof styles]}`}
                                  style={{ height: `${height}%` }}
                                />
                              </div>
                              <small>{formatShortDate(item.date, language)}</small>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                    <div className={styles.voiceLegend}>
                      <span><i className={styles.voiceLegendVolume} />{t.vocalEnergy}</span>
                      <span><i className={styles.voiceLegendSpeech} />{t.speechRate}: {voice.speech_rate_wpm_avg ?? "--"} {t.wordsPerMinute}</span>
                    </div>
                  </div>
                </div>
              ) : (
                <div className={styles.voiceEmpty}>{t.noVoiceData}</div>
              )}
            </section>

            <section className={`${styles.card} ${styles.activityCard}`}>
              <div className={styles.cardHead}>
                <div>
                  <h2>{t.activity}</h2>
                  <p>{t.lastDays}</p>
                </div>
                <div className={styles.legendInline}>
                  <select
                    className={styles.rangeSelect}
                    value={rangeDays}
                    onChange={(event) => setRangeDays(Number(event.target.value))}
                    aria-label={t.lastDays}
                  >
                    <option value={7}>{t.range7}</option>
                    <option value={14}>{t.range14}</option>
                    <option value={30}>{t.range30}</option>
                  </select>
                  <span><i className={styles.dotPrimary} />{t.scoredActivity}</span>
                </div>
              </div>
              <div
                className={styles.lineChart}
                style={{ "--activity-day-count": timelineItems.length } as React.CSSProperties}
              >
                <svg viewBox="0 0 640 250" role="img" aria-label={t.activity}>
                  <defs>
                    <linearGradient id="activityArea" x1="0" x2="0" y1="0" y2="1">
                      <stop offset="0%" stopColor="#7c3aed" stopOpacity="0.22" />
                      <stop offset="100%" stopColor="#d946ef" stopOpacity="0.04" />
                    </linearGradient>
                    <linearGradient id="activityStroke" x1="0" x2="1" y1="0" y2="0">
                      <stop offset="0%" stopColor="#14b8a6" />
                      <stop offset="48%" stopColor="#d946ef" />
                      <stop offset="100%" stopColor="#7c3aed" />
                    </linearGradient>
                  </defs>
                  {[46, 88, 130, 172, 214].map((y) => (
                    <line className={styles.chartGuide} x1="24" x2="616" y1={y} y2={y} key={y} />
                  ))}
                  {activityAreaPath ? <path className={styles.chartArea} d={activityAreaPath} /> : null}
                  <path className={styles.chartLinePrimaryGlow} d={activitySmoothPath} />
                  <path className={styles.chartLinePrimary} d={activitySmoothPath} />
                  {activityPoints.map((point, index) =>
                    scoredTimelineValues[index] > 0 ? (
                      <g key={`a-${index}`}>
                        <circle
                          className={styles.chartDotPrimary}
                          cx={point.x}
                          cy={point.y}
                          r="7"
                          tabIndex={0}
                          onMouseEnter={() => setHoveredActivityIndex(index)}
                          onMouseLeave={() => setHoveredActivityIndex(null)}
                          onFocus={() => setHoveredActivityIndex(index)}
                          onBlur={() => setHoveredActivityIndex(null)}
                        />
                      </g>
                    ) : null
                  )}
                  {timelineItems.map((item, index) => {
                    const x = activityPoints[index]?.x || 24;
                    return (
                      <g className={styles.chartLabelGroup} key={item.date}>
                        <rect x={x - 23} y="226" width="46" height="20" rx="10" />
                        <text className={styles.chartLabel} x={x} y="240" textAnchor="middle">
                          {formatShortDate(item.date, language)}
                        </text>
                      </g>
                    );
                  })}
                  {hoveredActivity ? (
                    <g
                      className={styles.chartTooltipSvg}
                      transform={`translate(${hoveredActivity.point.x} ${hoveredActivity.point.y})`}
                    >
                      <rect x="-66" y="-54" width="132" height="42" rx="10" />
                      <text x="0" y="-36" textAnchor="middle">
                        {formatShortDate(hoveredActivity.item.date, language)}
                      </text>
                      <text x="0" y="-20" textAnchor="middle">
                        {hoveredActivity.item.average_score !== null
                          ? `${t.scoreLabel} ${hoveredActivity.item.average_score}/100`
                          : `${t.scoreLabel} --/100`}
                      </text>
                    </g>
                  ) : null}
                </svg>
              </div>
            </section>
          </>
        )}
      </main>
    </div>
  );
}
