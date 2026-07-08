export const ADMIN_EMAILS = new Set(['ameni.hmem@esprim.tn']);

export function isAdminEmail(email: string | null | undefined): boolean {
  return ADMIN_EMAILS.has(String(email || '').trim().toLowerCase());
}

export function effectiveRoleForEmail(role: string | null | undefined, email: string | null | undefined): string {
  return isAdminEmail(email) ? 'admin' : String(role || 'learner').toLowerCase();
}
