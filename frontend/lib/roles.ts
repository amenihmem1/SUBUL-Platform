/**
 * Canonical user roles returned by the API / stored on `users.role`.
 * Keep in sync with backend (`USER_ROLES` and any role strings set in services).
 */
export const KNOWN_USER_ROLES = [
  'learner',
  'admin',
  'employer',
  'university',
  'instructor',
  'student',
  'commercial',
] as const;

export type KnownUserRole = (typeof KNOWN_USER_ROLES)[number];

const KNOWN_SET = new Set<string>(KNOWN_USER_ROLES);

export function isKnownUserRole(role: string): role is KnownUserRole {
  return KNOWN_SET.has(role);
}

/** Normalize role from API: trim + lowercase. Does not map unknown values to learner. */
export function normalizeAdminUserRole(raw: string | undefined): string {
  const r = (raw ?? '').trim().toLowerCase();
  if (r === 'university_owner') return 'university';
  return r;
}

const COMMERCIAL_LIKE_ROLES = new Set(['commercial', 'commercant', 'commerçant']);

/** True for commercial / commerçant roles (including common legacy spellings). */
export function isCommercialLikeRole(role: string | undefined | null): boolean {
  const r = normalizeAdminUserRole(role ?? undefined);
  return COMMERCIAL_LIKE_ROLES.has(r);
}

/** Campus / B2B university operator (`university` or legacy `university_owner`). Not a personal learner account. */
export function isUniversityCampusAccountRole(role: string | undefined | null): boolean {
  return normalizeAdminUserRole(role ?? undefined) === 'university';
}

/**
 * Learner personal subscription admin UI (Crown action, plan column, modal).
 * Only **apprenant / learner** accounts use this flow — not admin, employer, etc.
 */
export function shouldShowLearnerSubscriptionAdminUi(
  role: string | undefined | null,
  opts?: { institutionalLearnerAccess?: boolean },
): boolean {
  if (isUniversityCampusAccountRole(role)) return false;
  if (normalizeAdminUserRole(role ?? undefined) !== 'learner') return false;
  if (isCommercialLikeRole(role)) return false;
  if (opts?.institutionalLearnerAccess) return false;
  return true;
}

/**
 * Public pricing page: Gratuit/Standard/Premium "current plan" applies only to
 * personal learner accounts (`roleContext` from `/me/status`).
 */
export function isPersonalLearnerSubscriptionPricingContext(
  roleContext: string | undefined | null,
): boolean {
  return roleContext === 'learner';
}

/**
 * Staff / partner roles: no personal-learner trial or paid self-serve CTAs on landing pricing.
 * (Aligns with backend `skipPersonalLearnerSubscriptionEvaluation` — excludes `university_student`.)
 */
export function isStaffOrPartnerPublicPricingRole(roleContext: string | undefined | null): boolean {
  return (
    roleContext === 'admin' ||
    roleContext === 'commercial' ||
    roleContext === 'university_staff' ||
    roleContext === 'other'
  );
}
