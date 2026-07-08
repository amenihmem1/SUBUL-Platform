/**
 * Build Job Search Cosmos profile payload from CV Booster parsed CV (for sync-profile).
 */
export function buildJobSearchProfileFromParsedCv(
  parsed: Record<string, unknown> | null,
  domain: string | null,
): Record<string, string> {
  const sections =
    (parsed?.sections as Record<string, unknown[]> | undefined) || {};
  const lines: string[] = [];
  const skillParts: string[] = [];

  for (const [, items] of Object.entries(sections)) {
    if (!Array.isArray(items)) continue;
    for (const item of items) {
      if (item && typeof item === "object") {
        for (const [k, v] of Object.entries(item as Record<string, unknown>)) {
          const s = v != null ? String(v).trim() : "";
          if (!s || s.length > 800) continue;
          lines.push(`${k}: ${s}`);
          if (/skill|technolog|stack|framework|language/i.test(k)) {
            skillParts.push(s);
          }
        }
      }
    }
  }

  const skills =
    skillParts.length > 0
      ? [...new Set(skillParts)].join(", ").slice(0, 4000)
      : lines.join(", ").slice(0, 4000);

  return {
    role: (domain || "").slice(0, 256),
    skills,
    summary: lines.join("\n").slice(0, 12000),
    bullets: lines.slice(0, 8).join(" | ").slice(0, 3000),
    seniority: "",
    years_experience: "",
    industry: "",
    education: "",
  };
}
