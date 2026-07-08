import { Injectable, Logger, BadRequestException, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { HttpService } from '@nestjs/axios';
import axios from 'axios';
import { firstValueFrom } from 'rxjs';
import { getPaymentConfig } from '../../config/payment.config';
import { BillingCycle } from '../entities/payment-transaction.entity';

export interface FlouciInitResult {
  paymentId: string;
  paymentUrl: string;
}

export interface FlouciVerifyResult {
  success: boolean;
  paymentId: string;
  status: string;
  raw?: Record<string, any>;
}

@Injectable()
export class FlouciProvider {
  private readonly logger = new Logger(FlouciProvider.name);

  constructor(
    private readonly config: ConfigService,
    private readonly http: HttpService,
  ) {}

  private getApiBaseUrl(): string {
    const cfg = getPaymentConfig(this.config).flouci;
    const raw = (cfg.apiUrl || '').trim().replace(/\/$/, '');
    if (!raw) {
      throw new ServiceUnavailableException('Flouci API URL is not configured.');
    }
    // Accept both ".../api" and ".../api/v2" env values and normalize to v2.
    if (raw.endsWith('/api/v2')) return raw;
    if (raw.endsWith('/api')) return `${raw}/v2`;
    return raw;
  }

  private getAuthHeader(): string {
    const cfg = getPaymentConfig(this.config).flouci;
    if (!cfg.publicToken || !cfg.privateToken) {
      throw new ServiceUnavailableException('Flouci credentials are missing in environment variables.');
    }
    return `Bearer ${cfg.publicToken}:${cfg.privateToken}`;
  }

  private toProviderException(context: string, error: unknown): never {
    if (axios.isAxiosError(error)) {
      const status = error.response?.status;
      const data = error.response?.data;
      const payload = typeof data === 'string' ? data : JSON.stringify(data || {});
      this.logger.error(`[Flouci] ${context} failed (status=${status ?? 'N/A'}) payload=${payload}`);

      if (status === 401 || status === 403) {
        throw new BadRequestException('Flouci authentication failed. Please check FLOUCI tokens.');
      }
      if (status && status >= 400 && status < 500) {
        throw new BadRequestException('Flouci rejected the payment request. Please verify payment parameters.');
      }
      throw new ServiceUnavailableException('Flouci service is temporarily unavailable.');
    }

    this.logger.error(`[Flouci] ${context} failed`, error instanceof Error ? error.stack : String(error));
    throw new ServiceUnavailableException('Flouci service is temporarily unavailable.');
  }

  getAmountMillimes(billingCycle: BillingCycle): number {
    const prices = getPaymentConfig(this.config).flouci.prices;
    const map: Record<BillingCycle, number> = {
      monthly: prices.standardMonthly,
      quarterly: prices.standardQuarterly,
      semester: prices.standardQuarterly,
      annual: prices.standardAnnual,
    };
    return map[billingCycle];
  }

  async initiatePayment(params: {
    amountMillimes: number;
    successUrl: string;
    failUrl: string;
    trackingId: string;
    webhookUrl?: string;
    imageUrl?: string;
    sessionTimeoutSecs?: number;
  }): Promise<FlouciInitResult> {
    const apiBase = this.getApiBaseUrl();
    const authorization = this.getAuthHeader();

    // image_url: optional branding — shows your logo on Flouci's hosted payment page
    // webhook: optional server-to-server notification URL (treat as hint; always verify)
    const body: Record<string, unknown> = {
      amount: String(params.amountMillimes),    // amount in millimes (1 TND = 1000 millimes)
      success_link: params.successUrl,
      fail_link: params.failUrl,
      developer_tracking_id: params.trackingId,
      accept_card: true,
      // NOTE: do NOT send client_id — it activates Payment Binding (restricted feature).
      // Flouci returns "Payment via binding is not activated" if this field is present
      // and the merchant account doesn't have binding enabled.
      ...(params.webhookUrl && { webhook: params.webhookUrl }),
      ...(params.imageUrl && { image_url: params.imageUrl }),
      ...(params.sessionTimeoutSecs && { session_timeout_secs: params.sessionTimeoutSecs }),
    };

    const cfg = getPaymentConfig(this.config).flouci;
    this.logger.log(
      `[Flouci] Initiating payment trackingId=${params.trackingId} ` +
      `amount=${params.amountMillimes} millimes (${(params.amountMillimes / 1000).toFixed(3)} TND) ` +
      `apiUrl=${apiBase} ` +
      `publicToken=${cfg.publicToken ? cfg.publicToken.slice(0, 6) + '…' : 'MISSING'} ` +
      `privateToken=${cfg.privateToken ? cfg.privateToken.slice(0, 6) + '…' : 'MISSING'} ` +
      `imageUrl=${params.imageUrl ?? 'none'} webhookUrl=${params.webhookUrl ?? 'none'}`,
    );
    // Log full request body at INFO level (amount is the most critical field to verify)
    this.logger.log(`[Flouci] generate_payment payload: ${JSON.stringify(body)}`);


    let response: any;
    try {
      response = await firstValueFrom(
        this.http.post(`${apiBase}/generate_payment`, body, {
          timeout: 15000,
          headers: {
            Authorization: authorization,
            'Content-Type': 'application/json',
          },
        }),
      );
    } catch (error) {
      this.toProviderException('Payment initiation', error);
    }

    const data = response.data;

    // Always log raw response in full so errors are diagnosable
    this.logger.debug(`[Flouci] generate_payment raw response: ${JSON.stringify(data)}`);

    // Flouci returns result.success=false on errors even with HTTP 200
    const resultSuccess = data?.result?.success;
    if (resultSuccess === false) {
      // Flouci uses result.error or result.message depending on error type
      const msg = data?.result?.error || data?.result?.message || data?.message || 'Flouci rejected the payment request';
      this.logger.error(`[Flouci] generate_payment failed: ${msg} | full: ${JSON.stringify(data)}`);
      throw new BadRequestException(`Flouci: ${msg}`);
    }

    const paymentId: string | undefined = data?.result?.payment_id;
    const paymentUrl: string | undefined = data?.result?.link;

    if (!paymentUrl || !paymentId) {
      this.logger.error(`[Flouci] Missing link/payment_id in response: ${JSON.stringify(data)}`);
      throw new BadRequestException('Flouci payment initiation failed — unexpected response format');
    }

    return { paymentId, paymentUrl };
  }

  async verifyPayment(paymentId: string): Promise<FlouciVerifyResult> {
    const apiBase = this.getApiBaseUrl();
    const authorization = this.getAuthHeader();

    this.logger.log(`[Flouci] Verifying payment ${paymentId}`);

    let response: any;
    try {
      response = await firstValueFrom(
        this.http.get(`${apiBase}/verify_payment/${paymentId}`, {
          timeout: 10000,
          headers: {
            Authorization: authorization,
          },
        }),
      );
    } catch (error) {
      this.toProviderException('Payment verification', error);
    }

    const data = response.data;
    // Per Flouci docs: top-level `success` boolean must be true,
    // AND result.status must equal 'SUCCESS' to confirm payment.
    // Do NOT read `data.result.success` — that field does not exist in their schema.
    const topLevelSuccess = data?.success === true;
    const resultStatus: string = String(data?.result?.status || '').toUpperCase();
    const success = topLevelSuccess && resultStatus === 'SUCCESS';

    // Always log the full verify response at INFO so failures are visible in prod logs
    this.logger.log(
      `[Flouci] verify_payment(${paymentId}) topLevelSuccess=${topLevelSuccess} ` +
      `resultStatus="${resultStatus}" success=${success} raw=${JSON.stringify(data)}`,
    );

    return {
      success,
      paymentId,
      status: resultStatus || 'UNKNOWN',
      raw: data,
    };
  }
}
