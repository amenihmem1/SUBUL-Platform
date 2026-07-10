"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { type ScheduledInterview } from "../../lib/interviewCalendar";
import styles from "../report/[sessionId]/report-dashboard.module.css";
import logoImage from "../../assets/subul-logo-transparent.png";

type Language = "fr" | "en";
type Theme = "light" | "dark";

type ScheduleFormState = {
  candidateName: string;
  candidateEmail: string;
  date: string;
  time: string;
};

type PlatformProfile = {
  name: string;
  email: string;
};

type CalendarCell = {
  key: string;
  dateKey: string;
  dayNumber: number;
  inCurrentMonth: boolean;
  isToday: boolean;
  items: ScheduledInterview[];
};

type AnimatedCalendarStats = {
  all: number;
  upcoming: number;
  week: number;
  month: number;
};

type DeleteInterviewDialogState = ScheduledInterview | null;
type SuccessNoticeState = {
  title: string;
  message: string;
} | null;

function SidebarIcon({ type }: { type: "calendar" | "dashboard" | "hire" | "file" | "help" | "interview" | "memory" }) {
  if (type === "memory") {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M9 5.5A2.5 2.5 0 0 1 11.5 3h1A2.5 2.5 0 0 1 15 5.5V6h1.5A2.5 2.5 0 0 1 19 8.5v9a2.5 2.5 0 0 1-2.5 2.5h-9A2.5 2.5 0 0 1 5 17.5v-9A2.5 2.5 0 0 1 7.5 6H9Z" />
        <path d="M9 6h6" />
        <path d="M12 10v4" />
        <path d="M10 12h4" />
      </svg>
    );
  }
  if (type === "interview") {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M7 6h10a3 3 0 0 1 3 3v6a3 3 0 0 1-3 3h-6l-4 3v-3H7a3 3 0 0 1-3-3V9a3 3 0 0 1 3-3Z" />
        <path d="M9 11h6" />
        <path d="M9 14h4" />
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
  if (type === "help") {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18Z" />
        <path d="M9.4 9.2a2.7 2.7 0 1 1 4.2 2.2c-.9.6-1.6 1.1-1.6 2.1" />
        <path d="M12 16.8h.01" />
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
        <path d="M8 12h3" />
        <path d="M13 12h3" />
        <path d="M8 16h3" />
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

function CalendarStatIcon({ type }: { type: "all" | "upcoming" | "week" | "month" }) {
  if (type === "upcoming") {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M12 5v7l4 2" />
        <circle cx="12" cy="12" r="8" />
      </svg>
    );
  }
  if (type === "week") {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M7 3.5v3" />
        <path d="M17 3.5v3" />
        <path d="M4.5 8.5h15" />
        <path d="M6.5 5.5h11a2 2 0 0 1 2 2v10a3 3 0 0 1-3 3h-9a3 3 0 0 1-3-3v-10a2 2 0 0 1 2-2Z" />
        <path d="M8.5 13H15.5" />
      </svg>
    );
  }
  if (type === "month") {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M7 3.5v3" />
        <path d="M17 3.5v3" />
        <path d="M4.5 8.5h15" />
        <path d="M6.5 5.5h11a2 2 0 0 1 2 2v10a3 3 0 0 1-3 3h-9a3 3 0 0 1-3-3v-10a2 2 0 0 1 2-2Z" />
        <path d="M8 12h3" />
        <path d="M13 12h3" />
        <path d="M8 16h8" />
      </svg>
    );
  }
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M4 7.5A2.5 2.5 0 0 1 6.5 5h11A2.5 2.5 0 0 1 20 7.5v9a2.5 2.5 0 0 1-2.5 2.5h-11A2.5 2.5 0 0 1 4 16.5Z" />
      <path d="M8 10h8" />
      <path d="M8 14h5" />
    </svg>
  );
}

const calendarTranslations = {
  fr: {
    mainMenu: "Menu principal",
    sidebarWorkspace: "Espace de travail",
    sidebarReports: "Rapports",
    sidebarTools: "Outils",
    analytics: "Analytique",
    interview: "Interview",
    hr: "RH",
    insights: "Insights",
    history: "Historique",
    calendar: "Calendrier",
    help: "Help",
    lightMode: "Clair",
    darkMode: "Sombre",
    title: "Calendrier des entretiens",
    subtitle: "Planifiez un entretien a une date precise et gardez une vue claire sur les rendez-vous a venir.",
    modalSubtitle: "Choisissez le candidat, la date et l'heure de l'entretien.",
    candidateName: "Nom du candidat",
    candidateEmail: "Email du candidat",
    date: "Date",
    time: "Heure",
    create: "Ajouter l'entretien",
    upcoming: "Entretiens a venir",
    dayAgenda: "Agenda du jour selectionne",
    monthView: "Vue mensuelle",
    thisMonth: "ce mois",
    thisWeek: "cette semaine",
    planned: "planifies",
    nextMeeting: "Prochain entretien",
    nonePlanned: "Aucun entretien planifie pour le moment.",
    noDayMeeting: "Aucun entretien pour cette date.",
    reservedDate: "Date reservee",
    moreInterviews: "autre(s) entretien(s)",
    clearFilter: "Effacer",
    cancel: "Annuler",
    close: "Fermer",
    edit: "Modifier",
    update: "Mettre a jour",
    editInterviewTitle: "Modifier l'entretien",
    editInterviewSubtitle: "Modifiez la date, l'heure ou les informations du candidat.",
    delete: "Supprimer",
    deleteInterviewTitle: "Supprimer l'entretien",
    deleteInterviewSubtitle: "Consultez les details de l'entretien avant de supprimer definitivement ce rendez-vous.",
    deleteInterviewConfirm: "Supprimer cet entretien",
    candidateFallback: "Candidat",
    successSaved: "Entretien ajoute au calendrier. L'email de confirmation est envoye et un rappel sera envoye 1 heure avant.",
    successSavedNoReminder: "Entretien ajoute au calendrier. Configurez SMTP dans le backend pour activer le rappel email.",
    successSavedEmailFailed: "Entretien ajoute au calendrier, mais l'email de confirmation n'a pas pu etre envoye. Verifiez SMTP et les logs du service calendar.",
    successTitle: "Entretien planifie",
    successUpdated: "L'entretien a ete modifie avec succes.",
    successUpdatedTitle: "Entretien modifie",
    successDeleted: "L'entretien a ete supprime avec succes.",
    successDeletedTitle: "Entretien supprime",
    errorFuture: "Choisissez une date et une heure futures.",
    errorRequired: "Renseignez au minimum le nom et l'email du candidat.",
    errorEmail: "Renseignez une adresse email valide pour le candidat.",
    errorLoad: "Impossible de charger les entretiens planifies.",
    errorSave: "Impossible d'enregistrer cet entretien pour le moment.",
    errorUpdate: "Impossible de modifier cet entretien pour le moment.",
    errorDelete: "Impossible de supprimer cet entretien pour le moment.",
    errorDateAlreadyPlanned: "Cette date contient deja un entretien planifie. Choisissez une autre date ou consultez l'agenda ci-dessous.",
    noticeTitle: "Date non disponible",
    confirm: "Compris",
    statsAll: "Tous les entretiens",
    statsUpcoming: "A venir",
    statsWeek: "Cette semaine",
    statsRemote: "Distanciel",
    reminderReady: "Rappel email actif 1 h avant l'entretien.",
    reminderDisabled: "Rappel email inactif tant que SMTP n'est pas configure.",
  },
  en: {
    mainMenu: "Main menu",
    sidebarWorkspace: "Workspace",
    sidebarReports: "Reports",
    sidebarTools: "Tools",
    analytics: "Analytics",
    interview: "Interview",
    hr: "HR",
    insights: "Insights",
    history: "History",
    calendar: "Calendar",
    help: "Help",
    lightMode: "Light",
    darkMode: "Dark",
    title: "Interview calendar",
    subtitle: "Plan interviews on a precise date and keep a clear overview of upcoming appointments.",
    modalSubtitle: "Choose the candidate, date, and interview time.",
    candidateName: "Candidate name",
    candidateEmail: "Candidate email",
    date: "Date",
    time: "Time",
    create: "Add interview",
    upcoming: "Upcoming interviews",
    dayAgenda: "Selected day agenda",
    monthView: "Month view",
    thisMonth: "this month",
    thisWeek: "this week",
    planned: "planned",
    nextMeeting: "Next interview",
    nonePlanned: "No interview has been planned yet.",
    noDayMeeting: "No interview on this date.",
    reservedDate: "Reserved date",
    moreInterviews: "more interview(s)",
    clearFilter: "Clear",
    cancel: "Cancel",
    close: "Close",
    edit: "Edit",
    update: "Update",
    editInterviewTitle: "Edit interview",
    editInterviewSubtitle: "Change the date, time, or candidate details.",
    delete: "Delete",
    deleteInterviewTitle: "Delete interview",
    deleteInterviewSubtitle: "Review the interview details before permanently deleting this appointment.",
    deleteInterviewConfirm: "Delete this interview",
    candidateFallback: "Candidate",
    successSaved: "Interview added to the calendar. The confirmation email was sent and a reminder will be sent 1 hour before.",
    successSavedNoReminder: "Interview added to the calendar. Configure SMTP in the backend to enable email reminders.",
    successSavedEmailFailed: "Interview added to the calendar, but the confirmation email could not be sent. Check SMTP and the calendar service logs.",
    successTitle: "Interview planned",
    successUpdated: "The interview was updated successfully.",
    successUpdatedTitle: "Interview updated",
    successDeleted: "The interview was deleted successfully.",
    successDeletedTitle: "Interview deleted",
    errorFuture: "Choose a future date and time.",
    errorRequired: "Enter at least the candidate name and email.",
    errorEmail: "Enter a valid candidate email address.",
    errorLoad: "Unable to load scheduled interviews.",
    errorSave: "Unable to save this interview right now.",
    errorUpdate: "Unable to update this interview right now.",
    errorDelete: "Unable to delete this interview right now.",
    errorDateAlreadyPlanned: "This date already has a planned interview. Choose another date or review the agenda below.",
    noticeTitle: "Date unavailable",
    confirm: "OK",
    statsAll: "All interviews",
    statsUpcoming: "Upcoming",
    statsWeek: "This week",
    statsRemote: "Remote",
    reminderReady: "Email reminder is active 1 hour before the interview.",
    reminderDisabled: "Email reminder stays off until SMTP is configured.",
  },
} as const;

function startOfMonth(value: Date) {
  return new Date(value.getFullYear(), value.getMonth(), 1);
}

function addMonths(value: Date, amount: number) {
  return new Date(value.getFullYear(), value.getMonth() + amount, 1);
}

function padNumber(value: number) {
  return value.toString().padStart(2, "0");
}

function buildDateKey(value: string | Date) {
  const parsed = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(parsed.getTime())) return "";
  return `${parsed.getFullYear()}-${padNumber(parsed.getMonth() + 1)}-${padNumber(parsed.getDate())}`;
}

function isSameMonth(left: Date, right: Date) {
  return left.getFullYear() === right.getFullYear() && left.getMonth() === right.getMonth();
}

function buildWeekdayLabels(locale: string) {
  const formatter = new Intl.DateTimeFormat(locale, { weekday: "short" });
  const mondayReference = new Date(2024, 0, 1);
  return Array.from({ length: 7 }, (_, index) => {
    const current = new Date(mondayReference);
    current.setDate(mondayReference.getDate() + index);
    return formatter.format(current).replace(".", "").slice(0, 2);
  });
}

function buildCalendarCells(monthDate: Date, interviews: ScheduledInterview[]) {
  const monthStart = startOfMonth(monthDate);
  const monthStartWeekday = (monthStart.getDay() + 6) % 7;
  const gridStart = new Date(monthStart);
  gridStart.setDate(monthStart.getDate() - monthStartWeekday);
  const byDate = new Map<string, ScheduledInterview[]>();

  interviews.forEach((item) => {
    const key = buildDateKey(item.scheduledAt);
    if (!key) return;
    const existing = byDate.get(key) || [];
    existing.push(item);
    byDate.set(key, existing);
  });

  const todayKey = buildDateKey(new Date());
  const cells: CalendarCell[] = [];

  for (let index = 0; index < 42; index += 1) {
    const current = new Date(gridStart);
    current.setDate(gridStart.getDate() + index);
    const dateKey = buildDateKey(current);
    cells.push({
      key: `${dateKey}-${index}`,
      dateKey,
      dayNumber: current.getDate(),
      inCurrentMonth: isSameMonth(current, monthDate),
      isToday: dateKey === todayKey,
      items: byDate.get(dateKey) || [],
    });
  }

  return cells;
}

function normalizePlatformProfile(value: unknown): PlatformProfile | null {
  if (!value || typeof value !== "object") return null;
  const profile = value as { name?: unknown; fullName?: unknown; email?: unknown };
  const name = String(profile.name || profile.fullName || "").trim();
  const email = String(profile.email || "").trim();
  if (!name && !email) return null;
  return { name, email };
}

function getDefaultFormState(profile: PlatformProfile | null = null) {
  const now = new Date();
  now.setHours(now.getHours() + 1, 0, 0, 0);
  return {
    candidateName: profile?.name || "",
    candidateEmail: profile?.email || "",
    date: `${now.getFullYear()}-${padNumber(now.getMonth() + 1)}-${padNumber(now.getDate())}`,
    time: `${padNumber(now.getHours())}:00`,
  } satisfies ScheduleFormState;
}

function readUrlPlatformProfile() {
  if (typeof window === "undefined") return null;
  const params = new URLSearchParams(window.location.search);
  return normalizePlatformProfile({
    name: params.get("profileName"),
    email: params.get("profileEmail"),
  });
}

function buildFormStateForDate(dateKey: string, current: ScheduleFormState) {
  const parsed = new Date(`${dateKey}T00:00:00`);
  if (Number.isNaN(parsed.getTime())) {
    return current;
  }

  const today = new Date();
  const isToday = buildDateKey(parsed) === buildDateKey(today);
  const nextHour = new Date();
  nextHour.setHours(nextHour.getHours() + 1, 0, 0, 0);

  return {
    ...current,
    date: dateKey,
    time: isToday ? `${padNumber(nextHour.getHours())}:${padNumber(nextHour.getMinutes())}` : current.time || "09:00",
  } satisfies ScheduleFormState;
}

function buildFormStateFromInterview(interview: ScheduledInterview) {
  const parsed = new Date(interview.scheduledAt);
  const fallback = getDefaultFormState();
  return {
    candidateName: interview.candidateName || "",
    candidateEmail: interview.candidateEmail || "",
    date: Number.isNaN(parsed.getTime()) ? fallback.date : buildDateKey(parsed),
    time: Number.isNaN(parsed.getTime())
      ? fallback.time
      : `${padNumber(parsed.getHours())}:${padNumber(parsed.getMinutes())}`,
  } satisfies ScheduleFormState;
}

function formatInterviewDate(value: string, locale: string) {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return "--";
  return new Intl.DateTimeFormat(locale, {
    weekday: "short",
    day: "numeric",
    month: "long",
    hour: "2-digit",
    minute: "2-digit",
  }).format(parsed);
}

function formatInterviewTime(value: string, locale: string) {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return "--:--";
  return new Intl.DateTimeFormat(locale, {
    hour: "2-digit",
    minute: "2-digit",
  }).format(parsed);
}

function formatInterviewDay(value: string, locale: string) {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return "--";
  return new Intl.DateTimeFormat(locale, {
    weekday: "short",
    day: "numeric",
    month: "short",
  }).format(parsed);
}

function looksLikeEmail(value: string) {
  const clean = value.trim();
  if (!clean || !clean.includes("@")) return false;
  const [localPart, domain] = clean.split("@");
  return Boolean(localPart && domain && domain.includes(".") && !clean.includes(" "));
}

export default function CalendarPage() {
  const [language, setLanguage] = useState<Language>("fr");
  const [theme, setTheme] = useState<Theme>("light");
  const [interviews, setInterviews] = useState<ScheduledInterview[]>([]);
  const [remindersEnabled, setRemindersEnabled] = useState(false);
  const [statsReady, setStatsReady] = useState(false);
  const [animatedStats, setAnimatedStats] = useState<AnimatedCalendarStats>({
    all: 0,
    upcoming: 0,
    week: 0,
    month: 0,
  });
  const [platformProfile, setPlatformProfile] = useState<PlatformProfile | null>(null);
  const [form, setForm] = useState<ScheduleFormState>(() => getDefaultFormState());
  const [calendarMonth, setCalendarMonth] = useState(() => startOfMonth(new Date()));
  const [selectedDateKey, setSelectedDateKey] = useState<string | null>(null);
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [calendarNotice, setCalendarNotice] = useState("");
  const [deleteDialogInterview, setDeleteDialogInterview] = useState<DeleteInterviewDialogState>(null);
  const [editDialogInterview, setEditDialogInterview] = useState<ScheduledInterview | null>(null);
  const [successNotice, setSuccessNotice] = useState<SuccessNoticeState>(null);
  const [errorMessage, setErrorMessage] = useState("");
  const [editForm, setEditForm] = useState<ScheduleFormState>(() => getDefaultFormState());
  const hasCompletedInitialStatsAnimationRef = useRef(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const storedTheme = window.localStorage.getItem("report-dashboard-theme");
    if (storedTheme === "light" || storedTheme === "dark") {
      setTheme(storedTheme);
    } else if (window.matchMedia("(prefers-color-scheme: dark)").matches) {
      setTheme("dark");
    }

    const storedLanguage = window.localStorage.getItem("dashboard-language");
    if (storedLanguage === "fr" || storedLanguage === "en") {
      setLanguage(storedLanguage);
    }
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const profile = readUrlPlatformProfile();
    if (!profile) return;
    setPlatformProfile(profile);
    setForm((current) => ({
      ...current,
      candidateName: current.candidateName.trim() ? current.candidateName : profile.name,
      candidateEmail: current.candidateEmail.trim() ? current.candidateEmail : profile.email,
    }));
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    window.localStorage.setItem("report-dashboard-theme", theme);
  }, [theme]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    window.localStorage.setItem("dashboard-language", language);
  }, [language]);

  useEffect(() => {
    if (!createModalOpen && !calendarNotice && !deleteDialogInterview && !editDialogInterview && !successNotice) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setCreateModalOpen(false);
        setEditDialogInterview(null);
        setCalendarNotice("");
        setSuccessNotice(null);
        setDeleteDialogInterview(null);
        setErrorMessage("");
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [calendarNotice, createModalOpen, deleteDialogInterview, editDialogInterview, successNotice]);

  const copy = calendarTranslations[language];
  const locale = language === "fr" ? "fr-FR" : "en-US";
  const weekdayLabels = useMemo(() => buildWeekdayLabels(locale), [locale]);
  const plannedInterviews = useMemo(() => interviews.filter((item) => item.status === "planned"), [interviews]);
  const calendarCells = useMemo(() => buildCalendarCells(calendarMonth, plannedInterviews), [calendarMonth, plannedInterviews]);
  const upcomingInterviews = useMemo(
    () => plannedInterviews.filter((item) => new Date(item.scheduledAt).getTime() >= Date.now()),
    [plannedInterviews]
  );
  const nextInterview = upcomingInterviews[0] || null;
  const now = Date.now();
  const weekAhead = now + 7 * 24 * 60 * 60 * 1000;
  const thisWeekCount = upcomingInterviews.filter((item) => {
    const scheduledAt = new Date(item.scheduledAt).getTime();
    return scheduledAt >= now && scheduledAt <= weekAhead;
  }).length;
  const currentMonthStart = startOfMonth(new Date());
  const nextMonthStart = addMonths(currentMonthStart, 1);
  const thisMonthCount = upcomingInterviews.filter((item) => {
    const scheduledAt = new Date(item.scheduledAt).getTime();
    return scheduledAt >= currentMonthStart.getTime() && scheduledAt < nextMonthStart.getTime();
  }).length;
  const selectedDayInterviews = useMemo(() => {
    if (!selectedDateKey) return upcomingInterviews;
    return plannedInterviews.filter((item) => buildDateKey(item.scheduledAt) === selectedDateKey);
  }, [plannedInterviews, selectedDateKey, upcomingInterviews]);
  const selectedDayLabel = useMemo(() => {
    if (!selectedDateKey) return "";
    const parsed = new Date(`${selectedDateKey}T00:00:00`);
    if (Number.isNaN(parsed.getTime())) return "";
    return new Intl.DateTimeFormat(locale, { weekday: "long", day: "numeric", month: "long" }).format(parsed);
  }, [locale, selectedDateKey]);
  const targetStats = useMemo(
    () => ({
      all: plannedInterviews.length,
      upcoming: upcomingInterviews.length,
      week: thisWeekCount,
      month: thisMonthCount,
    }),
    [plannedInterviews.length, upcomingInterviews.length, thisWeekCount, thisMonthCount]
  );

  const loadInterviews = async () => {
    try {
      const response = await fetch("/api/rh/interviews", { method: "GET", cache: "no-store" });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(String(payload?.detail || payload?.error || copy.errorLoad));
      }
      setInterviews(Array.isArray(payload?.interviews) ? payload.interviews : []);
      setRemindersEnabled(Boolean(payload?.reminders?.enabled));
      setErrorMessage("");
    } catch (error) {
      setErrorMessage((error as Error).message || copy.errorLoad);
    } finally {
      setStatsReady(true);
    }
  };

  useEffect(() => {
    void loadInterviews();
  }, []);

  useEffect(() => {
    if (!statsReady) return;

    if (hasCompletedInitialStatsAnimationRef.current) {
      setAnimatedStats(targetStats);
      return;
    }

    if (typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setAnimatedStats(targetStats);
      hasCompletedInitialStatsAnimationRef.current = true;
      return;
    }

    const start = performance.now();
    const duration = 850;
    let frameId = 0;

    const tick = (nowValue: number) => {
      const progress = Math.min((nowValue - start) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);

      setAnimatedStats({
        all: Math.round(targetStats.all * eased),
        upcoming: Math.round(targetStats.upcoming * eased),
        week: Math.round(targetStats.week * eased),
        month: Math.round(targetStats.month * eased),
      });

      if (progress < 1) {
        frameId = window.requestAnimationFrame(tick);
      } else {
        hasCompletedInitialStatsAnimationRef.current = true;
      }
    };

    frameId = window.requestAnimationFrame(tick);
    return () => window.cancelAnimationFrame(frameId);
  }, [statsReady, targetStats]);

  const handleCreateInterview = async () => {
    setSuccessNotice(null);
    setErrorMessage("");

    if (!form.candidateName.trim() || !form.candidateEmail.trim()) {
      setErrorMessage(copy.errorRequired);
      return;
    }
    if (!looksLikeEmail(form.candidateEmail)) {
      setErrorMessage(copy.errorEmail);
      return;
    }

    const scheduledAt = new Date(`${form.date}T${form.time}:00`);
    if (Number.isNaN(scheduledAt.getTime()) || scheduledAt.getTime() <= Date.now()) {
      setErrorMessage(copy.errorFuture);
      return;
    }

    try {
      const response = await fetch("/api/rh/interviews", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          candidate_name: form.candidateName.trim(),
          candidate_email: form.candidateEmail.trim(),
          scheduled_at: scheduledAt.toISOString(),
        }),
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(String(payload?.detail || payload?.error || copy.errorSave));
      }

      setInterviews(Array.isArray(payload?.interviews) ? payload.interviews : []);
      const nextRemindersEnabled = Boolean(payload?.reminders?.enabled);
      const confirmationEmail = payload?.emails?.confirmation;
      const confirmationEmailFailed = Boolean(confirmationEmail?.enabled) && !Boolean(confirmationEmail?.sent);
      setRemindersEnabled(nextRemindersEnabled);
      setForm(getDefaultFormState(platformProfile));
      setCalendarMonth(startOfMonth(scheduledAt));
      setSelectedDateKey(buildDateKey(scheduledAt));
      setSuccessNotice({
        title: copy.successTitle,
        message: confirmationEmailFailed
          ? copy.successSavedEmailFailed
          : nextRemindersEnabled
            ? copy.successSaved
            : copy.successSavedNoReminder,
      });
      setCreateModalOpen(false);
    } catch (error) {
      setErrorMessage((error as Error).message || copy.errorSave);
    }
  };

  const handleDeleteInterview = async (interviewId: string) => {
    setSuccessNotice(null);
    setErrorMessage("");
    try {
      const response = await fetch(`/api/rh/interviews/${encodeURIComponent(interviewId)}`, {
        method: "DELETE",
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(String(payload?.detail || payload?.error || copy.errorDelete));
      }
      setInterviews(Array.isArray(payload?.interviews) ? payload.interviews : []);
      setRemindersEnabled(Boolean(payload?.reminders?.enabled));
      setDeleteDialogInterview(null);
      setSuccessNotice({
        title: copy.successDeletedTitle,
        message: copy.successDeleted,
      });
    } catch (error) {
      setErrorMessage((error as Error).message || copy.errorDelete);
    }
  };

  const openEditModal = (interview: ScheduledInterview) => {
    setSuccessNotice(null);
    setErrorMessage("");
    setEditForm(buildFormStateFromInterview(interview));
    setEditDialogInterview(interview);
  };

  const handleUpdateInterview = async () => {
    if (!editDialogInterview) return;
    setSuccessNotice(null);
    setErrorMessage("");

    if (!editForm.candidateName.trim() || !editForm.candidateEmail.trim()) {
      setErrorMessage(copy.errorRequired);
      return;
    }
    if (!looksLikeEmail(editForm.candidateEmail)) {
      setErrorMessage(copy.errorEmail);
      return;
    }

    const scheduledAt = new Date(`${editForm.date}T${editForm.time}:00`);
    if (Number.isNaN(scheduledAt.getTime()) || scheduledAt.getTime() <= Date.now()) {
      setErrorMessage(copy.errorFuture);
      return;
    }

    try {
      const response = await fetch(`/api/rh/interviews/${encodeURIComponent(editDialogInterview.id)}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          candidate_name: editForm.candidateName.trim(),
          candidate_email: editForm.candidateEmail.trim(),
          scheduled_at: scheduledAt.toISOString(),
        }),
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(String(payload?.detail || payload?.error || copy.errorUpdate));
      }

      setInterviews(Array.isArray(payload?.interviews) ? payload.interviews : []);
      setRemindersEnabled(Boolean(payload?.reminders?.enabled));
      setCalendarMonth(startOfMonth(scheduledAt));
      setSelectedDateKey(buildDateKey(scheduledAt));
      setEditDialogInterview(null);
      setEditForm(getDefaultFormState());
      setSuccessNotice({
        title: copy.successUpdatedTitle,
        message: copy.successUpdated,
      });
    } catch (error) {
      setErrorMessage((error as Error).message || copy.errorUpdate);
    }
  };

  const openCreateModalForDate = (dateKey: string, hasExistingInterview: boolean) => {
    const selectedDate = new Date(`${dateKey}T00:00:00`);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    if (Number.isNaN(selectedDate.getTime()) || selectedDate.getTime() < today.getTime()) {
      setSuccessNotice(null);
      setErrorMessage(copy.errorFuture);
      return;
    }

    setSuccessNotice(null);
    setSelectedDateKey(dateKey);
    if (hasExistingInterview) {
      setCreateModalOpen(false);
      setCalendarNotice(copy.errorDateAlreadyPlanned);
      return;
    }

    setCalendarNotice("");
    setErrorMessage("");
    setForm((current) => buildFormStateForDate(dateKey, current));
    setCreateModalOpen(true);
  };

  return (
    <div className={`${styles.shell} ${theme === "dark" ? styles.themeDark : styles.themeLight}`}>
      <aside className={styles.sidebar}>
        <div className={styles.sidebarTop}>
          <Image className={styles.logoImage} src={logoImage} alt="SUBUL" priority />
        </div>

        <div className={styles.menuBlock}>
          <p className={styles.menuTitle}>{copy.mainMenu}</p>
          <nav className={styles.nav}>
            <span className={styles.navGroupTitle}>{copy.sidebarWorkspace}</span>
            <Link className={styles.navItem} href="/dashboard">
              <SidebarIcon type="dashboard" />
              {copy.analytics}
            </Link>
            <Link className={styles.navItem} href="/">
              <SidebarIcon type="interview" />
              {copy.interview}
            </Link>
            <span className={styles.navGroupTitle}>{copy.sidebarReports}</span>
            <button type="button" className={`${styles.navItem} ${styles.navButton} ${styles.navItemDisabled}`} disabled>
              <SidebarIcon type="file" />
              {copy.hr}
            </button>
            <button type="button" className={`${styles.navItem} ${styles.navButton} ${styles.navItemDisabled}`} disabled>
              <SidebarIcon type="hire" />
              {copy.insights}
            </button>
            <span className={styles.navGroupTitle}>{copy.sidebarTools}</span>
            <Link className={styles.navItem} href="/history">
              <SidebarIcon type="memory" />
              {copy.history}
            </Link>
            <Link className={`${styles.navItem} ${styles.navItemActive}`} href="/calendar">
              <SidebarIcon type="calendar" />
              {copy.calendar}
            </Link>
            <Link className={styles.navItem} href="/help">
              <SidebarIcon type="help" />
              {copy.help}
            </Link>
          </nav>
        </div>
      </aside>

      <main className={styles.main}>
        <section className={`${styles.helpHero} ${styles.calendarHero}`}>
          <div className={styles.helpHeroMain}>
            <div className={styles.helpHeroCopy}>
              <h1 className={`${styles.pageTitle} ${styles.calendarPageTitle}`}>{copy.title}</h1>
              <p className={styles.pageSubtitle}>{copy.subtitle}</p>
            </div>
          </div>
          <div className={styles.calendarHeroSide}>
            <div className={`${styles.helpHeroStats} ${styles.calendarHeroStats}`}>
              <article className={styles.calendarControlsCard}>
                <div className={styles.calendarControlsStack}>
                  <div className={`${styles.themeToggle} ${styles.compactToggle}`}>
                    <button
                      type="button"
                      className={`${styles.themeButton} ${styles.compactToggleButton} ${theme === "light" ? styles.themeButtonActive : ""}`}
                      onClick={() => setTheme("light")}
                      aria-label={copy.lightMode}
                      title={copy.lightMode}
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
                      className={`${styles.themeButton} ${styles.compactToggleButton} ${theme === "dark" ? styles.themeButtonActive : ""}`}
                      onClick={() => setTheme("dark")}
                      aria-label={copy.darkMode}
                      title={copy.darkMode}
                    >
                      <svg viewBox="0 0 24 24" aria-hidden="true">
                        <path d="M20 14.5A8.5 8.5 0 1 1 9.5 4 7 7 0 0 0 20 14.5Z" />
                      </svg>
                    </button>
                  </div>
                  <div className={`${styles.languageToggle} ${styles.compactToggle}`}>
                    <button
                      type="button"
                      className={`${styles.languageButton} ${styles.compactToggleButton} ${language === "fr" ? styles.languageButtonActive : ""}`}
                      onClick={() => setLanguage("fr")}
                    >
                      FR
                    </button>
                    <button
                      type="button"
                      className={`${styles.languageButton} ${styles.compactToggleButton} ${language === "en" ? styles.languageButtonActive : ""}`}
                      onClick={() => setLanguage("en")}
                    >
                      EN
                    </button>
                  </div>
                </div>
              </article>

              <article className={`${styles.calendarSummaryCard} ${styles.calendarSummaryCardAll}`}>
                <span className={styles.calendarSummaryIcon} aria-hidden="true">
                  <CalendarStatIcon type="all" />
                </span>
                <div className={styles.calendarSummaryCopy}>
                  <span className={styles.calendarSummaryLabel}>{copy.statsAll}</span>
                  <strong className={styles.calendarSummaryValue}>{animatedStats.all}</strong>
                  <span className={styles.calendarSummaryMeta}>{copy.planned}</span>
                </div>
              </article>
              <article className={`${styles.calendarSummaryCard} ${styles.calendarSummaryCardUpcoming}`}>
                <span className={styles.calendarSummaryIcon} aria-hidden="true">
                  <CalendarStatIcon type="upcoming" />
                </span>
                <div className={styles.calendarSummaryCopy}>
                  <span className={styles.calendarSummaryLabel}>{copy.statsUpcoming}</span>
                  <strong className={styles.calendarSummaryValue}>{animatedStats.upcoming}</strong>
                  <span className={styles.calendarSummaryMeta}>{copy.planned}</span>
                </div>
              </article>
              <article className={`${styles.calendarSummaryCard} ${styles.calendarSummaryCardWeek}`}>
                <span className={styles.calendarSummaryIcon} aria-hidden="true">
                  <CalendarStatIcon type="week" />
                </span>
                <div className={styles.calendarSummaryCopy}>
                  <span className={styles.calendarSummaryLabel}>{copy.statsWeek}</span>
                  <strong className={styles.calendarSummaryValue}>{animatedStats.week}</strong>
                  <span className={styles.calendarSummaryMeta}>{copy.thisWeek}</span>
                </div>
              </article>
              <article className={`${styles.calendarSummaryCard} ${styles.calendarSummaryCardMonth}`}>
                <span className={styles.calendarSummaryIcon} aria-hidden="true">
                  <CalendarStatIcon type="month" />
                </span>
                <div className={styles.calendarSummaryCopy}>
                  <span className={styles.calendarSummaryLabel}>{copy.thisMonth}</span>
                  <strong className={styles.calendarSummaryValue}>{animatedStats.month}</strong>
                  <span className={styles.calendarSummaryMeta}>{copy.planned}</span>
                </div>
              </article>
            </div>
          </div>
        </section>

        <section className={styles.calendarPageToolbar}>
          {errorMessage ? <div className={styles.calendarMessageError}>{errorMessage}</div> : null}
        </section>

        <section className={styles.calendarPageGrid}>
          <article className={`${styles.panelCard} ${styles.calendarMonthCard}`}>
            <div className={styles.panelHead}>
              <h3>{copy.monthView}</h3>
              <div className={styles.calendarMonthNav}>
                <button type="button" className={styles.toolbarActionButton} onClick={() => setCalendarMonth((current) => addMonths(current, -1))}>
                  <svg viewBox="0 0 24 24" aria-hidden="true">
                    <path d="m14.5 6.5-5 5 5 5" />
                  </svg>
                </button>
                <span className={styles.legendPill}>{new Intl.DateTimeFormat(locale, { month: "long", year: "numeric" }).format(calendarMonth)}</span>
                <button type="button" className={styles.toolbarActionButton} onClick={() => setCalendarMonth((current) => addMonths(current, 1))}>
                  <svg viewBox="0 0 24 24" aria-hidden="true">
                    <path d="m9.5 6.5 5 5-5 5" />
                  </svg>
                </button>
              </div>
            </div>

            <div className={styles.calendarWeekdays}>
              {weekdayLabels.map((label) => (
                <span key={label}>{label}</span>
              ))}
            </div>

            <div className={styles.calendarMonthGrid}>
              {calendarCells.map((cell) => {
                const firstInterview = cell.items[0];
                return (
                  <button
                    key={cell.key}
                    type="button"
                    className={`${styles.calendarDayCell} ${cell.inCurrentMonth ? "" : styles.calendarDayOutside} ${
                      cell.isToday ? styles.calendarDayToday : ""
                    } ${cell.items.length ? styles.calendarDayBusy : ""} ${
                      selectedDateKey === cell.dateKey ? styles.calendarDaySelected : ""
                    }`.trim()}
                    disabled={!cell.inCurrentMonth}
                    onClick={() => {
                      if (!cell.inCurrentMonth) return;
                      openCreateModalForDate(cell.dateKey, cell.items.length > 0);
                    }}
                  >
                    <strong>{cell.dayNumber}</strong>
                    {cell.items.length ? <span>{cell.items.length}</span> : null}
                    {firstInterview ? (
                      <div className={styles.calendarReservedTooltip} role="tooltip">
                        <div className={styles.calendarReservedTooltipHead}>
                          <small>{copy.reservedDate}</small>
                          <strong>{firstInterview.candidateName || copy.candidateFallback}</strong>
                        </div>
                        <div className={styles.calendarReservedTooltipRows}>
                          <span>{firstInterview.candidateEmail}</span>
                          <span>{formatInterviewDate(firstInterview.scheduledAt, locale)}</span>
                        </div>
                        {cell.items.length > 1 ? (
                          <em>
                            +{cell.items.length - 1} {copy.moreInterviews}
                          </em>
                        ) : null}
                      </div>
                    ) : null}
                  </button>
                );
              })}
            </div>
          </article>
        </section>

        <section className={styles.calendarAgendaGrid}>
          <article className={`${styles.panelCard} ${styles.calendarAgendaCard}`}>
            <div className={styles.panelHead}>
              <h3>{selectedDateKey ? copy.dayAgenda : copy.upcoming}</h3>
              {selectedDateKey ? (
                <button type="button" className={styles.ghostButton} onClick={() => setSelectedDateKey(null)}>
                  {copy.clearFilter}
                </button>
              ) : null}
            </div>

            <div className={styles.calendarAgendaSubhead}>
              <span>{selectedDayLabel || copy.nextMeeting}</span>
              {nextInterview ? <strong>{formatInterviewDate(nextInterview.scheduledAt, locale)}</strong> : null}
            </div>

            <div className={styles.calendarAgendaList}>
              {selectedDayInterviews.length ? (
                selectedDayInterviews.map((item) => (
                  <article key={item.id} className={styles.calendarAgendaItem}>
                    <div className={styles.calendarAgendaDateRail}>
                      <strong>{formatInterviewTime(item.scheduledAt, locale)}</strong>
                      <span>{formatInterviewDay(item.scheduledAt, locale)}</span>
                    </div>
                    <div className={styles.calendarAgendaBody}>
                      <div className={styles.calendarAgendaItemTop}>
                        <div>
                          <strong>{item.candidateName || copy.candidateFallback}</strong>
                        </div>
                        <div className={styles.calendarAgendaActions}>
                          <button type="button" className={styles.calendarIconButton} onClick={() => openEditModal(item)} aria-label={copy.edit} title={copy.edit}>
                            <svg viewBox="0 0 24 24" aria-hidden="true">
                              <path d="M6 18.5 7.1 14 16.6 4.5a2.4 2.4 0 0 1 3.4 3.4L10.5 17.4 6 18.5Z" />
                              <path d="m15.2 5.9 2.9 2.9" />
                              <path d="M5 21h14" />
                            </svg>
                          </button>
                          <button
                            type="button"
                            className={`${styles.calendarIconButton} ${styles.calendarIconButtonDanger}`}
                            onClick={() => setDeleteDialogInterview(item)}
                            aria-label={copy.delete}
                            title={copy.delete}
                          >
                            <svg viewBox="0 0 24 24" aria-hidden="true">
                              <path d="M5 7h14" />
                              <path d="M9.5 7V5.5A1.5 1.5 0 0 1 11 4h2a1.5 1.5 0 0 1 1.5 1.5V7" />
                              <path d="M17.5 7 16.7 19a2 2 0 0 1-2 2H9.3a2 2 0 0 1-2-2L6.5 7" />
                              <path d="m10 12 4 4" />
                              <path d="m14 12-4 4" />
                            </svg>
                          </button>
                        </div>
                      </div>
                      <div className={styles.calendarAgendaMeta}>
                        <span>{item.candidateEmail}</span>
                        <span>{formatInterviewDate(item.scheduledAt, locale)}</span>
                      </div>
                    </div>
                  </article>
                ))
              ) : (
                <div className={styles.calendarEmptyCard}>
                  {selectedDateKey ? copy.noDayMeeting : copy.nonePlanned}
                </div>
              )}
            </div>
          </article>
        </section>

        {createModalOpen ? (
          <div className={styles.calendarModalOverlay} role="dialog" aria-modal="true" aria-labelledby="calendar-modal-title">
            <button
              type="button"
              className={styles.calendarModalBackdrop}
              aria-label={copy.close}
              onClick={() => {
                setCreateModalOpen(false);
                setErrorMessage("");
              }}
            />

            <div className={styles.calendarModalCard}>
              <div className={styles.calendarModalHeader}>
                <div className={styles.calendarModalTitle}>
                  <h2 id="calendar-modal-title">{copy.create}</h2>
                  <p>{copy.modalSubtitle}</p>
                </div>
                <button
                  type="button"
                  className={styles.calendarModalClose}
                  onClick={() => {
                    setCreateModalOpen(false);
                    setErrorMessage("");
                  }}
                  aria-label={copy.close}
                >
                  <svg viewBox="0 0 24 24" aria-hidden="true">
                    <path d="M6 6l12 12" />
                    <path d="M18 6L6 18" />
                  </svg>
                </button>
              </div>

              <div className={styles.calendarFormGrid}>
                <label className={styles.calendarField}>
                  <span>{copy.candidateName}</span>
                  <input
                    value={form.candidateName}
                    onChange={(event) => setForm((current) => ({ ...current, candidateName: event.target.value }))}
                  />
                </label>
                <label className={styles.calendarField}>
                  <span>{copy.candidateEmail}</span>
                  <input
                    type="email"
                    value={form.candidateEmail}
                    onChange={(event) => setForm((current) => ({ ...current, candidateEmail: event.target.value }))}
                  />
                </label>
                <label className={styles.calendarField}>
                  <span>{copy.date}</span>
                  <input
                    type="date"
                    value={form.date}
                    disabled
                    aria-readonly="true"
                  />
                </label>
                <label className={styles.calendarField}>
                  <span>{copy.time}</span>
                  <input
                    type="time"
                    value={form.time}
                    onChange={(event) => setForm((current) => ({ ...current, time: event.target.value }))}
                  />
                </label>
              </div>

              {errorMessage ? <div className={styles.calendarMessageError}>{errorMessage}</div> : null}

              <div className={styles.calendarModalActions}>
                <button
                  type="button"
                  className={styles.ghostButton}
                  onClick={() => {
                    setCreateModalOpen(false);
                    setErrorMessage("");
                  }}
                >
                  {copy.cancel}
                </button>
                <button type="button" className={styles.primaryButton} onClick={handleCreateInterview}>
                  {copy.create}
                </button>
              </div>
            </div>
          </div>
        ) : null}

        {editDialogInterview ? (
          <div className={styles.calendarModalOverlay} role="dialog" aria-modal="true" aria-labelledby="calendar-edit-title">
            <button
              type="button"
              className={styles.calendarModalBackdrop}
              aria-label={copy.close}
              onClick={() => {
                setEditDialogInterview(null);
                setErrorMessage("");
              }}
            />

            <div className={styles.calendarModalCard}>
              <div className={styles.calendarModalHeader}>
                <div className={styles.calendarModalTitle}>
                  <h2 id="calendar-edit-title">{copy.editInterviewTitle}</h2>
                  <p>{copy.editInterviewSubtitle}</p>
                </div>
                <button
                  type="button"
                  className={styles.calendarModalClose}
                  onClick={() => {
                    setEditDialogInterview(null);
                    setErrorMessage("");
                  }}
                  aria-label={copy.close}
                >
                  <svg viewBox="0 0 24 24" aria-hidden="true">
                    <path d="M6 6l12 12" />
                    <path d="M18 6L6 18" />
                  </svg>
                </button>
              </div>

              <div className={styles.calendarFormGrid}>
                <label className={styles.calendarField}>
                  <span>{copy.candidateName}</span>
                  <input
                    value={editForm.candidateName}
                    onChange={(event) => setEditForm((current) => ({ ...current, candidateName: event.target.value }))}
                  />
                </label>
                <label className={styles.calendarField}>
                  <span>{copy.candidateEmail}</span>
                  <input
                    type="email"
                    value={editForm.candidateEmail}
                    onChange={(event) => setEditForm((current) => ({ ...current, candidateEmail: event.target.value }))}
                  />
                </label>
                <label className={styles.calendarField}>
                  <span>{copy.date}</span>
                  <input
                    type="date"
                    value={editForm.date}
                    onChange={(event) => setEditForm((current) => ({ ...current, date: event.target.value }))}
                  />
                </label>
                <label className={styles.calendarField}>
                  <span>{copy.time}</span>
                  <input
                    type="time"
                    value={editForm.time}
                    onChange={(event) => setEditForm((current) => ({ ...current, time: event.target.value }))}
                  />
                </label>
              </div>

              {errorMessage ? <div className={styles.calendarMessageError}>{errorMessage}</div> : null}

              <div className={styles.calendarModalActions}>
                <button
                  type="button"
                  className={styles.ghostButton}
                  onClick={() => {
                    setEditDialogInterview(null);
                    setErrorMessage("");
                  }}
                >
                  {copy.cancel}
                </button>
                <button type="button" className={styles.primaryButton} onClick={handleUpdateInterview}>
                  <svg viewBox="0 0 24 24" aria-hidden="true">
                    <path d="M5 19h4l10.2-10.2a2.4 2.4 0 0 0-3.4-3.4L5.6 15.6 5 19Z" />
                    <path d="m14.7 6.5 2.8 2.8" />
                    <path d="M4 21h16" />
                  </svg>
                  {copy.update}
                </button>
              </div>
            </div>
          </div>
        ) : null}

        {deleteDialogInterview ? (
          <div className={styles.calendarModalOverlay} role="dialog" aria-modal="true" aria-labelledby="calendar-delete-title">
            <button
              type="button"
              className={styles.calendarModalBackdrop}
              aria-label={copy.close}
              onClick={() => {
                setDeleteDialogInterview(null);
                setErrorMessage("");
              }}
            />

            <div className={styles.calendarModalCard}>
              <div className={styles.calendarModalHeader}>
                <div className={styles.calendarModalTitle}>
                  <h2 id="calendar-delete-title">{copy.deleteInterviewTitle}</h2>
                  <p>{copy.deleteInterviewSubtitle}</p>
                </div>
                <button
                  type="button"
                  className={styles.calendarModalClose}
                  onClick={() => {
                    setDeleteDialogInterview(null);
                    setErrorMessage("");
                  }}
                  aria-label={copy.close}
                >
                  <svg viewBox="0 0 24 24" aria-hidden="true">
                    <path d="M6 6l12 12" />
                    <path d="M18 6L6 18" />
                  </svg>
                </button>
              </div>

              {errorMessage ? <div className={styles.calendarMessageError}>{errorMessage}</div> : null}

              <div className={styles.calendarModalActions}>
                <button
                  type="button"
                  className={styles.ghostButton}
                  onClick={() => {
                    setDeleteDialogInterview(null);
                    setErrorMessage("");
                  }}
                >
                  {copy.cancel}
                </button>
                <button
                  type="button"
                  className={`${styles.primaryButton} ${styles.dangerButton}`}
                  onClick={() => handleDeleteInterview(deleteDialogInterview.id)}
                >
                  <svg viewBox="0 0 24 24" aria-hidden="true">
                    <path d="M4 7h16" />
                    <path d="M9 7V5.4A1.4 1.4 0 0 1 10.4 4h3.2A1.4 1.4 0 0 1 15 5.4V7" />
                    <path d="M18.2 7 17.4 19A2.1 2.1 0 0 1 15.3 21H8.7a2.1 2.1 0 0 1-2.1-2L5.8 7" />
                    <path d="M10 11.5v5" />
                    <path d="M14 11.5v5" />
                  </svg>
                  {copy.deleteInterviewConfirm}
                </button>
              </div>
            </div>
          </div>
        ) : null}

        {successNotice ? (
          <div className={styles.calendarModalOverlay} role="dialog" aria-modal="true" aria-labelledby="calendar-success-title">
            <button
              type="button"
              className={styles.calendarModalBackdrop}
              aria-label={copy.close}
              onClick={() => setSuccessNotice(null)}
            />

            <div className={styles.calendarModalCard}>
              <div className={styles.calendarModalHeader}>
                <div className={styles.calendarModalTitle}>
                  <h2 id="calendar-success-title">{successNotice.title}</h2>
                  <p>{successNotice.message}</p>
                </div>
                <button type="button" className={styles.calendarModalClose} onClick={() => setSuccessNotice(null)} aria-label={copy.close}>
                  <svg viewBox="0 0 24 24" aria-hidden="true">
                    <path d="M6 6l12 12" />
                    <path d="M18 6L6 18" />
                  </svg>
                </button>
              </div>

              <div className={styles.calendarModalActions}>
                <button type="button" className={styles.primaryButton} onClick={() => setSuccessNotice(null)}>
                  {copy.confirm}
                </button>
              </div>
            </div>
          </div>
        ) : null}

        {calendarNotice ? (
          <div className={styles.calendarModalOverlay} role="dialog" aria-modal="true" aria-labelledby="calendar-notice-title">
            <button
              type="button"
              className={styles.calendarModalBackdrop}
              aria-label={copy.close}
              onClick={() => setCalendarNotice("")}
            />

            <div className={styles.calendarModalCard}>
              <div className={styles.calendarModalHeader}>
                <div className={styles.calendarModalTitle}>
                  <h2 id="calendar-notice-title">{copy.noticeTitle}</h2>
                  <p>{calendarNotice}</p>
                </div>
                <button type="button" className={styles.calendarModalClose} onClick={() => setCalendarNotice("")} aria-label={copy.close}>
                  <svg viewBox="0 0 24 24" aria-hidden="true">
                    <path d="M6 6l12 12" />
                    <path d="M18 6L6 18" />
                  </svg>
                </button>
              </div>

              <div className={styles.calendarModalActions}>
                <button type="button" className={styles.primaryButton} onClick={() => setCalendarNotice("")}>
                  {copy.confirm}
                </button>
              </div>
            </div>
          </div>
        ) : null}
      </main>
    </div>
  );
}
