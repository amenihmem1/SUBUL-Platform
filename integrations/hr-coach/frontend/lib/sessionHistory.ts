export type SessionHistoryEntry = {
  session_id: string;
  candidate_key: string;
  candidate_name: string;
  headline: string;
  updated_at: string;
  turns_count: number;
  score_total: number | null;
  status: "completed" | "active" | "draft";
  title: string;
  preview: string;
  response_language: string;
  pinned: boolean;
  archived: boolean;
  title_customized: boolean;
};

export type CandidateProgression = {
  latest_score: number | null;
  previous_score: number | null;
  delta: number | null;
  label: "improving" | "declining" | "stable" | "first_completed_session" | "no_completed_session";
};

export type CandidateHistoryGroup = {
  candidate_key: string;
  candidate_name: string;
  headline: string;
  latest_updated_at: string;
  sessions_count: number;
  progression: CandidateProgression;
  sessions: SessionHistoryEntry[];
};

export type SessionHistoryResponse = {
  candidates: CandidateHistoryGroup[];
  sessions: SessionHistoryEntry[];
  total_candidates: number;
  total_sessions: number;
};
