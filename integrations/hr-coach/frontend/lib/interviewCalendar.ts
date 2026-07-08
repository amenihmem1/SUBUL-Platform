export type InterviewScheduleMode = "remote" | "onsite";
export type InterviewScheduleStatus = "planned" | "completed" | "cancelled";

export type ScheduledInterview = {
  id: string;
  candidateName: string;
  candidateEmail: string;
  role: string;
  scheduledAt: string;
  durationMinutes: number;
  status: InterviewScheduleStatus;
  createdAt: string;
  reminderMinutesBefore: number;
  candidateCancelToken?: string;
  candidateCancelUrl?: string;
  reminderSentAt: string;
  cancelledAt?: string;
};

export const INTERVIEW_CALENDAR_STORAGE_KEY = "subul-interview-calendar";

function sortSchedules(items: ScheduledInterview[]) {
  return [...items].sort((left, right) => left.scheduledAt.localeCompare(right.scheduledAt));
}

export function readScheduledInterviews(storage?: Storage | null) {
  if (!storage) {
    return [] as ScheduledInterview[];
  }

  try {
    const raw = storage.getItem(INTERVIEW_CALENDAR_STORAGE_KEY);
    if (!raw) {
      return [];
    }
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) {
      return [];
    }

    const normalized = parsed
      .filter((item) => item && typeof item === "object")
      .map((item) => {
        const entry = item as Partial<ScheduledInterview>;
        return {
          id: String(entry.id || ""),
          candidateName: String(entry.candidateName || "").trim(),
          candidateEmail: String(entry.candidateEmail || "").trim(),
          role: String(entry.role || "").trim(),
          scheduledAt: String(entry.scheduledAt || "").trim(),
          durationMinutes: Math.max(15, Number(entry.durationMinutes) || 45),
          status: entry.status === "completed" || entry.status === "cancelled" ? entry.status : "planned",
          createdAt: String(entry.createdAt || "").trim(),
          reminderMinutesBefore: Math.max(1, Number(entry.reminderMinutesBefore) || 60),
          candidateCancelToken: String((entry as ScheduledInterview).candidateCancelToken || "").trim(),
          candidateCancelUrl: String((entry as ScheduledInterview).candidateCancelUrl || "").trim(),
          reminderSentAt: String(entry.reminderSentAt || "").trim(),
          cancelledAt: String((entry as ScheduledInterview).cancelledAt || "").trim(),
        } satisfies ScheduledInterview;
      })
      .filter((item) => item.id && item.candidateName && item.candidateEmail && item.scheduledAt);

    return sortSchedules(normalized);
  } catch {
    return [];
  }
}

export function writeScheduledInterviews(items: ScheduledInterview[], storage?: Storage | null) {
  if (!storage) {
    return;
  }

  storage.setItem(INTERVIEW_CALENDAR_STORAGE_KEY, JSON.stringify(sortSchedules(items)));
}
