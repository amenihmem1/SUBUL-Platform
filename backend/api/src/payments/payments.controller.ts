import {
  Controller, Post, Get, Body, Req, Param, Query,
  UseGuards, HttpCode, HttpStatus, Logger
} from '@nestjs/common';
import { Request } from 'express';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AdminGuard } from '../auth/guards/admin.guard';
import { PaymentsService } from './payments.service';
import { GeoService } from '../geo/geo.service';
import { InitiateCheckoutDto } from './dto/initiate-checkout.dto';
import { extractIp, extractIpDebug } from '../common/utils/ip-extraction.util';

@Controller('api/payments')
export class PaymentsController {
  private readonly logger = new Logger(PaymentsController.name);

  constructor(
    private readonly payments: PaymentsService,
    private readonly geoService: GeoService,
  ) {}

  /**
   * Public: Detect country/currency/provider for the caller's IP.
   * Also exposes raw header snapshot for production debugging.
   */
  @Get('detect-geo')
  async detectGeo(@Req() req: Request) {
    const debugInfo = extractIpDebug(req);
    const ip = debugInfo.extractedIp;

    this.logger.log(
      `[GeoDebug] socket=${debugInfo.headers.socketRemoteAddress} ` +
      `express=${debugInfo.headers.expressReqIp} ` +
      `xff=${JSON.stringify(debugInfo.headers.xForwardedFor)} ` +
      `x-real-ip=${debugInfo.headers.xRealIp} → extracted=${ip}`,
    );

    const result = await this.geoService.detectCountry(ip);
    return {
      ...debugInfo,
      geo: {
        ...result,
        selectedCurrency: result.pricingRegion === 'TN' ? 'TND'
          : result.pricingRegion === 'US' ? 'USD'
          : result.pricingRegion === 'EU' ? 'EUR'
          : 'EUR', // default fallback
      },
      pricingRegion: result.pricingRegion,
      fallbackUsed: result.countryCode === null,
      reason: result.countryCode === null
        ? 'proxycheck_and_ipapi_failed'
        : 'geo_lookup_success',
    };
  }

  @Get('pricing')
  async pricing(@Req() req: Request, @Query('planSlug') planSlug?: string) {
    const ip = extractIp(req);
    return this.payments.getPricingForIp(ip, planSlug);
  }

  /** Authenticated: Create Stripe PaymentIntent */
  @Post('checkout/stripe')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.CREATED)
  async checkoutStripe(
    @Body() dto: InitiateCheckoutDto,
    @Req() req: Request & { user?: any },
  ) {
    const ip = extractIp(req);
    const userId: number | undefined = req.user?.sub || req.user?.id;
    const userEmail: string | undefined = req.user?.email;
    return this.payments.createStripeCheckout(dto, ip, userId, userEmail);
  }

  /** Authenticated: Unified checkout (provider resolved on backend) */
  @Post('checkout')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.CREATED)
  async checkout(
    @Body() dto: InitiateCheckoutDto,
    @Req() req: Request & { user?: any },
  ) {
    const ip = extractIp(req);
    const userId: number | undefined = req.user?.sub || req.user?.id;
    const userEmail: string | undefined = req.user?.email;
    return this.payments.createCheckout(dto, ip, userId, userEmail);
  }

  /** Authenticated: Initiate Flouci payment */
  @Post('checkout/flouci')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.CREATED)
  async checkoutFlouci(
    @Body() dto: InitiateCheckoutDto,
    @Req() req: Request & { user?: any },
  ) {
    const ip = extractIp(req);
    const userId: number | undefined = req.user?.sub || req.user?.id;
    const userEmail: string | undefined = req.user?.email;
    return this.payments.createFlouciCheckout(dto, ip, userId, userEmail);
  }

  /** Public: Get transaction status (plus debug metadata for Flouci) */
  @Get('transaction/:id')
  async getTransaction(@Param('id') id: string) {
    const tx = await this.payments.getTransactionById(id);
    if (!tx) return { status: 'not_found' };

    // Expose a diagnostic snapshot from providerMetadata so the
    // return page and admin dashboard can display the raw Flouci status.
    let providerDebug: Record<string, unknown> = {};
    if (tx.provider === 'flouci' && tx.providerMetadata) {
      try {
        const meta = JSON.parse(tx.providerMetadata);
        // Extract diagnostic fields from wherever they live in the raw response.
        // Flouci verify responses nest status under result.status;
        // our own error metadata uses stage/error at the top level.
        providerDebug = {
          rawStatus: meta?.result?.status ?? meta?.status ?? undefined,
          flouciSuccess: meta?.success ?? undefined,
          amount: meta?.result?.amount ?? undefined,
          type: meta?.result?.type ?? undefined,
          developerTrackingId: meta?.result?.developer_tracking_id ?? undefined,
          // Our own error metadata (e.g. from amount validation failures)
          stage: meta?.stage ?? undefined,
          error: meta?.error ?? undefined,
          // Payment URL (from initial creation)
          paymentUrl: meta?.paymentUrl ?? undefined,
        };
        // Remove undefined values for cleaner output
        providerDebug = Object.fromEntries(
          Object.entries(providerDebug).filter(([, v]) => v !== undefined),
        );
      } catch { /* ignore parse errors */ }
    }

    return {
      id: tx.id,
      status: tx.status,
      planName: tx.planName,
      billingCycle: tx.billingCycle,
      amountCents: tx.amountCents,
      currency: tx.currency,
      provider: tx.provider,
      createdAt: tx.createdAt,
      updatedAt: tx.updatedAt,
      providerDebug,
    };
  }

  /** Authenticated: expire a stale pending Flouci transaction */
  @Post('transaction/:id/expire-flouci')
  @UseGuards(JwtAuthGuard)
  async expireFlouci(
    @Param('id') id: string,
    @Req() req: Request & { user?: any },
  ) {
    const userId: number | undefined = req.user?.sub || req.user?.id;
    if (!userId) return { status: 'pending' };
    return this.payments.expirePendingFlouciTransaction(id, userId);
  }

  /** Authenticated: verify Stripe PI status and trigger fulfillment if needed */
  @Post('transaction/:id/stripe-verify')
  @UseGuards(JwtAuthGuard)
  async stripeVerify(
    @Param('id') id: string,
    @Req() req: Request & { user?: any },
  ) {
    const userId: number = req.user?.sub || req.user?.id;
    return this.payments.verifyAndFulfillStripeTransaction(id, userId);
  }

  /** Authenticated: force reconciliation for Flouci return flow */
  @Post('transaction/:id/reconcile-flouci')
  @UseGuards(JwtAuthGuard)
  async reconcileFlouci(
    @Param('id') id: string,
    @Query('payment_id') paymentIdFromUrl: string,
    @Req() req: Request & { user?: any },
  ) {
    const userId: number | undefined = req.user?.sub || req.user?.id;
    if (!userId) {
      return { status: 'pending' };
    }
    return this.payments.reconcileFlouciTransaction(id, userId, paymentIdFromUrl || undefined);
  }

  /** Admin: Recent paid transactions (for toast notifications) */
  @Get('admin/recent-paid')
  @UseGuards(JwtAuthGuard, AdminGuard)
  async recentPaid(@Query('since') since?: string) {
    const rows = await this.payments.getRecentPaidTransactions(since);
    return rows.map((tx) => ({
      id: tx.id,
      userId: tx.userId,
      customerEmail: tx.customerEmail,
      planName: tx.planName,
      billingCycle: tx.billingCycle,
      amountCents: tx.amountCents,
      currency: tx.currency,
      paidAt: tx.updatedAt,
    }));
  }

  /** Admin: List all transactions */
  @Get('admin/transactions')
  @UseGuards(JwtAuthGuard, AdminGuard)
  async listTransactions(
    @Query('page') page = '1',
    @Query('limit') limit = '20',
  ) {
    return this.payments.listTransactions(parseInt(page), parseInt(limit));
  }
}
