export type PlanIntent = {
  planId: string;
  cycle: 'monthly' | 'quarterly' | 'semester' | 'annual';
  mode?: 'renew' | 'upgrade' | 'purchase';
  source?: string;
  savedAt: number;
};

const KEY = 'subul_plan_intent';
const TTL_MS = 1000 * 60 * 60 * 24; // 24 hours — checkout funnel

export function savePlanIntent(intent: Omit<PlanIntent, 'savedAt'>): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(KEY, JSON.stringify({ ...intent, savedAt: Date.now() }));
}

export function loadPlanIntent(): PlanIntent | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return null;
    const intent: PlanIntent = JSON.parse(raw);
    if (Date.now() - intent.savedAt > TTL_MS) {
      localStorage.removeItem(KEY);
      return null;
    }
    return intent;
  } catch {
    return null;
  }
}

export function clearPlanIntent(): void {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(KEY);
}

/** Refresh TTL so mid-funnel refresh does not drop intent */
export function touchPlanIntent(): void {
  const intent = loadPlanIntent();
  if (!intent) return;
  savePlanIntent({
    planId: intent.planId,
    cycle: intent.cycle,
    mode: intent.mode,
    source: intent.source,
  });
}
