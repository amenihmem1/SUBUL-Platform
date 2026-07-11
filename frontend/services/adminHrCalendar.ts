import type { ScheduledInterview } from '@/hr-coach/lib/interviewCalendar';

const ADMIN_HR_CALENDAR_BASE = '/hr-coach-app/api/rh/interviews';

export type HrCalendarPayload = {
  candidateName: string;
  candidateEmail: string;
  role?: string;
  scheduledAt: string;
};

type HrCalendarResponse = {
  status?: string;
  interviews?: ScheduledInterview[];
  interview?: ScheduledInterview;
  reminders?: {
    enabled?: boolean;
    [key: string]: unknown;
  };
};

function normalizePayload(payload: HrCalendarPayload) {
  return {
    candidate_name: payload.candidateName.trim(),
    candidate_email: payload.candidateEmail.trim(),
    role: (payload.role || '').trim(),
    scheduled_at: payload.scheduledAt,
  };
}

async function parseResponse(response: Response): Promise<HrCalendarResponse> {
  const text = await response.text();
  let data: HrCalendarResponse = {};

  if (text) {
    try {
      data = JSON.parse(text);
    } catch {
      throw new Error(text.slice(0, 160) || 'Invalid HR calendar response.');
    }
  }

  if (!response.ok) {
    const detail = (data as { detail?: string; error?: string }).detail || (data as { error?: string }).error;
    throw new Error(detail || `HR calendar request failed (${response.status}).`);
  }

  return data;
}

export async function fetchAdminHrInterviews(): Promise<HrCalendarResponse> {
  const response = await fetch(ADMIN_HR_CALENDAR_BASE, {
    method: 'GET',
    credentials: 'include',
    cache: 'no-store',
  });
  return parseResponse(response);
}

export async function createAdminHrInterview(payload: HrCalendarPayload): Promise<HrCalendarResponse> {
  const response = await fetch(ADMIN_HR_CALENDAR_BASE, {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(normalizePayload(payload)),
  });
  return parseResponse(response);
}

export async function updateAdminHrInterview(id: string, payload: HrCalendarPayload): Promise<HrCalendarResponse> {
  const response = await fetch(`${ADMIN_HR_CALENDAR_BASE}/${encodeURIComponent(id)}`, {
    method: 'PATCH',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(normalizePayload(payload)),
  });
  return parseResponse(response);
}

export async function deleteAdminHrInterview(id: string): Promise<HrCalendarResponse> {
  const response = await fetch(`${ADMIN_HR_CALENDAR_BASE}/${encodeURIComponent(id)}`, {
    method: 'DELETE',
    credentials: 'include',
  });
  return parseResponse(response);
}
