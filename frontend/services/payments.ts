import { api, API_PATHS } from '@/lib/api/client';
import publicApi from '@/lib/api/publicAxios';
import { getRealPublicIp } from '@/lib/geo-client';

export type BillingCycle = 'monthly' | 'quarterly' | 'semester' | 'annual';

export interface PricingResponse {
  region: 'TN' | 'EU' | 'US' | 'OTHER';
  planSlug?: string;
  planName?: string;
  available: boolean;
  provider?: 'stripe' | 'flouci';
  currency?: string;
  prices?: Record<BillingCycle, number>;
  cycles?: Partial<Record<'monthly' | 'quarterly' | 'annual', { amountCents: number; discountLabel: string | null }>>;
  metadata?: { source?: 'database_region' | 'database_default' | 'code_fallback' };
}

export interface CheckoutResponse {
  provider: 'stripe' | 'flouci';
  transactionId: string;
  paymentUrl?: string;
  paymentId?: string;
  clientSecret?: string;
  publishableKey?: string;
  context?: {
    originalAmountCents: number;
    discountCents: number;
    finalAmountCents: number;
    currency: string;
    planName: string;
    billingCycle: BillingCycle;
    provider: 'stripe' | 'flouci';
    geo?: { countryCode?: string | null; countryName?: string | null; pricingRegion?: string | null };
  };
}

/**
 * Build headers that include the real public IP so the backend can
 * geo-detect correctly even when Docker NAT hides the browser IP.
 */
async function withRealIp(): Promise<Record<string, string>> {
  const ip = await getRealPublicIp();
  return ip ? { 'X-Forwarded-For': ip } : {};
}

export async function getPricing(planSlug?: string): Promise<PricingResponse> {
  const headers = await withRealIp();
  const params = planSlug ? { planSlug } : undefined;
  const { data } = await publicApi.get<PricingResponse>(API_PATHS.payments('pricing'), { headers, params });
  return data;
}

export async function getPublicPlans() {
  const { data } = await publicApi.get('/api/public/plans');
  return data;
}

export async function validatePromoCode(
  code: string,
  currency: string,
  originalAmountCents: number,
  planSlug = 'standard',
) {
  const { data } = await api.post('/api/promo-codes/validate', {
    code,
    planSlug,
    currency,
    originalAmountCents,
  });
  return data as {
    valid: boolean;
    promoCodeId: string;
    discountCents: number;
    message: string;
  };
}

export type CheckoutMode = 'renew' | 'purchase' | 'upgrade';

export async function startCheckout(
  billingCycle: BillingCycle,
  promoCode?: string,
  locale?: string,
  planSlug?: string,
  checkoutMode?: CheckoutMode,
) {
  const slug = (planSlug || '').trim().toLowerCase();
  if (!slug || (slug !== 'standard' && slug !== 'premium')) {
    throw new Error('planSlug is required for checkout (standard or premium).');
  }
  const headers = await withRealIp();
  const { data } = await api.post<CheckoutResponse>(
    API_PATHS.payments('checkout'),
    {
      billingCycle,
      promoCode,
      ...(locale ? { locale } : {}),
      planSlug: slug,
      ...(checkoutMode ? { checkoutMode } : {}),
    },
    { headers },
  );
  return data;
}

// ─── Manual Payment ──────────────────────────────────────────────────────────

export type ManualPaymentMethod = 'bank_transfer' | 'd17';

export type ManualPaymentStatus =
  | 'pending'
  | 'proof_uploaded'
  | 'pending_review'
  | 'approved'
  | 'rejected';

export interface ManualPaymentRequest {
  id: string;
  userId: number;
  orderId: string;
  planSlug: string;
  planName: string;
  billingCycle: string;
  amountCents: number;
  currency: string;
  paymentMethod: ManualPaymentMethod;
  status: ManualPaymentStatus;
  proofFileUrl: string | null;
  proofPublicUrl?: string | null;
  proofFileName: string | null;
  adminNotes: string | null;
  approvedAt: string | null;
  selectedDurationMonths: number | null;
  userEmail: string | null;
  userFullName: string | null;
  createdAt: string;
  updatedAt: string;
}

export async function createManualPaymentRequest(payload: {
  paymentMethod: ManualPaymentMethod;
  planSlug: string;
  billingCycle: string;
  amountCents: number;
  currency: string;
  checkoutMode?: CheckoutMode;
}): Promise<ManualPaymentRequest> {
  const { data } = await api.post<ManualPaymentRequest>('/api/manual-payments', payload);
  return data;
}

export async function getMyManualPayments(): Promise<ManualPaymentRequest[]> {
  const { data } = await api.get<ManualPaymentRequest[]>('/api/manual-payments/my');
  return data;
}

export async function getMyManualPaymentById(id: string): Promise<ManualPaymentRequest> {
  const { data } = await api.get<ManualPaymentRequest>(`/api/manual-payments/my/${id}`);
  return data;
}

export async function uploadManualPaymentProof(
  requestId: string,
  file: File,
): Promise<ManualPaymentRequest> {
  const form = new FormData();
  form.append('file', file);
  const { data } = await api.post<ManualPaymentRequest>(
    `/api/manual-payments/${requestId}/proof`,
    form,
    { headers: { 'Content-Type': 'multipart/form-data' } },
  );
  return data;
}
