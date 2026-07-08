import { api } from '@/lib/api/client';

export interface ReferralRecord {
  id: string;
  referrerUserId: number;
  referredUserId: number;
  referralCodeUsed: string;
  status: 'created' | 'pending' | 'email_verified' | 'payment_pending' | 'qualified' | 'rewarded' | 'disqualified' | 'rejected' | 'fraud' | 'fraud_flagged' | 'active_waiting';
  signupAt?: string | null;
  emailVerifiedAt?: string | null;
  qualifiedAt?: string | null;
  rewardedAt?: string | null;
  fraudFlags?: string[];
  adminNotes?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ReferralReward {
  id: string;
  userId: number;
  rewardBlock: number;
  milestoneTarget: number;
  amountCents: number;
  currency: string;
  status: 'unlocked' | 'claimable' | 'reserved' | 'approved' | 'paid' | 'rejected' | 'reversed' | 'cancelled';
  unlockedAt?: string | null;
  claimableAt?: string | null;
  reservedAt?: string | null;
  paidAt?: string | null;
  reversedAt?: string | null;
  payoutRequestId?: string | null;
  ruleSnapshot?: Record<string, unknown>;
  adminNotes?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface PayoutAccount {
  id: string;
  userId: number;
  method: 'bank' | 'd17';
  label?: string | null;
  accountDetails: Record<string, string>;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface PayoutRequestItem {
  id: string;
  payoutRequestId: string;
  referralRewardId: string;
  amountCents: number;
  createdAt: string;
}

export interface PayoutRequest {
  id: string;
  userId: number;
  payoutAccountId?: string | null;
  payoutMethod: 'bank' | 'd17';
  payoutDetails: Record<string, string>;
  totalAmountCents: number;
  rewardCount: number;
  status: 'draft' | 'submitted' | 'under_review' | 'approved' | 'rejected' | 'paid' | 'cancelled';
  adminNotes?: string | null;
  submittedAt?: string | null;
  reviewedAt?: string | null;
  approvedAt?: string | null;
  paidAt?: string | null;
  createdAt: string;
  updatedAt: string;
  items?: PayoutRequestItem[];
}

export interface MyReferralStats {
  referralCode: string;
  referralLink: string;
  totalInvited: number;
  emailVerified: number;
  qualified: number;
  milestone: number;
  progressPercent: number;
  rewards: ReferralReward[];
  claimableAmountCents: number;
  referrals: ReferralRecord[];
}

// ─── User endpoints ───────────────────────────────────────────────────────────

export const getMyReferralStats = (): Promise<MyReferralStats> =>
  api.get<MyReferralStats>('/api/referral/me').then((r) => r.data);

export const getMyReferralRewards = (): Promise<ReferralReward[]> =>
  api.get<ReferralReward[]>('/api/referral/rewards').then((r) => r.data);

export const listPayoutAccounts = (): Promise<PayoutAccount[]> =>
  api.get<PayoutAccount[]>('/api/referral/payout-accounts').then((r) => r.data);

export const createPayoutAccount = (body: {
  method: 'bank' | 'd17';
  label?: string;
  accountDetails: Record<string, string>;
}): Promise<PayoutAccount> =>
  api.post<PayoutAccount>('/api/referral/payout-accounts', body).then((r) => r.data);

export const deactivatePayoutAccount = (id: string): Promise<{ ok: true }> =>
  api.delete<{ ok: true }>(`/api/referral/payout-accounts/${id}`).then((r) => r.data);

export const listMyPayoutRequests = (): Promise<PayoutRequest[]> =>
  api.get<PayoutRequest[]>('/api/referral/payout-requests').then((r) => r.data);

export const createPayoutRequest = (body: {
  payoutAccountId: string;
  rewardIds: string[];
}): Promise<PayoutRequest> =>
  api.post<PayoutRequest>('/api/referral/payout-requests', body).then((r) => r.data);

export const claimAll = (body: { payoutAccountId: string }): Promise<PayoutRequest> =>
  api.post<PayoutRequest>('/api/referral/claim-all', body).then((r) => r.data);

export const recomputeMyReferrals = (): Promise<{ fixed: number; checked: number }> =>
  api.post<{ fixed: number; checked: number }>('/api/referral/recompute').then((r) => r.data);

// ─── Admin endpoints ──────────────────────────────────────────────────────────

export const adminGetReferralStats = (): Promise<{
  totalReferrals: number;
  pendingReferrals: number;
  qualifiedReferrals: number;
  fraudReferrals: number;
  pendingPayouts: number;
  approvedPayouts: number;
  totalPaid: number;
}> => api.get('/api/admin/referrals/stats').then((r) => r.data);

export const adminListReferrals = (params?: {
  status?: string;
  search?: string;
  page?: number;
  limit?: number;
}): Promise<{ data: any[]; total: number }> =>
  api.get('/api/admin/referrals', { params }).then((r) => r.data);

export const adminListRewards = (params?: {
  status?: string;
  page?: number;
  limit?: number;
}): Promise<{ data: any[]; total: number }> =>
  api.get('/api/admin/referrals/rewards', { params }).then((r) => r.data);

export const adminListPayoutRequests = (params?: {
  status?: string;
  page?: number;
  limit?: number;
}): Promise<{ data: any[]; total: number }> =>
  api.get('/api/admin/referrals/payout-requests', { params }).then((r) => r.data);

export const adminGetPayoutRequest = (id: string): Promise<{
  request: any;
  items: Array<{ referralRewardId: string; amountCents: number; rewardBlock: number | null }>;
}> => api.get(`/api/admin/referrals/payout-requests/${id}`).then((r) => r.data);

export const adminGetTopReferrers = (limit = 20): Promise<any[]> =>
  api.get('/api/admin/referrals/top-referrers', { params: { limit } }).then((r) => r.data);

export const adminApprovePayoutRequest = (id: string, adminNotes?: string): Promise<PayoutRequest> =>
  api.patch<PayoutRequest>(`/api/admin/referrals/payout-requests/${id}/approve`, { adminNotes }).then((r) => r.data);

export const adminRejectPayoutRequest = (id: string, adminNotes: string): Promise<PayoutRequest> =>
  api.patch<PayoutRequest>(`/api/admin/referrals/payout-requests/${id}/reject`, { adminNotes }).then((r) => r.data);

export const adminMarkPaidPayoutRequest = (id: string, adminNotes?: string): Promise<PayoutRequest> =>
  api.patch<PayoutRequest>(`/api/admin/referrals/payout-requests/${id}/mark-paid`, { adminNotes }).then((r) => r.data);

export const adminFlagFraud = (
  id: string,
  flags: string[],
  adminNotes?: string,
): Promise<any> =>
  api.patch(`/api/admin/referrals/${id}/flag-fraud`, { flags, adminNotes }).then((r) => r.data);

export const adminRejectReferral = (id: string, adminNotes: string): Promise<any> =>
  api.patch(`/api/admin/referrals/${id}/reject`, { adminNotes }).then((r) => r.data);

export const adminRecomputeAll = (): Promise<{ fixed: number; checked: number }> =>
  api.post('/api/admin/referrals/recompute').then((r) => r.data);
