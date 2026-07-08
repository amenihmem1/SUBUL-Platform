import type { ManualPaymentStatus } from './entities/manual-payment-request.entity';

/** Canonical DB statuses that count as validated (revenue-eligible). */
export const MANUAL_VALIDATED_STATUSES: readonly ManualPaymentStatus[] = ['approved'];

const PENDING_LIKE: readonly ManualPaymentStatus[] = [
  'pending',
  'proof_uploaded',
  'pending_review',
];

const REJECTED_LIKE: readonly ManualPaymentStatus[] = ['rejected'];

export type ManualPaymentStatusGroup = 'validated' | 'pending' | 'rejected';

export function isManualPaymentValidatedStatus(status: string): boolean {
  return MANUAL_VALIDATED_STATUSES.includes(status as ManualPaymentStatus);
}

export function isManualPaymentPendingStatus(status: string): boolean {
  return PENDING_LIKE.includes(status as ManualPaymentStatus);
}

export function isManualPaymentRejectedStatus(status: string): boolean {
  return REJECTED_LIKE.includes(status as ManualPaymentStatus);
}

export function manualPaymentStatusGroup(status: string): ManualPaymentStatusGroup {
  if (isManualPaymentValidatedStatus(status)) return 'validated';
  if (isManualPaymentRejectedStatus(status)) return 'rejected';
  return 'pending';
}

export const MANUAL_PAYMENT_STATUS_GROUPS: ManualPaymentStatusGroup[] = [
  'pending',
  'validated',
  'rejected',
];
