/** User roles aligned with frontend (admin, learner, employer, instructor, etc.) */
export const USER_ROLES = {
  ADMIN: 'admin',
  LEARNER: 'learner',
  EMPLOYER: 'employer',
  INSTRUCTOR: 'instructor',
  STUDENT: 'student',
  /** Staff / tenant dashboard login (B2B university operator). Canonical DB value. */
  UNIVERSITY: 'university',
  /**
   * Readable alias for the same DB role as `UNIVERSITY` (there is no separate `university_owner` column).
   * Use in new code when you mean “campus owner” semantics; persist `UNIVERSITY` / `university` in the database.
   */
  UNIVERSITY_OWNER: 'university',
  COMMERCIAL: 'commercial',
} as const;

/** Agent families for monthly rate limits (per user per agent_key) */
export const AGENT_KEYS = {
  ROADMAP: 'roadmap',
  QUIZ: 'quiz',
  CV: 'cv',
  JOB_SEARCH: 'job_search',
  CLOUD_TUTOR: 'cloud_tutor',
  COACH: 'coach',
} as const;

/** Default role when creating a user via admin */
export const DEFAULT_USER_ROLE = USER_ROLES.LEARNER;

/** User account status */
export const USER_STATUS = {
  ACTIVE: 'active',
  PENDING: 'pending',
  INACTIVE: 'inactive',
  SUSPENDED: 'suspended',
} as const;

/** Status set when admin approves a user */
export const STATUS_ACTIVE = USER_STATUS.ACTIVE;
