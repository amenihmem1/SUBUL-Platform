import { promises as fs } from "fs";
import path from "path";

export type SessionOverride = {
  title?: string | null;
  pinned?: boolean;
  archived?: boolean;
  deleted?: boolean;
};

export type HistorySessionLike = {
  session_id: string;
  title: string;
  pinned: boolean;
  archived: boolean;
  title_customized: boolean;
};

const OVERRIDES_PATH = path.join(process.cwd(), ".next", "session-history-overrides.json");

export async function readSessionOverrides(): Promise<Record<string, SessionOverride>> {
  try {
    const raw = await fs.readFile(OVERRIDES_PATH, "utf8");
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

async function writeSessionOverrides(overrides: Record<string, SessionOverride>) {
  await fs.mkdir(path.dirname(OVERRIDES_PATH), { recursive: true });
  await fs.writeFile(OVERRIDES_PATH, JSON.stringify(overrides, null, 2), "utf8");
}

export async function updateSessionOverride(sessionId: string, patch: SessionOverride) {
  const overrides = await readSessionOverrides();
  overrides[sessionId] = {
    ...(overrides[sessionId] || {}),
    ...patch,
  };
  await writeSessionOverrides(overrides);
  return overrides[sessionId];
}

export async function markSessionDeleted(sessionId: string) {
  return updateSessionOverride(sessionId, { deleted: true });
}

export function applySessionOverrides<T extends HistorySessionLike>(
  sessions: T[],
  overrides: Record<string, SessionOverride>,
) {
  return sessions
    .filter((session) => !overrides[session.session_id]?.deleted)
    .map((session) => {
      const override = overrides[session.session_id];
      if (!override) return session;

      const title = typeof override.title === "string" ? override.title : session.title;

      return {
        ...session,
        title,
        pinned: typeof override.pinned === "boolean" ? override.pinned : session.pinned,
        archived: typeof override.archived === "boolean" ? override.archived : session.archived,
        title_customized: typeof override.title === "string" ? true : session.title_customized,
      };
    });
}
