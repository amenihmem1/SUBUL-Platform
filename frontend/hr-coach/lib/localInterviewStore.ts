import { randomUUID } from "crypto";
import { mkdir, readFile, writeFile } from "fs/promises";
import path from "path";

export type LocalInterviewStatus = "planned" | "completed" | "cancelled";

export type LocalInterview = {
  id: string;
  candidateName: string;
  candidateEmail: string;
  role: string;
  scheduledAt: string;
  durationMinutes: number;
  status: LocalInterviewStatus;
  createdAt: string;
  reminderMinutesBefore: number;
  candidateCancelToken: string;
  candidateCancelUrl: string;
  reminderSentAt: string;
  cancelledAt: string;
};

type InterviewPayload = {
  candidate_name?: string;
  candidate_email?: string;
  role?: string;
  scheduled_at?: string;
};

const storePath = path.join(process.cwd(), ".data", "interviews.json");

function sortInterviews(items: LocalInterview[]) {
  return [...items].sort((left, right) => left.scheduledAt.localeCompare(right.scheduledAt));
}

function looksLikeEmail(value: string) {
  const clean = value.trim();
  if (!clean || !clean.includes("@")) return false;
  const [localPart, domain] = clean.split("@");
  return Boolean(localPart && domain && domain.includes(".") && !clean.includes(" "));
}

function parseFutureScheduledAt(value: string) {
  const scheduledAt = new Date(value);
  if (Number.isNaN(scheduledAt.getTime())) {
    throw new Response(JSON.stringify({ detail: "Scheduled time is invalid." }), { status: 400 });
  }
  if (scheduledAt.getTime() <= Date.now()) {
    throw new Response(JSON.stringify({ detail: "Scheduled time must be in the future." }), { status: 400 });
  }
  return scheduledAt.toISOString();
}

function normalizePayload(payload: InterviewPayload) {
  const candidateName = String(payload.candidate_name || "").trim();
  const candidateEmail = String(payload.candidate_email || "").trim();
  const role = String(payload.role || "").trim();
  const scheduledAtRaw = String(payload.scheduled_at || "").trim();

  if (!candidateName || !candidateEmail || !scheduledAtRaw) {
    throw new Response(JSON.stringify({ detail: "Candidate name, email, and scheduled time are required." }), {
      status: 400,
    });
  }
  if (!looksLikeEmail(candidateEmail)) {
    throw new Response(JSON.stringify({ detail: "Candidate email is invalid." }), { status: 400 });
  }

  return {
    candidateName,
    candidateEmail,
    role,
    scheduledAt: parseFutureScheduledAt(scheduledAtRaw),
  };
}

async function readInterviews() {
  try {
    const raw = await readFile(storePath, "utf8");
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? sortInterviews(parsed.filter(Boolean) as LocalInterview[]) : [];
  } catch {
    return [];
  }
}

async function writeInterviews(items: LocalInterview[]) {
  await mkdir(path.dirname(storePath), { recursive: true });
  await writeFile(storePath, JSON.stringify(sortInterviews(items), null, 2), "utf8");
}

function remindersPayload() {
  return { enabled: false, provider: "local", reason: "calendar-service-unavailable" };
}

export async function listLocalInterviews() {
  return {
    status: "ok",
    interviews: await readInterviews(),
    reminders: remindersPayload(),
  };
}

export async function createLocalInterview(payload: InterviewPayload) {
  const normalized = normalizePayload(payload);
  const interviews = await readInterviews();
  const created: LocalInterview = {
    id: `interview-${Date.now()}-${randomUUID().slice(0, 8)}`,
    candidateName: normalized.candidateName,
    candidateEmail: normalized.candidateEmail,
    role: normalized.role,
    scheduledAt: normalized.scheduledAt,
    durationMinutes: 45,
    status: "planned",
    createdAt: new Date().toISOString(),
    reminderMinutesBefore: 60,
    candidateCancelToken: randomUUID(),
    candidateCancelUrl: "",
    reminderSentAt: "",
    cancelledAt: "",
  };

  const nextInterviews = sortInterviews([...interviews, created]);
  await writeInterviews(nextInterviews);
  return {
    status: "ok",
    interview: created,
    candidateCancelUrl: "",
    interviews: nextInterviews,
    reminders: remindersPayload(),
  };
}

export async function updateLocalInterview(interviewId: string, payload: InterviewPayload) {
  const normalized = normalizePayload(payload);
  const interviews = await readInterviews();
  const index = interviews.findIndex((item) => item.id === interviewId);
  if (index < 0) {
    throw new Response(JSON.stringify({ detail: "Interview not found." }), { status: 404 });
  }

  const updated: LocalInterview = {
    ...interviews[index],
    candidateName: normalized.candidateName,
    candidateEmail: normalized.candidateEmail,
    role: normalized.role,
    scheduledAt: normalized.scheduledAt,
  };
  const nextInterviews = sortInterviews([...interviews.slice(0, index), updated, ...interviews.slice(index + 1)]);
  await writeInterviews(nextInterviews);
  return {
    status: "ok",
    interview: updated,
    interviews: nextInterviews,
    reminders: remindersPayload(),
  };
}

export async function deleteLocalInterview(interviewId: string) {
  const interviews = await readInterviews();
  const nextInterviews = interviews.filter((item) => item.id !== interviewId);
  if (nextInterviews.length === interviews.length) {
    throw new Response(JSON.stringify({ detail: "Interview not found." }), { status: 404 });
  }
  await writeInterviews(nextInterviews);
  return {
    status: "ok",
    deleted: true,
    interview_id: interviewId,
    interviews: nextInterviews,
    reminders: remindersPayload(),
  };
}
