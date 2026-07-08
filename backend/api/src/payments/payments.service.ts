import {
  Injectable, Logger, BadRequestException, ConflictException, NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource, QueryFailedError, Brackets, SelectQueryBuilder } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import { PaymentTransaction, BillingCycle, PaymentStatus } from './entities/payment-transaction.entity';
import { StripeProvider } from './providers/stripe.provider';
import { FlouciProvider } from './providers/flouci.provider';
import { GeoService, GeoResult } from '../geo/geo.service';
import { PromoCodesService } from '../promo-codes/promo-codes.service';
import { SubscriptionsService } from '../subscriptions/subscriptions.service';
import { MailService } from '../mail/mail.service';
import { ReferralsService } from '../referrals/referrals.service';
import { getPaymentConfig, FLOUCI_MIN_AMOUNT_MILLIMES } from '../config/payment.config';
import { getPublicPlanPricingFallback, isPublicPlanSlug, type PublicPlanSlug } from '../config/plans';
import { InitiateCheckoutDto } from './dto/initiate-checkout.dto';
import { SubscriptionPlan } from '../subscriptions/entities/subscription-plan.entity';
import { User } from '../users/entities/user.entity';
import { resolveAdminPlanDisplayLabel } from './admin-plan-label';

export interface CheckoutContext {
  geo: GeoResult;
  originalAmountCents: number;
  discountCents: number;
  finalAmountCents: number;
  currency: string;
  provider: 'stripe' | 'flouci';
  planSlug: string;
  planName: string;
  billingCycle: BillingCycle;
  promoCodeId?: string;
  promoCodeStr?: string;
}

export type CheckoutResponse =
  | { provider: 'stripe'; clientSecret: string; transactionId: string; publishableKey: string; context: CheckoutContext }
  | { provider: 'flouci'; paymentUrl: string; transactionId: string; paymentId: string; context: CheckoutContext };

/** Admin UI sort keys for payment_transactions list. */
export type AdminTxSort = 'created_desc' | 'created_asc' | 'amount_desc' | 'amount_asc';

export interface AdminTxListQuery {
  page?: number;
  limit?: number;
  provider?: 'stripe' | 'flouci';
  status?: PaymentStatus;
  /** Filter by raw plan slug (e.g. standard, premium). */
  planSlug?: string;
  /** standard | premium | free | unknown — resolved category, not raw slug. */
  plan?: 'standard' | 'premium' | 'free' | 'unknown';
  billingCycle?: BillingCycle;
  currency?: string;
  userId?: number;
  email?: string;
  search?: string;
  from?: string;
  to?: string;
  sort?: AdminTxSort;
}

export interface AdminTransactionDto {
  id: string;
  provider: 'stripe' | 'flouci';
  providerReference: string | null;
  userId: number | null;
  userEmail: string | null;
  userName: string | null;
  customerEmail: string | null;
  amountCents: number;
  currency: string;
  originalAmountCents: number;
  discountCents: number;
  status: PaymentStatus;
  /** UI bucket: initiated is grouped with pending in counts; raw status still in `status`. */
  billingCycle: BillingCycle;
  planSlug: string;
  planDisplayLabel: string;
  planCategory: 'standard' | 'premium' | 'free' | 'unknown';
  createdAt: string;
  paidAt: string | null;
  metadataPreview: string | null;
  subscriptionId: string | null;
  promoCode: string | null;
  countryCode: string | null;
}

export interface AdminTransactionsPageDto {
  data: AdminTransactionDto[];
  total: number;
  page: number;
  limit: number;
}

@Injectable()
export class PaymentsService {
  private readonly logger = new Logger(PaymentsService.name);

  constructor(
    @InjectRepository(PaymentTransaction)
    private readonly txRepo: Repository<PaymentTransaction>,
    private readonly config: ConfigService,
    private readonly stripe: StripeProvider,
    private readonly flouci: FlouciProvider,
    private readonly geo: GeoService,
    private readonly promoCodes: PromoCodesService,
    private readonly subscriptions: SubscriptionsService,
    private readonly mailService: MailService,
    private readonly dataSource: DataSource,
    private readonly referrals: ReferralsService,
  ) {}

  /** Detect geo from IP address */
  async detectGeo(ip: string): Promise<GeoResult> {
    return this.geo.detectCountry(ip);
  }

  /**
   * Resolves and validates a plan for anonymous pricing + authenticated web checkout.
   * Only active, public standard/premium plans with at least one active billing option.
   */
  private async resolveWebCheckoutPlan(raw?: string | null): Promise<{ slug: string; plan: SubscriptionPlan }> {
    const slug = (raw?.trim() || 'standard').toLowerCase();
    const plan = await this.subscriptions.findPlanBySlug(slug);
    if (!plan) {
      throw new BadRequestException(`Unknown plan: ${slug}`);
    }
    if (plan.slug !== slug) {
      throw new BadRequestException(`Unknown plan: ${slug}`);
    }
    if (!plan.isActive || plan.visibility !== 'public') {
      throw new BadRequestException('Plan is not available for purchase');
    }
    if (plan.type !== 'standard' && plan.type !== 'premium') {
      throw new BadRequestException('Plan is not available for online checkout');
    }
    const hasActivePricing = (plan.billingOptions || []).some((o) => o.isActive);
    if (!hasActivePricing) {
      throw new BadRequestException('Plan has no active pricing configured');
    }
    return { slug: plan.slug, plan };
  }

  async getPricingForIp(ip: string, planSlugParam?: string) {
    const geoResult = await this.geo.detectCountry(ip);
    const cfg = getPaymentConfig(this.config);
    // Default to EU (Stripe EUR) for unknown/null regions — safer than TN for international users.
    const region = (geoResult.pricingRegion === 'TN' || geoResult.pricingRegion === 'US' || geoResult.pricingRegion === 'EU')
      ? geoResult.pricingRegion
      : 'EU';

    const { slug: resolvedSlug, plan: dbPlan } = await this.resolveWebCheckoutPlan(planSlugParam);
    if (!dbPlan.billingOptions) {
      throw new BadRequestException('Plan not configured in database');
    }

    // Extrapolate prices from DB for the specific region
    const optionsForRegion = dbPlan.billingOptions.filter((o) => o.region === region && o.isActive);
    const fallbackOptions = dbPlan.billingOptions.filter((o) => o.region === 'DEFAULT' && o.isActive);
    const optionsToUse = optionsForRegion.length > 0 ? optionsForRegion : fallbackOptions;

    let monthlyOpt = optionsToUse.find((o) => o.cycle === 'monthly');
    let quarterlyOpt = optionsToUse.find((o) => o.cycle === 'quarterly' || o.cycle === 'semester');
    let annualOpt = optionsToUse.find((o) => o.cycle === 'annual');

    const tier = cfg.pricing[region];
    let fb: ReturnType<typeof getPublicPlanPricingFallback> = null;
    if (
      isPublicPlanSlug(resolvedSlug) &&
      resolvedSlug !== 'free' &&
      (!monthlyOpt || !quarterlyOpt || !annualOpt)
    ) {
      fb = getPublicPlanPricingFallback(resolvedSlug as PublicPlanSlug, region);
    }

    const cycleMeta = {
      monthly: {
        amountCents: monthlyOpt?.priceCents ?? fb?.monthly ?? tier.monthly,
        discountLabel: monthlyOpt?.discountText ?? null,
      },
      quarterly: {
        amountCents: quarterlyOpt?.priceCents ?? fb?.quarterly ?? tier.quarterly,
        discountLabel: quarterlyOpt?.discountText ?? null,
      },
      annual: {
        amountCents: annualOpt?.priceCents ?? fb?.annual ?? tier.annual,
        discountLabel: annualOpt?.discountText ?? null,
      },
    };

    return {
      region,
      planSlug: resolvedSlug,
      planName: dbPlan.name,
      available: true,
      provider: tier.provider,
      currency: monthlyOpt?.currency || fb?.currency || tier.currency,
      prices: {
        monthly: cycleMeta.monthly.amountCents,
        quarterly: cycleMeta.quarterly.amountCents,
        annual: cycleMeta.annual.amountCents,
      },
      cycles: cycleMeta,
      metadata: {
        source: optionsForRegion.length > 0 ? 'database_region' : fallbackOptions.length > 0 ? 'database_default' : 'code_fallback',
      },
    };
  }

  /** Compute pricing context for a given geo + billing cycle + optional promo */
  async buildCheckoutContext(
    geoResult: GeoResult,
    billingCycle: BillingCycle,
    promoCode?: string,
    userId?: number,
    planSlugParam?: string,
  ): Promise<CheckoutContext> {
    const cfg = getPaymentConfig(this.config);
    // Default to EU (Stripe EUR) for unknown/null regions — safer than TN for international users.
    const region = (geoResult.pricingRegion === 'TN' || geoResult.pricingRegion === 'US' || geoResult.pricingRegion === 'EU')
      ? geoResult.pricingRegion
      : 'EU';

    if (geoResult.isSuspicious) {
      this.logger.warn(
        `[Checkout] Suspicious network detected (region=${region}, country=${geoResult.countryCode ?? 'N/A'}) — allowing checkout`,
      );
    }

    const { plan } = await this.resolveWebCheckoutPlan(planSlugParam);
    
    // Find the correct billing option
    const optionsForRegion = plan.billingOptions?.filter(o => o.region === region && o.isActive) || [];
    const fallbackOptions = plan.billingOptions?.filter(o => o.region === 'DEFAULT' && o.isActive) || [];
    const optionsToUse = optionsForRegion.length > 0 ? optionsForRegion : fallbackOptions;
    
    const billingOption = optionsToUse.find(o => 
      o.cycle === billingCycle || 
      (billingCycle === 'quarterly' && o.cycle === 'semester') || 
      (billingCycle === 'semester' && o.cycle === 'quarterly')
    );
    
    if (!billingOption) {
      throw new BadRequestException(`Billing cycle ${billingCycle} is not available for this plan in your region.`);
    }

    const pricingTier = cfg.pricing[region];

    // ── Amount sanity check ────────────────────────────────────────────────────
    // Log the exact DB option being used so misconfigurations are immediately
    // visible in production logs.
    this.logger.log(
      `[Checkout] Billing option resolved: id=${billingOption.id} region=${billingOption.region} ` +
      `cycle=${billingOption.cycle} priceCents=${billingOption.priceCents} currency=${billingOption.currency} ` +
      `(${billingOption.currency === 'TND' ? (billingOption.priceCents / 1000).toFixed(3) + ' TND' : (billingOption.priceCents / 100).toFixed(2) + ' ' + billingOption.currency})`,
    );

    // For TND (Flouci): minimum sane amount is 5 TND (5000 millimes).
    // If DB has a suspiciously small value (e.g. 100 = 0.1 TND from a data entry
    // mistake), fall back to the config env-var price and log a CRITICAL alert.
    const MIN_SANE_TND_MILLIMES = 5000; // 5 TND
    const configFallbackByBillingCycle: Partial<Record<BillingCycle, number>> = {
      monthly:   cfg.pricing.TN.monthly,
      quarterly: cfg.pricing.TN.quarterly,
      semester:  cfg.pricing.TN.quarterly,
      annual:    cfg.pricing.TN.annual,
    };
    let rawPriceCents = billingOption.priceCents;
    if (billingOption.currency === 'TND' && rawPriceCents < MIN_SANE_TND_MILLIMES) {
      const fallback = configFallbackByBillingCycle[billingCycle] ?? cfg.pricing.TN.monthly;
      this.logger.error(
        `[Checkout] CRITICAL — DB priceCents=${rawPriceCents} millimes (${(rawPriceCents / 1000).toFixed(3)} TND) ` +
        `is below the minimum sane amount (${MIN_SANE_TND_MILLIMES / 1000} TND). ` +
        `This is almost certainly a data-entry error (e.g. admin entered 0.1 TND instead of 49.99 TND). ` +
        `AUTO-CORRECTING to config fallback: ${fallback} millimes (${(fallback / 1000).toFixed(3)} TND). ` +
        `PERMANENT FIX: run FORCE_PLAN_SEED=true on next deploy, or correct the plan price ` +
        `in Admin → Subscription Plans (enter the price in TND, e.g. "49.99").`,
      );
      rawPriceCents = fallback;
    }

    let originalAmount = rawPriceCents;
    let discountCents = 0;
    let promoCodeId: string | undefined;

    if (promoCode) {
      const validation = await this.promoCodes.validateCode(
        promoCode, plan.slug, billingOption.currency, originalAmount, userId
      );
      discountCents = validation.discountCents;
      promoCodeId = validation.promoCodeId;
    }

    const finalAmount = Math.max(0, originalAmount - discountCents);

    const intervalMap: Record<string, string> = {
      monthly: '1 month',
      quarterly: '3 months',
      semester: '6 months',
      annual: '12 months',
    };

    return {
      geo: geoResult,
      originalAmountCents: originalAmount,
      discountCents,
      finalAmountCents: finalAmount,
      currency: billingOption.currency,
      provider: pricingTier.provider as 'stripe' | 'flouci', // Keep provider mapped per region setting for now
      planSlug: plan.slug,
      planName: `${plan.name} — ${intervalMap[billingCycle] || billingCycle}`,
      billingCycle,
      promoCodeId,
      promoCodeStr: promoCode,
    };
  }

  private buildIdempotencyKey(
    userId: number,
    provider: 'stripe' | 'flouci',
    billingCycle: BillingCycle,
    planSlug: string,
    promoCode?: string,
  ): string {
    const promoPart = (promoCode || 'none').trim().toUpperCase();
    const slugPart = (planSlug || 'standard').toLowerCase();
    const base = `${provider}-u${userId}-${slugPart}-${billingCycle}-${promoPart}`;
    // Stripe binds idempotency keys to the exact request body; bump when PI params change (e.g. plan slug).
    if (provider === 'stripe') return `${base}-v3`;
    return base;
  }

  private isStripeIdempotencyParameterMismatch(err: unknown): boolean {
    const msg = err instanceof Error ? err.message : String(err);
    return (
      msg.includes('idempotent') ||
      msg.includes('same parameters') ||
      msg.includes('Keys for idempotent requests')
    );
  }

  private async findExistingByIdempotency(idempotencyKey: string): Promise<PaymentTransaction | null> {
    return this.txRepo.findOne({ where: { idempotencyKey } });
  }

  private isTerminalStatus(status: PaymentStatus): boolean {
    return status === 'paid' || status === 'failed' || status === 'cancelled' || status === 'expired' || status === 'refunded';
  }

  private resolveReusableIdempotencyKey(baseKey: string, existing: PaymentTransaction | null): string {
    if (!existing) return baseKey;
    if (this.isTerminalStatus(existing.status)) {
      return `${baseKey}-${Date.now()}`;
    }
    return baseKey;
  }

  async createCheckout(
    dto: InitiateCheckoutDto,
    ip: string,
    userId?: number,
    userEmail?: string,
  ): Promise<CheckoutResponse> {
    if (!userEmail || !userId) {
      throw new BadRequestException('Authentication is required to initiate checkout.');
    }
    await this.subscriptions.assertCanUsePersonalSubscriptionFlow(userId);

    const geoResult = await this.geo.detectCountry(ip);
    const { slug: resolvedPlanSlug } = await this.subscriptions.resolveLearnerCheckoutPlanSlug(
      userId,
      dto.planSlug,
      dto.checkoutMode,
    );
    const ctx = await this.buildCheckoutContext(geoResult, dto.billingCycle, dto.promoCode, userId, resolvedPlanSlug);

    if (ctx.provider === 'stripe') {
      return this.createStripeCheckoutFromContext(ctx, dto, ip, userId, userEmail);
    }
    return this.createFlouciCheckoutFromContext(ctx, dto, ip, userId, userEmail);
  }

  private async createStripeCheckoutFromContext(
    ctx: CheckoutContext,
    dto: InitiateCheckoutDto,
    ip: string,
    userId: number,
    userEmail: string,
  ): Promise<Extract<CheckoutResponse, { provider: 'stripe' }>> {
    const baseKey = this.buildIdempotencyKey(userId, 'stripe', dto.billingCycle, ctx.planSlug, dto.promoCode);
    const existing = await this.findExistingByIdempotency(baseKey);
    let idempotencyKey = this.resolveReusableIdempotencyKey(baseKey, existing);

    if (existing && idempotencyKey === baseKey) {
      if (existing.status === 'paid') {
        // Subscription may have expired — user is allowed to renew.
        // Rotate the key so a fresh PaymentIntent is created.
        idempotencyKey = `${baseKey}-${Date.now()}`;
      } else {
        if (existing.providerPaymentIntentId) {
          try {
            const pi = await this.stripe.retrievePaymentIntent(existing.providerPaymentIntentId);
            // Only reuse PIs that the frontend can still mount Elements for
            const reusableStatuses = ['requires_payment_method', 'requires_confirmation', 'requires_action'];
            if (reusableStatuses.includes(pi.status) && pi.client_secret) {
              return {
                provider: 'stripe',
                clientSecret: pi.client_secret,
                transactionId: existing.id,
                publishableKey: this.stripe.getPublishableKey(),
                context: ctx,
              };
            }
            // PI is in a terminal/unusable state — fall through to create a fresh one
            this.logger.warn(`[Stripe] Existing PI ${pi.id} is in state "${pi.status}" — rotating to new PI`);
          } catch (err) {
            this.logger.warn(`[Stripe] Failed to retrieve existing PI: ${err instanceof Error ? err.message : String(err)}`);
          }
        }
        // Pending row without a usable PI — create a fresh one with a rotated key
        idempotencyKey = `${baseKey}-${Date.now()}`;
      }
    }

    const piParams = {
      amountCents: ctx.finalAmountCents,
      currency: ctx.currency,
      customerEmail: userEmail,
      description: ctx.planName,
      metadata: {
        planSlug: ctx.planSlug,
        billingCycle: ctx.billingCycle,
        userId: userId.toString(),
        promoCode: ctx.promoCodeStr || '',
        countryCode: ctx.geo.countryCode || '',
      },
    };

    let pi: Awaited<ReturnType<StripeProvider['createPaymentIntent']>>;
    try {
      pi = await this.stripe.createPaymentIntent({
        ...piParams,
        idempotencyKey,
      });
    } catch (err) {
      if (this.isStripeIdempotencyParameterMismatch(err)) {
        idempotencyKey = `${baseKey}-${Date.now()}`;
        pi = await this.stripe.createPaymentIntent({
          ...piParams,
          idempotencyKey,
        });
      } else {
        throw err;
      }
    }

    const tx = this.txRepo.create({
      userId,
      planSlug: ctx.planSlug,
      planName: ctx.planName,
      billingCycle: ctx.billingCycle,
      provider: 'stripe',
      providerPaymentIntentId: pi.id,
      amountCents: ctx.finalAmountCents,
      currency: ctx.currency,
      originalAmountCents: ctx.originalAmountCents,
      discountCents: ctx.discountCents,
      countryCode: ctx.geo.countryCode || undefined,
      countryName: ctx.geo.countryName || undefined,
      ipAddress: ip,
      promoCodeId: ctx.promoCodeId,
      promoCode: ctx.promoCodeStr,
      status: 'pending',
      customerEmail: userEmail,
      idempotencyKey,
    });
    let saved: PaymentTransaction;
    try {
      saved = await this.txRepo.save(tx);
    } catch (error) {
      if (error instanceof QueryFailedError && (error as any)?.driverError?.code === '23505') {
        const duplicate = await this.findExistingByIdempotency(idempotencyKey);
        if (duplicate?.providerPaymentIntentId) {
          const pi = await this.stripe.retrievePaymentIntent(duplicate.providerPaymentIntentId);
          return {
            provider: 'stripe',
            clientSecret: pi.client_secret || '',
            transactionId: duplicate.id,
            publishableKey: this.stripe.getPublishableKey(),
            context: ctx,
          };
        }
      }
      throw error;
    }

    return {
      provider: 'stripe',
      clientSecret: pi.client_secret!,
      transactionId: saved.id,
      publishableKey: this.stripe.getPublishableKey(),
      context: ctx,
    };
  }

  // ─── Payment return URL builder ──────────────────────────────────────────
  //
  // THE production bug this fixes:
  //   FRONTEND_URL=https://subul.uk/fr  (locale baked into env var)
  //   code appends  /en/payment/return
  //   result        https://subul.uk/fr/en/payment/return  → 404
  //
  // This method:
  //  1. Strips trailing slashes from the raw base URL.
  //  2. Strips ANY trailing known-locale segment (handles misconfigured env vars).
  //  3. Validates the requested locale; falls back to DEFAULT_LOCALE.
  //  4. Assembles exactly one locale segment, so output is always:
  //     https://subul.uk/{locale}/payment/return?tx=...&provider=flouci
  private static readonly SUPPORTED_LOCALES = ['en', 'fr'] as const;
  private static readonly DEFAULT_LOCALE = 'fr';

  private buildFlouciReturnUrl(rawBaseUrl: string, txId: string, locale?: string): string {
    const supported = PaymentsService.SUPPORTED_LOCALES as readonly string[];
    const safeLocale = locale && supported.includes(locale)
      ? locale
      : PaymentsService.DEFAULT_LOCALE;

    // Strip trailing slash first, then strip any trailing locale path segment.
    // Loop handles the paranoid case where env var ends in "/fr/en" (two locales).
    let base = (rawBaseUrl ?? '').trim().replace(/\/$/, '');
    let prev: string;
    do {
      prev = base;
      base = base.replace(new RegExp(`/(${supported.join('|')})$`), '');
    } while (base !== prev);

    const url = `${base}/${safeLocale}/payment/return?tx=${txId}&provider=flouci`;

    this.logger.debug(
      `[Flouci] Built return URL: rawBase="${rawBaseUrl}" locale="${safeLocale}" → "${url}"`,
    );
    return url;
  }

  // ─────────────────────────────────────────────────────────────────────────

  private async createFlouciCheckoutFromContext(
    ctx: CheckoutContext,
    dto: InitiateCheckoutDto,
    ip: string,
    userId: number,
    userEmail: string,
  ): Promise<Extract<CheckoutResponse, { provider: 'flouci' }>> {
    const frontendUrl = this.config.get<string>('FRONTEND_URL', 'http://localhost:3000');
    const baseKey = this.buildIdempotencyKey(userId, 'flouci', dto.billingCycle, ctx.planSlug, dto.promoCode);

    // ── Flouci link lifecycle ────────────────────────────────────────────────
    // Flouci payment links are SINGLE-USE and expire (sessionTimeoutSecs=1800).
    // Unlike Stripe PaymentIntents, a Flouci link cannot be reused once the user
    // visits it or after it expires. ALWAYS create a fresh Flouci session on every
    // checkout attempt — never return a cached paymentUrl.
    //
    // Strategy:
    //  1. Mark any stale pending Flouci transactions as expired so the DB stays clean.
    //  2. Always generate a new idempotency key (timestamp suffix) → new transaction + new Flouci link.
    //  3. Past PAID transactions are NOT a blocker — user may be renewing after expiry.
    // ────────────────────────────────────────────────────────────────────────

    // NOTE: We intentionally do NOT block checkout when a past paid transaction
    // exists. A user whose subscription has expired must be able to pay again.
    // Duplicate-payment prevention is handled by expiring stale pending sessions
    // below, and the subscription fulfillment is idempotent.

    // Expire any stale pending Flouci transactions for this user+cycle so they
    // don't accumulate and confuse the return-page reconciliation.
    const staleTxs = await this.txRepo.find({
      where: {
        userId,
        billingCycle: dto.billingCycle,
        planSlug: ctx.planSlug,
        provider: 'flouci',
        status: 'pending',
      },
    });
    if (staleTxs.length > 0) {
      this.logger.log(
        `[Flouci] Expiring ${staleTxs.length} stale pending transaction(s) for userId=${userId} cycle=${dto.billingCycle} before creating fresh session.`,
      );
      await this.txRepo.update(
        staleTxs.map(t => t.id),
        { status: 'expired' },
      );
    }

    // Always use a fresh timestamp-suffixed key — Flouci links must never be reused.
    const idempotencyKey = `${baseKey}-${Date.now()}`;

    const tx = this.txRepo.create({
      userId,
      planSlug: ctx.planSlug,
      planName: ctx.planName,
      billingCycle: ctx.billingCycle,
      provider: 'flouci',
      amountCents: ctx.finalAmountCents,
      currency: ctx.currency,
      originalAmountCents: ctx.originalAmountCents,
      discountCents: ctx.discountCents,
      countryCode: ctx.geo.countryCode || undefined,
      countryName: ctx.geo.countryName || undefined,
      ipAddress: ip,
      promoCodeId: ctx.promoCodeId,
      promoCode: ctx.promoCodeStr,
      status: 'pending',
      customerEmail: userEmail,
      idempotencyKey,
    });
    // Since idempotencyKey always has a Date.now() suffix, a 23505 unique-constraint
    // collision is virtually impossible. Propagate any unexpected DB error directly.
    const saved = await this.txRepo.save(tx);

    const rawBackendUrl = this.config.get<string>('BACKEND_URL', 'http://localhost:3001');
    // Strip trailing /api (or /api/) from BACKEND_URL to prevent double /api
    // in webhook paths. The routes already include /api as prefix.
    const backendUrl = rawBackendUrl.trim().replace(/\/+$/, '').replace(/\/api$/, '');

    // Sanitize frontendUrl: strip any trailing locale segment so that downstream
    // concatenations don't produce double-locale paths (e.g. /fr/en/...).
    // The same stripping logic used in buildFlouciReturnUrl is applied here for
    // any other path that uses frontendUrl directly (e.g. logoUrl).
    const supported = PaymentsService.SUPPORTED_LOCALES as readonly string[];
    let sanitizedFrontendUrl = frontendUrl.trim().replace(/\/$/, '');
    let prevUrl: string;
    do {
      prevUrl = sanitizedFrontendUrl;
      sanitizedFrontendUrl = sanitizedFrontendUrl.replace(
        new RegExp(`/(${supported.join('|')})$`), '',
      );
    } while (sanitizedFrontendUrl !== prevUrl);

    // Only pass image_url when it is a publicly reachable HTTPS URL.
    const rawLogoUrl = `${sanitizedFrontendUrl}/logo_subul_v2.png`;
    const isPublicHttps = rawLogoUrl.startsWith('https://') && !rawLogoUrl.includes('localhost');
    const logoUrl = isPublicHttps ? rawLogoUrl : undefined;

    // Warn when the webhook URL is not publicly reachable (always the case on localhost).
    // Flouci's servers cannot POST to 127.0.0.1 — webhooks will only work in production.
    const webhookUrl = `${backendUrl}/api/webhooks/flouci`;
    const isWebhookPublic = webhookUrl.startsWith('https://') && !webhookUrl.includes('localhost');
    if (!isWebhookPublic) {
      this.logger.warn(
        `[Flouci] Webhook URL "${webhookUrl}" is not publicly reachable. ` +
        'Flouci server-to-server notifications will not arrive in this environment. ' +
        'Payment status will rely solely on the frontend return-page verification.',
      );
    }

    // Amount validation: Flouci minimum is 1000 millimes (1 TND).
    // Log the human-readable amount so it is easy to spot misconfigured prices.
    const amountMillimes = ctx.finalAmountCents; // named "cents" but stores millimes for TND
    this.logger.log(
      `[Flouci] Initiating payment: tx=${saved.id} ` +
      `amount=${amountMillimes} millimes (${(amountMillimes / 1000).toFixed(3)} TND) ` +
      `cycle=${ctx.billingCycle} userId=${userId} webhookUrl=${webhookUrl}`,
    );
    if (amountMillimes < FLOUCI_MIN_AMOUNT_MILLIMES) {
      await this.txRepo.update(saved.id, {
        status: 'failed',
        providerMetadata: JSON.stringify({
          stage: 'amount_validation',
          error: `Amount ${amountMillimes} millimes (${(amountMillimes / 1000).toFixed(3)} TND) is below the Flouci minimum of ${FLOUCI_MIN_AMOUNT_MILLIMES} millimes (1 TND). A promo code may have reduced the price too much.`,
        }),
      });
      throw new BadRequestException(
        `Le montant final (${(amountMillimes / 1000).toFixed(2)} TND) est inférieur au minimum Flouci (1 TND). ` +
        `Veuillez ajuster ou retirer le code promo.`,
      );
    }

    let flouciResult: { paymentId: string; paymentUrl: string };
    try {
      flouciResult = await this.flouci.initiatePayment({
        amountMillimes,
        // Both success and fail links go to /payment/return — a neutral verification
        // hub that calls the backend to determine the real payment state before
        // showing any UI. This is required because Flouci routes Click-to-Pay
        // (Carte Bancaire) completions to fail_link even on success.
        successUrl: this.buildFlouciReturnUrl(frontendUrl, saved.id, dto.locale),
        failUrl:    this.buildFlouciReturnUrl(frontendUrl, saved.id, dto.locale),
        trackingId: saved.id,
        webhookUrl,
        imageUrl: logoUrl,          // only sent when publicly reachable (HTTPS, non-localhost)
        sessionTimeoutSecs: 1800,
      });
    } catch (error) {
      await this.txRepo.update(saved.id, {
        status: 'failed',
        providerMetadata: JSON.stringify({ stage: 'initiate_payment', error: (error as any)?.message || 'unknown' }),
      });
      throw error;
    }

    await this.txRepo.update(saved.id, {
      providerTransactionId: flouciResult.paymentId,
      status: 'pending',
      providerMetadata: JSON.stringify({ paymentUrl: flouciResult.paymentUrl }),
    });

    return {
      provider: 'flouci',
      paymentUrl: flouciResult.paymentUrl,
      transactionId: saved.id,
      paymentId: flouciResult.paymentId,
      context: ctx,
    };
  }

  /** Create Stripe checkout — returns clientSecret for Stripe Elements */
  async createStripeCheckout(
    dto: InitiateCheckoutDto,
    ip: string,
    userId?: number,
    userEmail?: string,
  ): Promise<{ clientSecret: string; transactionId: string; publishableKey: string; context: CheckoutContext }> {
    if (!userId || !userEmail) {
      throw new BadRequestException('Authentication is required to initiate checkout.');
    }
    await this.subscriptions.assertCanUsePersonalSubscriptionFlow(userId);
    const geoResult = await this.geo.detectCountry(ip);
    const { slug: resolvedPlanSlug } = await this.subscriptions.resolveLearnerCheckoutPlanSlug(
      userId,
      dto.planSlug,
      dto.checkoutMode,
    );
    const ctx = await this.buildCheckoutContext(geoResult, dto.billingCycle, dto.promoCode, userId, resolvedPlanSlug);
    if (ctx.provider !== 'stripe') {
      throw new BadRequestException('Stripe is not available for your region. Please use the Flouci payment option.');
    }
    const result = await this.createStripeCheckoutFromContext(ctx, dto, ip, userId, userEmail);
    return {
      clientSecret: result.clientSecret,
      transactionId: result.transactionId,
      publishableKey: result.publishableKey,
      context: result.context,
    };
  }

  /** Create Flouci checkout — returns payment URL for redirect */
  async createFlouciCheckout(
    dto: InitiateCheckoutDto,
    ip: string,
    userId?: number,
    userEmail?: string,
  ): Promise<{ paymentUrl: string; transactionId: string; paymentId: string; context: CheckoutContext }> {
    if (!userId || !userEmail) {
      throw new BadRequestException('Authentication is required to initiate checkout.');
    }
    await this.subscriptions.assertCanUsePersonalSubscriptionFlow(userId);
    const geoResult = await this.geo.detectCountry(ip);
    const { slug: resolvedPlanSlug } = await this.subscriptions.resolveLearnerCheckoutPlanSlug(
      userId,
      dto.planSlug,
      dto.checkoutMode,
    );
    const ctx = await this.buildCheckoutContext(geoResult, dto.billingCycle, dto.promoCode, userId, resolvedPlanSlug);
    if (ctx.provider !== 'flouci') {
      throw new BadRequestException('Flouci is only available for users in Tunisia.');
    }
    const result = await this.createFlouciCheckoutFromContext(ctx, dto, ip, userId, userEmail);
    return {
      paymentUrl: result.paymentUrl,
      transactionId: result.transactionId,
      paymentId: result.paymentId,
      context: result.context,
    };
  }

  /** Handle successful Stripe payment (called from webhook) */
  async handleStripePaymentSuccess(paymentIntentId: string, providerEvent: any): Promise<void> {
    const tx = await this.txRepo.findOne({
      where: { providerPaymentIntentId: paymentIntentId },
    });

    if (!tx) {
      this.logger.warn(`[Stripe Webhook] No transaction found for PaymentIntent ${paymentIntentId}`);
      return;
    }

    if (tx.webhookProcessed) {
      this.logger.log(`[Stripe Webhook] Already processed: ${tx.id}`);
      return;
    }

    await this.txRepo.update(tx.id, {
      status: 'paid',
      webhookProcessed: true,
      webhookReceivedAt: new Date(),
      providerMetadata: JSON.stringify(providerEvent),
    });

    // Re-fetch after update so fulfillSubscription sees the current status
    const refreshed = await this.txRepo.findOne({ where: { id: tx.id } });
    try {
      await this.fulfillSubscription(refreshed || tx);
    } catch (err) {
      this.logger.error(`[Stripe Webhook] FULFILLMENT FAILED for tx=${tx.id}: ${err instanceof Error ? err.message : String(err)}`);
      await this.txRepo.update(tx.id, {
        status: 'failed',
        providerMetadata: JSON.stringify({
          ...(providerEvent || {}),
          fulfillmentError: err instanceof Error ? err.message : String(err),
        }),
      });
      throw err;
    }
  }

  async handleStripeRefund(paymentIntentId: string, providerEvent: any): Promise<void> {
    const tx = await this.txRepo.findOne({
      where: { providerPaymentIntentId: paymentIntentId },
    });
    if (!tx) {
      this.logger.warn(`[Stripe Refund] No transaction found for PaymentIntent ${paymentIntentId}`);
      return;
    }

    await this.txRepo.update(tx.id, {
      status: 'refunded',
      webhookReceivedAt: new Date(),
      providerMetadata: JSON.stringify(providerEvent),
    });
    this.logger.log(`[Stripe Refund] Transaction ${tx.id} marked as refunded`);

    // Referral disqualification (best-effort; must be idempotent)
    if (tx.userId) {
      this.referrals.onSubscriptionReversed(tx.userId, 'refund').catch((err) => {
        this.logger.error(`[Referral] Refund disqualification failed: ${err instanceof Error ? err.message : String(err)}`);
      });
    }
  }

  async handleStripeChargeback(paymentIntentId: string, providerEvent: any): Promise<void> {
    const tx = await this.txRepo.findOne({
      where: { providerPaymentIntentId: paymentIntentId },
    });
    if (!tx) {
      this.logger.warn(`[Stripe Chargeback] No transaction found for PaymentIntent ${paymentIntentId}`);
      return;
    }

    // Best-effort: keep transaction status as-is (Stripe dispute can be resolved later),
    // but disqualify the referral immediately to prevent payouts during dispute window.
    this.logger.warn(`[Stripe Chargeback] Dispute created for tx=${tx.id}`);

    if (tx.userId) {
      this.referrals.onSubscriptionReversed(tx.userId, 'chargeback').catch((err) => {
        this.logger.error(`[Referral] Chargeback disqualification failed: ${err instanceof Error ? err.message : String(err)}`);
      });
    }

    // Persist provider metadata for traceability
    try {
      await this.txRepo.update(tx.id, {
        providerMetadata: JSON.stringify(providerEvent),
        webhookReceivedAt: new Date(),
      });
    } catch {
      // ignore
    }
  }

  async handleStripePaymentFailure(paymentIntentId: string, providerEvent: any): Promise<void> {
    const tx = await this.txRepo.findOne({
      where: { providerPaymentIntentId: paymentIntentId },
    });
    if (!tx) return;

    await this.txRepo.update(tx.id, {
      status: 'failed',
      webhookReceivedAt: new Date(),
      providerMetadata: JSON.stringify(providerEvent),
    });
  }

  async handleStripePaymentCancelled(paymentIntentId: string, providerEvent: any): Promise<void> {
    const tx = await this.txRepo.findOne({
      where: { providerPaymentIntentId: paymentIntentId },
    });
    if (!tx) return;

    await this.txRepo.update(tx.id, {
      status: 'cancelled',
      webhookReceivedAt: new Date(),
      providerMetadata: JSON.stringify(providerEvent),
    });
  }

  /**
   * Map a raw Flouci provider status string to our internal PaymentStatus.
   *
   * This is the single authoritative mapping. Both the webhook callback and the
   * reconcile flow must go through here so behaviour is consistent.
   *
   * Rules:
   * - ONLY mark `failed` for definitive card-level rejections (FAILED, DECLINED…).
   * - CANCELLED / TIMEOUT / EXPIRED = user-initiated or session-level stop → `cancelled`.
   * - Everything in-flight → `pending`.
   * - Unknown → `pending` (never falsely mark as failed).
   */
  private mapFlouciProviderStatus(
    rawStatus: string,
  ): Extract<PaymentStatus, 'paid' | 'pending' | 'cancelled' | 'failed'> {
    const s = (rawStatus || '').toUpperCase().trim();

    if (s === 'SUCCESS') return 'paid';

    // In-flight / awaiting confirmation
    if (
      ['PENDING', 'INITIATED', 'PROCESSING', 'INPROGRESS', 'IN_PROGRESS',
       'WAITING', 'AUTHORIZED', 'CREATED', 'TOCONFIRM', 'TO_CONFIRM'].some(
        (p) => s === p || s.startsWith(p),
      )
    ) return 'pending';

    // User-cancelled or session-level stop — NOT a payment failure
    if (
      ['CANCELLED', 'CANCELED', 'TIMEOUT', 'EXPIRED', 'ABANDONED',
       'ABORT', 'ANNULE', 'ANNULÉ'].some(
        (p) => s === p || s.startsWith(p),
      )
    ) return 'cancelled';

    // Definitive card/bank rejection
    // NOTE: Flouci docs use 'FAILURE' (not 'FAILED') as one of their four canonical statuses.
    if (
      ['FAILED', 'FAILURE', 'DECLINED', 'REFUSED', 'REJECTED', 'ECHEC',
       'INSUFFICIENT', 'INVALID_CARD', 'BLOCKED'].some(
        (p) => s === p || s.startsWith(p),
      )
    ) return 'failed';

    // Unrecognised → treat conservatively as pending
    this.logger.warn(
      `[Flouci] Unrecognised provider status "${rawStatus}" — defaulting to pending`,
    );
    return 'pending';
  }

  /** Handle Flouci payment event from webhook or redirect callback */
  async handleFlouciCallback(paymentId: string, transactionId?: string): Promise<void> {
    const tx = transactionId
      ? await this.txRepo.findOne({ where: { id: transactionId } })
      : await this.txRepo.findOne({ where: { providerTransactionId: paymentId } });

    if (!tx) {
      this.logger.warn(`[Flouci Callback] Transaction not found: ${transactionId || paymentId}`);
      return;
    }

    if (tx.webhookProcessed) {
      this.logger.log(`[Flouci Callback] Already processed: ${tx.id}`);
      return;
    }

    // Prefer the callback payment_id; fall back to stored ID if the first fails
    let verification = await this.flouci.verifyPayment(paymentId);
    if (!verification.success && tx.providerTransactionId && tx.providerTransactionId !== paymentId) {
      this.logger.log(
        `[Flouci Callback] Retrying with stored id ${tx.providerTransactionId}`,
      );
      verification = await this.flouci.verifyPayment(tx.providerTransactionId);
    }

    this.logger.log(
      `[Flouci Callback] tx=${tx.id} success=${verification.success} ` +
      `rawStatus=${verification.status} raw=${JSON.stringify(verification.raw)}`,
    );

    if (!verification.success) {
      const mapped = this.mapFlouciProviderStatus(verification.status);
      this.logger.log(`[Flouci Callback] Mapped status: ${verification.status} → ${mapped}`);
      // Save raw verify data so providerDebug is always populated
      await this.txRepo.update(tx.id, {
        status: mapped,
        providerMetadata: JSON.stringify(verification.raw || {}),
      });
      return;
    }

    await this.txRepo.update(tx.id, {
      status: 'paid',
      webhookProcessed: true,
      webhookReceivedAt: new Date(),
      providerMetadata: JSON.stringify(verification.raw),
    });

    const refreshed = await this.txRepo.findOne({ where: { id: tx.id } });
    try {
      await this.fulfillSubscription(refreshed || tx);
    } catch (err) {
      // Fulfillment failed AFTER payment was marked as paid.
      // Mark transaction as failed so reconciliation can retry.
      this.logger.error(`[Flouci Callback] FULFILLMENT FAILED for tx=${tx.id}: ${err instanceof Error ? err.message : String(err)}`);
      await this.txRepo.update(tx.id, {
        status: 'failed',
        providerMetadata: JSON.stringify({
          ...(verification.raw || {}),
          fulfillmentError: err instanceof Error ? err.message : String(err),
        }),
      });
      throw err;
    }
  }

  /**
   * Reconcile a Flouci transaction on-demand from the frontend return flow.
   *
   * When Flouci redirects back (including via Click to Pay / Carte Bancaire),
   * the `payment_id` appended to the redirect URL may differ from the one
   * returned by `generate_payment` (Flouci creates a sub-transaction for the
   * card flow). We try the URL-provided ID first, then fall back to the stored
   * `providerTransactionId`, so both payment flows are covered.
   */
  async reconcileFlouciTransaction(
    transactionId: string,
    userId: number,
    paymentIdFromUrl?: string,
  ): Promise<{ status: PaymentStatus; providerRawStatus: string }> {
    const tx = await this.txRepo.findOne({ where: { id: transactionId } });
    if (!tx || tx.provider !== 'flouci' || tx.userId !== userId) {
      throw new BadRequestException('Transaction introuvable.');
    }

    // Already fulfilled — no need to re-verify
    if (tx.status === 'paid' && tx.webhookProcessed) {
      this.logger.log(`[FlouciReconcile] tx=${transactionId} already paid`);
      return { status: tx.status, providerRawStatus: 'SUCCESS' };
    }

    // Build the list of payment IDs to try, de-duplicated, non-empty
    const idsToTry = [...new Set(
      [paymentIdFromUrl, tx.providerTransactionId].filter((id): id is string => !!id),
    )];

    if (idsToTry.length === 0) {
      this.logger.warn(`[FlouciReconcile] tx=${transactionId} has no provider payment ID to verify`);
      return { status: tx.status, providerRawStatus: 'UNKNOWN' };
    }

    this.logger.log(
      `[FlouciReconcile] tx=${transactionId} verifying IDs: [${idsToTry.join(', ')}] ` +
      `(urlId=${paymentIdFromUrl ?? 'none'}, storedId=${tx.providerTransactionId ?? 'none'})`,
    );

    let verification: Awaited<ReturnType<FlouciProvider['verifyPayment']>> | null = null;
    let verifiedWithId: string | null = null;

    for (const id of idsToTry) {
      try {
        const result = await this.flouci.verifyPayment(id);
        // Always log raw response for every attempt so we can diagnose issues
        this.logger.log(
          `[FlouciReconcile] verifyPayment(${id}) success=${result.success} ` +
          `status="${result.status}" raw=${JSON.stringify(result.raw)}`,
        );
        if (result.success) {
          verification = result;
          verifiedWithId = id;
          break;
        }
        verification = result;
        verifiedWithId = id;
      } catch (err) {
        this.logger.warn(
          `[FlouciReconcile] verifyPayment(${id}) threw: ${err instanceof Error ? err.message : String(err)}`,
        );
      }
    }

    if (!verification) {
      return { status: tx.status, providerRawStatus: 'UNREACHABLE' };
    }

    if (verification.success) {
      this.logger.log(`[FlouciReconcile] tx=${transactionId} SUCCESS via paymentId=${verifiedWithId}`);

      // If we verified with a different ID than what's stored, persist the correct one
      if (verifiedWithId && verifiedWithId !== tx.providerTransactionId) {
        this.logger.log(
          `[FlouciReconcile] Updating providerTransactionId ${tx.providerTransactionId} → ${verifiedWithId}`,
        );
        await this.txRepo.update(tx.id, { providerTransactionId: verifiedWithId });
      }

      await this.txRepo.update(tx.id, {
        status: 'paid',
        webhookProcessed: true,
        webhookReceivedAt: new Date(),
        providerMetadata: JSON.stringify(verification.raw || {}),
      });
      const refreshed = await this.txRepo.findOne({ where: { id: tx.id } });
      try {
        await this.fulfillSubscription(refreshed || tx);
        return { status: 'paid', providerRawStatus: verification.status };
      } catch (err) {
        // Fulfillment failed AFTER payment was marked as paid.
        // Mark transaction as failed so next reconcile attempt can retry.
        this.logger.error(`[FlouciReconcile] FULFILLMENT FAILED for tx=${transactionId}: ${err instanceof Error ? err.message : String(err)}`);
        await this.txRepo.update(tx.id, {
          status: 'failed',
          providerMetadata: JSON.stringify({
            ...(verification.raw || {}),
            fulfillmentError: err instanceof Error ? err.message : String(err),
          }),
        });
        // Re-throw so the caller (frontend polling) knows something went wrong
        throw err;
      }
    }

    // Map the raw Flouci status using the shared mapper
    const mapped = this.mapFlouciProviderStatus(verification.status);
    this.logger.log(
      `[FlouciReconcile] tx=${transactionId} non-success: ` +
      `rawStatus="${verification.status}" → mapped="${mapped}"`,
    );

    // Always save raw verify data in providerMetadata so providerDebug is populated
    // even for non-success statuses (pending, failed, cancelled).
    await this.txRepo.update(tx.id, {
      status: mapped,
      providerMetadata: JSON.stringify(verification.raw || {}),
    });
    return { status: mapped, providerRawStatus: verification.status || 'UNKNOWN' };
  }

  /** Provision subscription for existing authenticated user after payment */
  private async fulfillSubscription(tx: PaymentTransaction): Promise<void> {
    const userId = tx.userId;
    if (!userId) {
      this.logger.error(`[Fulfill] FAIL — no userId for tx ${tx.id}. Payment cannot be fulfilled.`);
      throw new Error(`Cannot fulfill subscription: missing userId for transaction ${tx.id}`);
    }

    let workingTx = tx;
    if (!workingTx.planSlug?.trim()) {
      const refreshed = await this.txRepo.findOne({ where: { id: tx.id } });
      if (refreshed?.planSlug?.trim()) {
        workingTx = refreshed;
        this.logger.warn(`[Fulfill] Reloaded tx=${tx.id} — planSlug was empty, now "${workingTx.planSlug}"`);
      } else {
        this.logger.error(
          `[Fulfill] CRITICAL — tx=${tx.id} userId=${userId} planSlug missing after reload; refusing fulfillment`,
        );
        throw new Error(`Cannot fulfill subscription: missing planSlug on transaction ${tx.id}`);
      }
    }

    this.logger.log(
      `[Fulfill] START — tx=${workingTx.id} userId=${userId} planSlug=${workingTx.planSlug} billingCycle=${workingTx.billingCycle} amountCents=${workingTx.amountCents} currency=${workingTx.currency}`,
    );

    // Step 1: Resolve the plan
    this.logger.log(`[Fulfill] Step 1/6 — Resolving plan for slug "${workingTx.planSlug}"`);
    const plan = await this.subscriptions.ensurePlan(workingTx.planSlug);
    if (!plan || !plan.id) {
      throw new Error(`ensurePlan returned null/undefined for slug "${workingTx.planSlug}"`);
    }
    if (plan.type === 'free') {
      this.logger.error(
        `[Fulfill] CRITICAL — paid path would activate FREE plan tx=${workingTx.id} userId=${userId} planSlug=${workingTx.planSlug} plan.id=${plan.id}`,
      );
      throw new Error(`Refusing to fulfill paid transaction with free plan (tx=${workingTx.id})`);
    }
    this.logger.log(
      `[Fulfill] Step 1/6 OK — plan.id=${plan.id} plan.name="${plan.name}" plan.slug="${plan.slug}" plan.type=${plan.type}`,
    );

    // Step 2: Compute subscription period
    const now = new Date();
    const end = new Date(now);
    const cycleMonths: Record<BillingCycle, number> = { monthly: 1, quarterly: 3, semester: 6, annual: 12 };
    const monthsToAdd = cycleMonths[workingTx.billingCycle] || 1;
    end.setMonth(end.getMonth() + monthsToAdd);
    this.logger.log(`[Fulfill] Step 2/6 — Period: ${now.toISOString()} → ${end.toISOString()} (${monthsToAdd} months for ${workingTx.billingCycle})`);

    // Step 3: Activate / renew the subscription
    this.logger.log(`[Fulfill] Step 3/6 — Calling activatePaidSubscription(userId=${userId}, planId=${plan.id})`);
    const sub = await this.subscriptions.activatePaidSubscription(userId, plan.id, {
      start: now,
      end,
    });
    if (!sub || !sub.id) {
      throw new Error(`activatePaidSubscription returned null/undefined for userId=${userId} planId=${plan.id}`);
    }
    this.logger.log(`[Fulfill] Step 3/6 OK — sub.id=${sub.id} sub.status=${sub.status} sub.planId=${sub.planId}`);

    // Step 4: Update subscription with payment info
    this.logger.log(`[Fulfill] Step 4/6 — Writing payment info to user_subscriptions (txId=${workingTx.id}, provider=${workingTx.provider})`);
    await this.dataSource.query(
      `UPDATE user_subscriptions SET payment_transaction_id=$1, payment_provider=$2, country_code=$3, currency=$4, amount_paid_cents=$5 WHERE id=$6`,
      [workingTx.id, workingTx.provider, workingTx.countryCode || null, workingTx.currency, workingTx.amountCents, sub.id],
    );
    this.logger.log(`[Fulfill] Step 4/6 OK — payment info written`);

    // Step 5: Update transaction with subscription ID
    this.logger.log(`[Fulfill] Step 5/6 — Linking subscriptionId to payment transaction`);
    await this.txRepo.update(workingTx.id, { subscriptionId: sub.id });
    this.logger.log(`[Fulfill] Step 5/6 OK — transaction linked`);

    // Step 6: Promo code redemption (fire-and-forget, non-blocking)
    if (workingTx.promoCodeId && workingTx.discountCents > 0) {
      try {
        await this.promoCodes.recordRedemption(workingTx.promoCodeId, userId, workingTx.id, workingTx.discountCents, {
          originalAmountCents: workingTx.originalAmountCents,
          finalAmountCents: workingTx.amountCents,
          currency: workingTx.currency,
          paymentStatus: 'paid',
        });
        this.logger.log(`[Fulfill] Step 6/6 OK — promo code redeemed`);
      } catch (err) {
        this.logger.warn(`[Fulfill] Step 6/6 WARN — promo redemption failed: ${err instanceof Error ? err.message : String(err)}`);
      }
    } else {
      this.logger.log(`[Fulfill] Step 6/6 — No promo code to redeem`);
    }

    // Step 7: Send confirmation email (fire-and-forget, never blocks)
    const existingSubs = await this.dataSource.query(
      `SELECT id FROM user_subscriptions WHERE user_id=$1 AND subscription_status IN ('active', 'trial') AND id != $2 LIMIT 1`,
      [userId, sub.id],
    );
    const isRenewal = existingSubs && existingSubs.length > 0;
    this.sendSubscriptionEmailAsync(workingTx, plan, isRenewal, end);

    // Step 8: Notify referral system — fire-and-forget, never blocks payment
    this.referrals.onSubscriptionActivated(userId).catch((err) => {
      this.logger.warn(`[Fulfill] Referral hook failed (non-blocking): ${err instanceof Error ? err.message : String(err)}`);
    });

    this.logger.log(
      `[Fulfill] DONE ✓ — tx=${workingTx.id} sub=${sub.id} userId=${userId} plan=${plan.name} (${plan.slug}) type=${plan.type} periodEnd=${end.toISOString()} isRenewal=${isRenewal}`,
    );
  }

  /** Send subscription email in background — never blocks payment flow */
  private async sendSubscriptionEmailAsync(
    tx: PaymentTransaction,
    plan: { slug: string; name: string },
    isRenewal: boolean,
    periodEnd: Date,
  ): Promise<void> {
    try {
      // Get user email and name from the user table
      const userRow = await this.dataSource.query(
        `SELECT email, "fullName" FROM users WHERE id=$1`,
        [tx.userId],
      );
      if (!userRow || !userRow[0] || !userRow[0].email) {
        this.logger.warn(`[Mail] No email found for userId=${tx.userId} — skipping subscription email`);
        return;
      }

      const userEmail = userRow[0].email;
      const userName = userRow[0].fullName || userEmail.split('@')[0] || 'Subscriber';

      // Format price
      const divisor = (tx.currency === 'TND' ? 1000 : 100);
      const priceFormatted = `${(tx.amountCents / divisor).toFixed(2)} ${tx.currency}`;
      const cycleLabels: Record<BillingCycle, string> = { monthly: 'Monthly', quarterly: 'Quarterly', semester: 'Semester', annual: 'Annual' };
      const cycleLabel = cycleLabels[tx.billingCycle] || tx.billingCycle;
      const activationDate = new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
      const nextBillingDate = periodEnd.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });

      if (isRenewal) {
        await this.mailService.sendSubscriptionRenewal(
          userEmail, userName, plan.name, priceFormatted, activationDate, nextBillingDate,
        );
        this.logger.log(`[Mail] Renewal email sent to ${userEmail} for ${plan.name}`);
      } else {
        await this.mailService.sendSubscriptionUpgrade(
          userEmail, userName, plan.name, priceFormatted, cycleLabel, activationDate,
        );
        this.logger.log(`[Mail] Upgrade email sent to ${userEmail} for ${plan.name}`);
      }
    } catch (err) {
      // NEVER fail the payment flow due to email errors
      this.logger.warn(`[Mail] Subscription email failed: ${err instanceof Error ? err.message : String(err)}`);
    }
  }

  async getTransactionById(id: string): Promise<PaymentTransaction | null> {
    return this.txRepo.findOne({ where: { id } });
  }

  /**
   * Called by the frontend success page when the webhook hasn't arrived yet.
   * Reads the PI status directly from Stripe and triggers fulfillment if succeeded.
   * Safe to call multiple times — idempotency is guarded by webhookProcessed flag.
   */
  async verifyAndFulfillStripeTransaction(txId: string, userId: number): Promise<{ status: string }> {
    const tx = await this.txRepo.findOne({ where: { id: txId } });
    if (!tx) return { status: 'not_found' };

    // Already fulfilled
    if (tx.status === 'paid') return { status: 'paid' };

    // Only works for Stripe transactions
    if (tx.provider !== 'stripe' || !tx.providerPaymentIntentId) {
      return { status: tx.status };
    }

    // Verify ownership (userId must match)
    if (tx.userId && tx.userId !== userId) {
      return { status: 'forbidden' };
    }

    let piStatus: string;
    try {
      const pi = await this.stripe.retrievePaymentIntent(tx.providerPaymentIntentId);
      piStatus = pi.status;
    } catch (err) {
      this.logger.warn(`[StripeVerify] Could not retrieve PI ${tx.providerPaymentIntentId}: ${err instanceof Error ? err.message : String(err)}`);
      return { status: tx.status };
    }

    if (piStatus === 'succeeded') {
      if (!tx.webhookProcessed) {
        // Trigger fulfillment synchronously (unlike webhook which is fire-and-forget)
        await this.handleStripePaymentSuccess(tx.providerPaymentIntentId, { type: 'manual_verify' });
      }
      return { status: 'paid' };
    }

    if (piStatus === 'canceled') {
      await this.txRepo.update(tx.id, { status: 'cancelled' });
      return { status: 'cancelled' };
    }

    if (piStatus === 'payment_failed') {
      await this.txRepo.update(tx.id, { status: 'failed' });
      return { status: 'failed' };
    }

    return { status: tx.status };
  }

  /**
   * Expire a pending Flouci transaction that the user has given up waiting for.
   *
   * Called from the frontend return page after it has polled without success for
   * the full timeout window (~10 minutes). Guards:
   *  - Transaction must belong to `userId`
   *  - Status must still be `pending` (idempotent if already expired)
   *  - Must have been created more than EXPIRE_AFTER_MINUTES ago
   */
  async expirePendingFlouciTransaction(
    transactionId: string,
    userId: number,
  ): Promise<{ status: PaymentStatus }> {
    const EXPIRE_AFTER_MINUTES = 5; // don't expire within the first 5 minutes
    const tx = await this.txRepo.findOne({ where: { id: transactionId } });

    if (!tx || tx.provider !== 'flouci' || tx.userId !== userId) {
      throw new BadRequestException('Transaction introuvable.');
    }

    if (tx.status === 'paid') return { status: 'paid' };
    if (tx.status === 'expired') return { status: 'expired' };

    if (tx.status !== 'pending') {
      return { status: tx.status };
    }

    const ageMs = Date.now() - new Date(tx.createdAt).getTime();
    const ageMin = ageMs / 60_000;

    if (ageMin < EXPIRE_AFTER_MINUTES) {
      this.logger.warn(
        `[Expire] tx=${transactionId} is only ${ageMin.toFixed(1)} min old — too early to expire`,
      );
      return { status: 'pending' };
    }

    // Do one last verify before expiring — the payment might have just settled
    if (tx.providerTransactionId) {
      try {
        const verification = await this.flouci.verifyPayment(tx.providerTransactionId);
        this.logger.log(
          `[Expire] Final verify for tx=${transactionId}: ` +
          `success=${verification.success} rawStatus="${verification.status}"`,
        );
        if (verification.success) {
          await this.txRepo.update(tx.id, {
            status: 'paid',
            webhookProcessed: true,
            webhookReceivedAt: new Date(),
            providerMetadata: JSON.stringify(verification.raw || {}),
          });
          const refreshed = await this.txRepo.findOne({ where: { id: tx.id } });
          try {
            await this.fulfillSubscription(refreshed || tx);
            return { status: 'paid' };
          } catch (err) {
            this.logger.error(`[Expire] FULFILLMENT FAILED for tx=${transactionId}: ${err instanceof Error ? err.message : String(err)}`);
            await this.txRepo.update(tx.id, {
              status: 'failed',
              providerMetadata: JSON.stringify({
                ...(verification.raw || {}),
                fulfillmentError: err instanceof Error ? err.message : String(err),
              }),
            });
            throw err;
          }
        }
        const mapped = this.mapFlouciProviderStatus(verification.status);
        if (mapped !== 'pending') {
          await this.txRepo.update(tx.id, { status: mapped });
          return { status: mapped };
        }
      } catch (err) {
        this.logger.warn(`[Expire] Final verify threw: ${err instanceof Error ? err.message : String(err)}`);
      }
    }

    await this.txRepo.update(tx.id, { status: 'expired' });
    this.logger.log(`[Expire] tx=${transactionId} marked as expired after ${ageMin.toFixed(1)} min`);
    return { status: 'expired' };
  }

  async listTransactions(page = 1, limit = 20): Promise<{ data: PaymentTransaction[]; total: number }> {
    const [data, total] = await this.txRepo.findAndCount({
      order: { createdAt: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
    });
    return { data, total };
  }

  /** Return paid transactions since a given ISO timestamp (default: last 10 minutes) */
  async getRecentPaidTransactions(sinceIso?: string): Promise<PaymentTransaction[]> {
    const since = sinceIso ? new Date(sinceIso) : new Date(Date.now() - 10 * 60 * 1000);
    return this.txRepo
      .createQueryBuilder('tx')
      .where('tx.status = :status', { status: 'paid' })
      .andWhere('tx.updatedAt >= :since', { since })
      .orderBy('tx.updatedAt', 'DESC')
      .getMany();
  }

  // ─── Admin: payment_transactions hub ─────────────────────────────────────────

  private toAdminTransactionDto(
    tx: PaymentTransaction,
    opts?: { userEmail?: string | null; userFullName?: string | null },
  ): AdminTransactionDto {
    const resolved = resolveAdminPlanDisplayLabel(tx.planSlug, tx.planName, tx.id);
    const userEmail = opts?.userEmail ?? null;
    const customer = tx.customerEmail ?? null;
    const displayEmail = userEmail ?? customer;
    const userName = opts?.userFullName?.trim() || tx.customerName?.trim() || null;
    const paidAt =
      tx.status === 'paid' ? (tx.webhookReceivedAt ?? tx.updatedAt)?.toISOString() ?? null : null;
    const meta = tx.providerMetadata?.trim();
    const metadataPreview =
      meta && meta.length > 0 ? (meta.length > 180 ? `${meta.slice(0, 180)}…` : meta) : null;
    const providerReference =
      tx.provider === 'stripe'
        ? tx.providerPaymentIntentId ?? tx.providerTransactionId ?? null
        : tx.providerTransactionId ?? tx.providerPaymentIntentId ?? null;

    return {
      id: tx.id,
      provider: tx.provider,
      providerReference,
      userId: tx.userId ?? null,
      userEmail: displayEmail,
      userName,
      customerEmail: customer,
      amountCents: tx.amountCents,
      currency: tx.currency,
      originalAmountCents: tx.originalAmountCents,
      discountCents: tx.discountCents,
      status: tx.status,
      billingCycle: tx.billingCycle,
      planSlug: tx.planSlug,
      planDisplayLabel: resolved.label,
      planCategory: resolved.key,
      createdAt: tx.createdAt.toISOString(),
      paidAt,
      metadataPreview,
      subscriptionId: tx.subscriptionId ?? null,
      promoCode: tx.promoCode ?? null,
      countryCode: tx.countryCode ?? null,
    };
  }

  private applyAdminTransactionFilters(
    qb: SelectQueryBuilder<PaymentTransaction>,
    q: AdminTxListQuery,
  ): void {
    if (q.provider === 'stripe' || q.provider === 'flouci') {
      qb.andWhere('tx.provider = :provider', { provider: q.provider });
    }
    if (q.status) {
      qb.andWhere('tx.status = :status', { status: q.status });
    }
    if (q.planSlug) {
      qb.andWhere('LOWER(TRIM(tx.planSlug)) = LOWER(TRIM(:planSlug))', { planSlug: q.planSlug });
    }
    if (q.billingCycle) {
      qb.andWhere('tx.billingCycle = :billingCycle', { billingCycle: q.billingCycle });
    }
    if (q.currency) {
      qb.andWhere('UPPER(tx.currency) = UPPER(:currency)', { currency: q.currency });
    }
    if (q.userId != null && !Number.isNaN(q.userId)) {
      qb.andWhere('tx.userId = :userId', { userId: q.userId });
    }
    if (q.email?.trim()) {
      const e = `%${q.email.trim().replace(/[%_\\]/g, '\\$&')}%`;
      qb.andWhere(
        new Brackets((w) => {
          w.where('u.email ILIKE :email', { email: e }).orWhere('tx.customerEmail ILIKE :email', {
            email: e,
          });
        }),
      );
    }
    if (q.from) {
      qb.andWhere('tx.createdAt >= :from', { from: new Date(q.from) });
    }
    if (q.to) {
      qb.andWhere('tx.createdAt <= :to', { to: new Date(q.to) });
    }
    if (q.search?.trim()) {
      const s = `%${q.search.trim().replace(/[%_\\]/g, '\\$&')}%`;
      qb.andWhere(
        new Brackets((w) => {
          w.where('CAST(tx.id AS text) ILIKE :s', { s })
            .orWhere('tx.providerTransactionId ILIKE :s', { s })
            .orWhere('tx.providerPaymentIntentId ILIKE :s', { s });
        }),
      );
    }
  }

  /**
   * Server-side plan bucket filter (slug-based, aligned with seeded `plan_slug` values).
   * Name-only legacy rows may differ from `planCategory` on the DTO until backfilled.
   */
  /** Raw SQL fragment (snake_case columns) for plan bucket filters in native queries. */
  private adminPlanCategoryNativeSql(plan?: AdminTxListQuery['plan'], alias = 'tx'): string {
    if (!plan) return '';
    const col = `${alias}.plan_slug`;
    if (plan === 'standard') {
      return ` AND LOWER(TRIM(${col})) = 'standard'`;
    }
    if (plan === 'premium') {
      return ` AND LOWER(TRIM(${col})) = 'premium'`;
    }
    if (plan === 'free') {
      return ` AND LOWER(TRIM(COALESCE(${col}, ''))) IN ('free', 'basic')`;
    }
    return ` AND LOWER(TRIM(COALESCE(${col}, ''))) NOT IN ('standard', 'premium', 'free', 'basic', '')`;
  }

  private applyAdminPlanCategorySqlFilter(
    qb: SelectQueryBuilder<PaymentTransaction>,
    plan?: AdminTxListQuery['plan'],
  ): void {
    if (!plan) return;
    if (plan === 'standard') {
      qb.andWhere("LOWER(TRIM(tx.planSlug)) = 'standard'");
    } else if (plan === 'premium') {
      qb.andWhere("LOWER(TRIM(tx.planSlug)) = 'premium'");
    } else if (plan === 'free') {
      qb.andWhere("LOWER(TRIM(COALESCE(tx.planSlug, ''))) IN ('free', 'basic')");
    } else if (plan === 'unknown') {
      qb.andWhere(
        "LOWER(TRIM(COALESCE(tx.planSlug, ''))) NOT IN ('standard', 'premium', 'free', 'basic', '')",
      );
    }
  }

  private applyAdminTxSorting(qb: SelectQueryBuilder<PaymentTransaction>, sort: AdminTxSort): void {
    if (sort === 'created_asc') {
      qb.orderBy('tx.createdAt', 'ASC');
    } else if (sort === 'amount_desc') {
      qb.orderBy('tx.amountCents', 'DESC').addOrderBy('tx.createdAt', 'DESC');
    } else if (sort === 'amount_asc') {
      qb.orderBy('tx.amountCents', 'ASC').addOrderBy('tx.createdAt', 'DESC');
    } else {
      qb.orderBy('tx.createdAt', 'DESC');
    }
  }

  async listAdminTransactions(q: AdminTxListQuery): Promise<AdminTransactionsPageDto> {
    const page = Math.max(1, q.page ?? 1);
    const limit = Math.min(100, Math.max(1, q.limit ?? 25));
    const sort: AdminTxSort = q.sort ?? 'created_desc';

    const countQ = this.txRepo
      .createQueryBuilder('tx')
      .leftJoin(User, 'u', 'u.id = tx.userId');
    this.applyAdminTransactionFilters(countQ, q);
    this.applyAdminPlanCategorySqlFilter(countQ, q.plan);
    const total = await countQ.getCount();

    const qb = this.txRepo
      .createQueryBuilder('tx')
      .leftJoin(User, 'u', 'u.id = tx.userId');
    this.applyAdminTransactionFilters(qb, q);
    this.applyAdminPlanCategorySqlFilter(qb, q.plan);
    qb.addSelect(['u.email', 'u.fullName']);
    this.applyAdminTxSorting(qb, sort);
    qb.skip((page - 1) * limit).take(limit);

    const { entities, raw } = await qb.getRawAndEntities();
    const data = entities.map((tx, i) =>
      this.toAdminTransactionDto(tx, {
        userEmail: raw[i]?.u_email ?? raw[i]?.user_email,
        userFullName: raw[i]?.u_fullName ?? raw[i]?.u_fullname,
      }),
    );

    return { data, total, page, limit };
  }

  async getAdminTransactionById(id: string): Promise<AdminTransactionDto> {
    const row = await this.txRepo
      .createQueryBuilder('tx')
      .leftJoin(User, 'u', 'u.id = tx.userId')
      .addSelect(['u.email', 'u.fullName'])
      .where('tx.id = :id', { id })
      .getRawAndEntities();
    const tx = row.entities[0];
    if (!tx) throw new NotFoundException('Transaction not found');
    const r = row.raw[0];
    return this.toAdminTransactionDto(tx, {
      userEmail: r?.u_email,
      userFullName: r?.u_fullName ?? r?.u_fullname,
    });
  }

  async getAdminTransactionDetail(id: string): Promise<AdminTransactionDto & { providerMetadata: unknown }> {
    const tx = await this.txRepo.findOne({ where: { id } });
    if (!tx) throw new NotFoundException('Transaction not found');
    let userEmail: string | null = null;
    let userFullName: string | null = null;
    if (tx.userId != null) {
      const u = await this.txRepo.manager.findOne(User, { where: { id: tx.userId } });
      userEmail = u?.email ?? null;
      userFullName = u?.fullName ?? null;
    }
    let providerMetadata: unknown = null;
    if (tx.providerMetadata) {
      try {
        providerMetadata = JSON.parse(tx.providerMetadata) as unknown;
      } catch {
        providerMetadata = tx.providerMetadata;
      }
    }
    return { ...this.toAdminTransactionDto(tx, { userEmail, userFullName }), providerMetadata };
  }

  async getAdminTransactionStats(): Promise<{
    revenueByCurrency: { currency: string; revenueCents: number; paidCount: number }[];
    paidCount: number;
    failedCount: number;
    pendingCount: number;
    cancelledCount: number;
    expiredCount: number;
    refundedCount: number;
    initiatedCount: number;
    stripePaidByCurrency: { currency: string; revenueCents: number }[];
    flouciPaidByCurrency: { currency: string; revenueCents: number }[];
    standardPaidCount: number;
    premiumPaidCount: number;
    freePaidCount: number;
    totalTransactions: number;
  }> {
    const statusRows = await this.txRepo
      .createQueryBuilder('tx')
      .select('tx.status', 'status')
      .addSelect('COUNT(*)', 'count')
      .groupBy('tx.status')
      .getRawMany<{ status: PaymentStatus; count: string }>();

    const byStatus: Record<string, number> = {};
    for (const r of statusRows) {
      byStatus[r.status] = parseInt(r.count, 10) || 0;
    }

    const revRows = await this.txRepo
      .createQueryBuilder('tx')
      .select('tx.currency', 'currency')
      .addSelect('SUM(tx.amountCents)', 'revenueCents')
      .addSelect('COUNT(*)', 'paidCount')
      .where('tx.status = :paid', { paid: 'paid' })
      .groupBy('tx.currency')
      .getRawMany<{ currency: string; revenueCents: string | null; paidCount: string }>();

    const revenueByCurrency = revRows.map((r) => ({
      currency: r.currency,
      revenueCents: parseInt(String(r.revenueCents ?? '0'), 10) || 0,
      paidCount: parseInt(r.paidCount, 10) || 0,
    }));

    const stripeRows = await this.txRepo
      .createQueryBuilder('tx')
      .select('tx.currency', 'currency')
      .addSelect('SUM(tx.amountCents)', 'revenueCents')
      .where('tx.status = :paid', { paid: 'paid' })
      .andWhere('tx.provider = :p', { p: 'stripe' })
      .groupBy('tx.currency')
      .getRawMany<{ currency: string; revenueCents: string | null }>();

    const flouciRows = await this.txRepo
      .createQueryBuilder('tx')
      .select('tx.currency', 'currency')
      .addSelect('SUM(tx.amountCents)', 'revenueCents')
      .where('tx.status = :paid', { paid: 'paid' })
      .andWhere('tx.provider = :p', { p: 'flouci' })
      .groupBy('tx.currency')
      .getRawMany<{ currency: string; revenueCents: string | null }>();

    const planAgg = await this.dataSource.query(`
      SELECT
        COUNT(*) FILTER (WHERE LOWER(TRIM(plan_slug)) = 'standard')::int AS standard_paid,
        COUNT(*) FILTER (WHERE LOWER(TRIM(plan_slug)) = 'premium')::int AS premium_paid,
        COUNT(*) FILTER (WHERE LOWER(TRIM(COALESCE(plan_slug, ''))) IN ('free', 'basic'))::int AS free_paid
      FROM payment_transactions
      WHERE status = 'paid'
    `);
    const pa = planAgg[0] as { standard_paid: number; premium_paid: number; free_paid: number };
    const standardPaidCount = pa?.standard_paid ?? 0;
    const premiumPaidCount = pa?.premium_paid ?? 0;
    const freePaidCount = pa?.free_paid ?? 0;

    const totalTransactions = await this.txRepo.count();

    return {
      revenueByCurrency,
      paidCount: byStatus.paid ?? 0,
      failedCount: byStatus.failed ?? 0,
      pendingCount: (byStatus.pending ?? 0) + (byStatus.initiated ?? 0),
      cancelledCount: byStatus.cancelled ?? 0,
      expiredCount: byStatus.expired ?? 0,
      refundedCount: byStatus.refunded ?? 0,
      initiatedCount: byStatus.initiated ?? 0,
      stripePaidByCurrency: stripeRows.map((r) => ({
        currency: r.currency,
        revenueCents: parseInt(String(r.revenueCents ?? '0'), 10) || 0,
      })),
      flouciPaidByCurrency: flouciRows.map((r) => ({
        currency: r.currency,
        revenueCents: parseInt(String(r.revenueCents ?? '0'), 10) || 0,
      })),
      standardPaidCount,
      premiumPaidCount,
      freePaidCount,
      totalTransactions,
    };
  }

  async getAdminTransactionAnalytics(query: {
    from?: string;
    to?: string;
    granularity?: 'day' | 'week' | 'month' | 'year';
    provider?: 'stripe' | 'flouci';
    currency?: string;
    plan?: AdminTxListQuery['plan'];
  }): Promise<{
    granularity: string;
    series: {
      bucket: string;
      revenueCents: number;
      paymentCount: number;
      successCount: number;
      failedCount: number;
      pendingCount: number;
    }[];
    statusDistribution: { status: string; count: number }[];
    revenueByProvider: { provider: string; revenueCents: number; count: number }[];
    revenueByPlanCategory: { planCategory: string; revenueCents: number; paymentCount: number }[];
    note: string;
  }> {
    const unit = ['day', 'week', 'month', 'year'].includes(query.granularity ?? '')
      ? (query.granularity as string)
      : 'day';
    const from = query.from ? new Date(query.from) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const to = query.to ? new Date(query.to) : new Date();

    const params: unknown[] = [from, to];
    let fil = '';
    if (query.provider === 'stripe' || query.provider === 'flouci') {
      params.push(query.provider);
      fil += ` AND tx.provider = $${params.length}`;
    }
    if (query.currency?.trim()) {
      params.push(query.currency.trim().toUpperCase());
      fil += ` AND UPPER(tx.currency) = $${params.length}`;
    }
    fil += this.adminPlanCategoryNativeSql(query.plan);

    const sql = `
      SELECT date_trunc('${unit}', tx.created_at) AS bucket,
        COALESCE(SUM(CASE WHEN tx.status = 'paid' THEN tx.amount_cents ELSE 0 END), 0)::bigint AS revenue_cents,
        COUNT(*)::int AS payment_count,
        COALESCE(SUM(CASE WHEN tx.status = 'paid' THEN 1 ELSE 0 END), 0)::int AS success_count,
        COALESCE(SUM(CASE WHEN tx.status = 'failed' THEN 1 ELSE 0 END), 0)::int AS failed_count,
        COALESCE(SUM(CASE WHEN tx.status IN ('pending','initiated') THEN 1 ELSE 0 END), 0)::int AS pending_count
      FROM payment_transactions tx
      WHERE tx.created_at >= $1 AND tx.created_at <= $2
      ${fil}
      GROUP BY 1
      ORDER BY 1 ASC
    `;

    const rawSeries = await this.dataSource.query(sql, params);

    const stQb = this.txRepo
      .createQueryBuilder('tx')
      .select('tx.status', 'status')
      .addSelect('COUNT(*)', 'count')
      .where('tx.createdAt BETWEEN :from AND :to', { from, to });
    if (query.provider === 'stripe' || query.provider === 'flouci') {
      stQb.andWhere('tx.provider = :provider', { provider: query.provider });
    }
    if (query.currency?.trim()) {
      stQb.andWhere('UPPER(tx.currency) = :currency', { currency: query.currency.trim().toUpperCase() });
    }
    this.applyAdminPlanCategorySqlFilter(stQb, query.plan);
    const statusDist = await stQb.groupBy('tx.status').getRawMany<{ status: string; count: string }>();

    const revQb = this.txRepo
      .createQueryBuilder('tx')
      .select('tx.provider', 'provider')
      .addSelect(
        "COALESCE(SUM(CASE WHEN tx.status = 'paid' THEN tx.amountCents ELSE 0 END), 0)",
        'revenueCents',
      )
      .addSelect('COUNT(*)', 'count')
      .where('tx.createdAt BETWEEN :from AND :to', { from, to })
      .groupBy('tx.provider');
    if (query.provider === 'stripe' || query.provider === 'flouci') {
      revQb.andWhere('tx.provider = :provider', { provider: query.provider });
    }
    if (query.currency?.trim()) {
      revQb.andWhere('UPPER(tx.currency) = :currency', { currency: query.currency.trim().toUpperCase() });
    }
    this.applyAdminPlanCategorySqlFilter(revQb, query.plan);
    const revProv = await revQb.getRawMany<{ provider: string; revenueCents: string; count: string }>();

    const planSql = `
      SELECT plan_category,
        COALESCE(SUM(CASE WHEN status = 'paid' THEN amount_cents ELSE 0 END), 0)::bigint AS revenue_cents,
        COUNT(*)::int AS payment_count
      FROM (
        SELECT tx.status,
          tx.amount_cents,
          CASE
            WHEN LOWER(TRIM(tx.plan_slug)) = 'standard' THEN 'standard'
            WHEN LOWER(TRIM(tx.plan_slug)) = 'premium' THEN 'premium'
            WHEN LOWER(TRIM(COALESCE(tx.plan_slug, ''))) IN ('free', 'basic') THEN 'free'
            ELSE 'unknown'
          END AS plan_category
        FROM payment_transactions tx
        WHERE tx.created_at >= $1 AND tx.created_at <= $2
        ${fil}
      ) sub
      GROUP BY plan_category
      ORDER BY plan_category ASC
    `;
    const planRows = await this.dataSource.query(planSql, params);

    const series = (rawSeries as { bucket: Date; revenue_cents: string; payment_count: number; success_count: number; failed_count: number; pending_count: number }[]).map(
      (r) => ({
        bucket: new Date(r.bucket).toISOString(),
        revenueCents: Number(r.revenue_cents) || 0,
        paymentCount: r.payment_count,
        successCount: r.success_count,
        failedCount: r.failed_count,
        pendingCount: r.pending_count,
      }),
    );

    return {
      granularity: unit,
      series,
      statusDistribution: statusDist.map((s) => ({ status: s.status, count: parseInt(s.count, 10) || 0 })),
      revenueByProvider: revProv.map((r) => ({
        provider: r.provider,
        revenueCents: parseInt(String(r.revenueCents ?? '0'), 10) || 0,
        count: parseInt(r.count, 10) || 0,
      })),
      revenueByPlanCategory: (planRows as { plan_category: string; revenue_cents: string; payment_count: number }[]).map(
        (r) => ({
          planCategory: r.plan_category,
          revenueCents: Number(r.revenue_cents) || 0,
          paymentCount: r.payment_count,
        }),
      ),
      note:
        'Revenue sums are per currency in the database minor units (cents or millimes); do not add across currencies.',
    };
  }

  async adminRefundStripeTransaction(id: string): Promise<AdminTransactionDto> {
    const tx = await this.txRepo.findOne({ where: { id } });
    if (!tx) throw new NotFoundException('Transaction not found');
    if (tx.provider !== 'stripe') {
      throw new BadRequestException('Refunds via admin are only supported for Stripe. Flouci refunds must be handled in the Flouci dashboard.');
    }
    if (tx.status !== 'paid') {
      throw new BadRequestException(`Only paid transactions can be refunded (current: ${tx.status}).`);
    }
    const pi = tx.providerPaymentIntentId;
    if (!pi) {
      throw new BadRequestException('This transaction has no Stripe PaymentIntent id.');
    }

    let existingMeta: Record<string, unknown> = {};
    if (tx.providerMetadata) {
      try {
        existingMeta = JSON.parse(tx.providerMetadata) as Record<string, unknown>;
      } catch {
        existingMeta = { raw: tx.providerMetadata };
      }
    }

    const refund = await this.stripe.createRefundForPaymentIntent(pi);
    await this.txRepo.update(tx.id, {
      status: 'refunded',
      webhookReceivedAt: new Date(),
      providerMetadata: JSON.stringify({
        ...existingMeta,
        adminRefund: { refundId: refund.id, at: new Date().toISOString() },
      }),
    });
    this.logger.log(`[Admin Refund] tx=${tx.id} stripe refund=${refund.id}`);

    if (tx.userId) {
      this.referrals.onSubscriptionReversed(tx.userId, 'refund').catch((err) => {
        this.logger.error(
          `[Referral] Refund disqualification failed: ${err instanceof Error ? err.message : String(err)}`,
        );
      });
    }

    return this.getAdminTransactionById(id);
  }
}
