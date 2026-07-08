import {
  Controller, Post, Get, Headers, Req, Body, Query,
  HttpCode, HttpStatus, Logger, RawBodyRequest, BadRequestException
} from '@nestjs/common';
import { Request } from 'express';
import { InjectMetric } from '@willsoto/nestjs-prometheus';
import { Counter } from 'prom-client';
import { PaymentsService } from './payments.service';
import { StripeProvider } from './providers/stripe.provider';

@Controller('api/webhooks')
export class WebhooksController {
  private readonly logger = new Logger(WebhooksController.name);

  constructor(
    private readonly payments: PaymentsService,
    private readonly stripe: StripeProvider,
    @InjectMetric('stripe_revenue_usd_total')     private readonly stripeRevenue: Counter<string>,
    @InjectMetric('stripe_payment_intents_total') private readonly stripePayments: Counter<string>,
    @InjectMetric('paid_api_failures_total')      private readonly paidFailures: Counter<string>,
  ) {}

  @Post('stripe')
  @HttpCode(HttpStatus.OK)
  async stripeWebhook(
    @Headers('stripe-signature') signature: string,
    @Req() req: RawBodyRequest<Request>,
  ) {
    if (!signature) throw new BadRequestException('Missing stripe-signature header');

    const rawBody = req.rawBody;
    if (!rawBody) throw new BadRequestException('Raw body not available');

    let event: any;
    try {
      event = this.stripe.verifyWebhookSignature(rawBody, signature);
    } catch (err) {
      this.logger.error(`[Stripe Webhook] Signature verification failed: ${err instanceof Error ? err.message : String(err)}`);
      throw new BadRequestException('Invalid webhook signature');
    }

    this.logger.log(`[Stripe Webhook] Event received: ${event.type}`);

    // Return 200 immediately — Stripe requires fast acknowledgement.
    // Processing is fire-and-forget to avoid retry storms from Stripe.
    const pi = event.data?.object;
    const piId: string | undefined = pi?.id;

    if (event.type === 'payment_intent.succeeded' && piId) {
      const amountUsd  = (pi?.amount_received ?? pi?.amount ?? 0) / 100;
      const currency   = (pi?.currency ?? 'usd').toLowerCase();
      const planSlug   = pi?.metadata?.planSlug ?? 'unknown';
      this.stripeRevenue.labels({ plan: planSlug, currency }).inc(amountUsd);
      this.stripePayments.labels({ status: 'succeeded', plan: planSlug }).inc();
      this.payments.handleStripePaymentSuccess(piId, event).catch((err) =>
        this.logger.error(`[Stripe] Success handler error: ${err instanceof Error ? err.message : String(err)}`),
      );
    } else if (event.type === 'payment_intent.payment_failed' && piId) {
      const planSlug = pi?.metadata?.planSlug ?? 'unknown';
      this.stripePayments.labels({ status: 'failed', plan: planSlug }).inc();
      this.paidFailures.labels({ provider: 'stripe', agent: 'api', error_type: 'payment_failed' }).inc();
      this.payments.handleStripePaymentFailure(piId, event).catch((err) =>
        this.logger.error(`[Stripe] Failure handler error: ${err instanceof Error ? err.message : String(err)}`),
      );
    } else if (event.type === 'payment_intent.canceled' && piId) {
      this.payments.handleStripePaymentCancelled(piId, event).catch((err) =>
        this.logger.error(`[Stripe] Cancel handler error: ${err instanceof Error ? err.message : String(err)}`),
      );
    } else if (event.type === 'charge.refunded' && pi?.payment_intent) {
      this.payments.handleStripeRefund(pi.payment_intent, event).catch((err) =>
        this.logger.error(`[Stripe] Refund handler error: ${err instanceof Error ? err.message : String(err)}`),
      );
    } else if (event.type === 'charge.dispute.created' && pi?.payment_intent) {
      this.payments.handleStripeChargeback(pi.payment_intent, event).catch((err) =>
        this.logger.error(`[Stripe] Chargeback handler error: ${err instanceof Error ? err.message : String(err)}`),
      );
    } else {
      this.logger.debug(`[Stripe Webhook] Unhandled event type: ${event.type}`);
    }

    return { received: true };
  }

  /**
   * Flouci redirect callback (GET) — user is sent here from Flouci's hosted page.
   * success_link / fail_link land here. We return 200 immediately and verify async.
   * Per Flouci docs, always call verify_payment server-side; never trust the redirect alone.
   */
  @Get('flouci/callback')
  @HttpCode(HttpStatus.OK)
  async flouciRedirectCallback(
    @Query('payment_id') paymentId: string,
    @Query('tx') transactionId: string,
  ) {
    this.logger.log(`[Flouci Redirect] payment_id=${paymentId}, tx=${transactionId}`);
    if (!paymentId) throw new BadRequestException('Missing payment_id');
    await this.payments.handleFlouciCallback(paymentId, transactionId);
    return { received: true, paymentId };
  }

  /**
   * Flouci server-to-server webhook (POST) — optional reliability notification.
   * Flouci calls this when a transaction completes. Per docs, the payload schema
   * is unspecified — we extract payment_id from wherever it appears and verify.
   * Always respond 200 immediately to stop retry pressure.
   */
  @Post('flouci')
  @HttpCode(HttpStatus.OK)
  async flouciWebhook(
    @Body() body: Record<string, any>,
    @Query('payment_id') queryPaymentId: string,
  ) {
    // Docs: webhook payload schema is unspecified — extract payment_id defensively
    const paymentId: string =
      body?.payment_id || body?.paymentId || body?.result?.payment_id || queryPaymentId || '';
    const transactionId: string =
      body?.developer_tracking_id || body?.tracking_id || body?.tx || '';

    this.logger.log(`[Flouci Webhook POST] payment_id=${paymentId}, tracking=${transactionId}`);

    // Respond 200 immediately (stop Flouci from retrying), then verify async
    if (paymentId) {
      // Fire-and-forget: verify_payment is the source of truth per Flouci docs
      this.payments.handleFlouciCallback(paymentId, transactionId || undefined).catch((err) =>
        this.logger.error(`[Flouci Webhook] Async verify error: ${err instanceof Error ? err.message : String(err)}`),
      );
    }

    return { received: true };
  }
}
