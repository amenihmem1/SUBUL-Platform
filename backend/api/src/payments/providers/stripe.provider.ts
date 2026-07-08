import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Stripe from 'stripe';
import { getPaymentConfig } from '../../config/payment.config';
import { BillingCycle } from '../entities/payment-transaction.entity';

@Injectable()
export class StripeProvider {
  private readonly stripe: Stripe | null;
  private readonly logger = new Logger(StripeProvider.name);

  constructor(private readonly config: ConfigService) {
    const cfg = getPaymentConfig(config);
    const secretKey = (cfg.stripe.secretKey || '').trim();
    if (!secretKey || !secretKey.startsWith('sk_')) {
      this.logger.warn(
        'Stripe is disabled: STRIPE_SECRET_KEY is missing or invalid. Stripe checkout routes will return configuration errors until fixed.',
      );
      this.stripe = null;
      return;
    }

    this.stripe = new Stripe(secretKey, {
      // Must stay aligned with frontend @stripe/stripe-js version.
      // @stripe/stripe-js v9 → acacia; dahlia (2026-03-25) causes 400 on elements/sessions.
      apiVersion: '2024-11-20.acacia' as any,
    });
  }

  private getClient(): Stripe {
    if (!this.stripe) {
      throw new BadRequestException('Stripe is not configured on this environment.');
    }
    return this.stripe;
  }

  getPublishableKey(): string {
    return getPaymentConfig(this.config).stripe.publishableKey;
  }

  getPriceId(billingCycle: BillingCycle): string {
    const prices = getPaymentConfig(this.config).stripe.prices;
    const map: Record<BillingCycle, string> = {
      monthly: prices.standardMonthly,
      quarterly: prices.standardQuarterly,
      semester: prices.standardQuarterly,
      annual: prices.standardAnnual,
    };
    return map[billingCycle];
  }

  async createPaymentIntent(params: {
    amountCents: number;
    currency: string;
    idempotencyKey: string;
    metadata?: Record<string, string>;
    customerEmail?: string;
    description?: string;
  }): Promise<Stripe.PaymentIntent> {
    const pi = await this.getClient().paymentIntents.create(
      {
        amount: params.amountCents,
        currency: params.currency.toLowerCase(),
        automatic_payment_methods: { enabled: true },
        metadata: params.metadata || {},
        receipt_email: params.customerEmail,
        // Card PaymentIntents require `statement_descriptor_suffix`, not `statement_descriptor`
        // (max 22 chars; appended to the account default descriptor)
        statement_descriptor_suffix: 'SUBUL',
        // Visible in Stripe dashboard for easier reconciliation
        description: params.description || 'Subul Platform Subscription',
      },
      { idempotencyKey: params.idempotencyKey },
    );
    this.logger.log(`[Stripe] Created PaymentIntent ${pi.id}`);
    return pi;
  }

  async retrievePaymentIntent(id: string): Promise<Stripe.PaymentIntent> {
    return this.getClient().paymentIntents.retrieve(id);
  }

  /** Full refund for a succeeded PaymentIntent (admin action). */
  async createRefundForPaymentIntent(paymentIntentId: string): Promise<Stripe.Refund> {
    const refund = await this.getClient().refunds.create({
      payment_intent: paymentIntentId,
    });
    this.logger.log(`[Stripe] Created refund ${refund.id} for PaymentIntent ${paymentIntentId}`);
    return refund;
  }

  verifyWebhookSignature(rawBody: Buffer, signature: string): Stripe.Event {
    const webhookSecret = getPaymentConfig(this.config).stripe.webhookSecret;
    return this.getClient().webhooks.constructEvent(rawBody, signature, webhookSecret);
  }
}
