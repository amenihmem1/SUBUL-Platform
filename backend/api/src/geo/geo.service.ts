import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';

export interface GeoResult {
  countryCode: string | null;   // ISO 3166-1 alpha-2, e.g. 'TN', 'US', 'FR'
  countryName: string | null;
  isProxy: boolean;
  isVpn: boolean;
  isTor: boolean;
  isHosting: boolean;
  isSuspicious: boolean;
  pricingRegion: 'TN' | 'US' | 'EU' | 'OTHER' | null;
  provider: 'proxycheck' | 'ip-api' | 'fallback' | 'dev-override';
  raw?: Record<string, any>;
}

@Injectable()
export class GeoService {
  private readonly logger = new Logger(GeoService.name);
  private readonly cache = new Map<string, { expiresAt: number; result: GeoResult }>();
  private readonly cacheTtlMs = 1000 * 60 * 10; // 10 min

  constructor(
    private readonly config: ConfigService,
    private readonly http: HttpService,
  ) {}

  private get isProduction(): boolean {
    return (this.config.get<string>('NODE_ENV', 'development') || 'development') === 'production';
  }

  private getDevRegionOverride(): 'TN' | 'US' | 'EU' | null {
    const value = (this.config.get<string>('GEO_DEV_FORCE_REGION', '') || '').trim().toUpperCase();
    if (value === 'TN' || value === 'US' || value === 'EU') return value;
    return null;
  }

  private normalizeIp(ip: string): string {
    const t = (ip || '').trim();
    return t.startsWith('::ffff:') ? t.slice(7) : t;
  }

  private isPrivateIp(ip: string): boolean {
    const n = this.normalizeIp(ip);
    return (
      /^(127\.|10\.|192\.168\.|172\.(1[6-9]|2\d|3[01])\.)/.test(n) ||
      n === '::1' || n === '' || n === 'localhost' ||
      n.startsWith('fc') || n.startsWith('fd') || n.startsWith('fe80:')
    );
  }

  /**
   * Main entry point.
   *
   * In development: if the detected connection IP is private (Docker bridge),
   * also try to use an explicit client IP that was forwarded via X-Forwarded-For
   * by the browser itself (set via the frontend's real-IP detection step).
   *
   * In production: only trust IPs set by the upstream reverse proxy (nginx/ALB).
   * The frontend does the same forwarding but nginx overwrites X-Forwarded-For
   * with $remote_addr before it reaches the API, so there is no spoofing risk.
   */
  async detectCountry(ip: string): Promise<GeoResult> {
    // 1. Static dev override (GEO_DEV_FORCE_REGION env var)
    const devOverride = this.getDevRegionOverride();
    if (devOverride && !this.isProduction) {
      const map: Record<string, { code: string; name: string }> = {
        TN: { code: 'TN', name: 'Tunisia' },
        US: { code: 'US', name: 'United States' },
        EU: { code: 'FR', name: 'France' },
      };
      const { code, name } = map[devOverride];
      this.logger.warn(`[Geo] DEV override: region=${devOverride}`);
      const result = this.buildStaticResult(code, name, devOverride);
      result.provider = 'dev-override';
      return this.cacheAndReturn(this.normalizeIp(ip), result);
    }

    const normalized = this.normalizeIp(ip);

    // 2. Cache hit
    const cached = this.cache.get(normalized);
    if (cached && cached.expiresAt > Date.now()) {
      return cached.result;
    }

    // 3. Private / Docker bridge / VPC IP — geo lookup impossible.
    //    In production this means the ALB IP was not correctly unwrapped from
    //    X-Forwarded-For (trust proxy misconfigured or ALB IP outside private range).
    //    Safe fallback: EU (Stripe EUR) — safer than TN for international users.
    if (this.isPrivateIp(normalized)) {
      this.logger.warn(
        `[Geo] Private/internal IP "${normalized}" received. ` +
        `This usually means trust proxy is not stripping the ALB VPC IP correctly, ` +
        `or X-Forwarded-For was not set. Defaulting to EU (safe international fallback). ` +
        `Fix: verify trust proxy config in main.ts and ALB X-Forwarded-For forwarding.`,
      );
      return this.cacheAndReturn(normalized, this.buildStaticResult('EU', 'Unknown (private IP fallback)', 'EU'));
    }

    // 4. Real public IP — run geo detection
    this.logger.debug(`[Geo] Resolving public IP: ${normalized}`);
    return this.resolvePublicIp(normalized);
  }

  private async resolvePublicIp(ip: string): Promise<GeoResult> {
    // ── Attempt 1: ProxyCheck.io (primary — VPN/proxy/TOR detection + country)
    try {
      const result = await this.checkViaProxyCheck(ip);
      this.logger.log(
        `[Geo] ProxyCheck OK: ip=${ip} country=${result.countryCode} ` +
        `region=${result.pricingRegion} provider=proxycheck`,
      );
      result.provider = 'proxycheck';
      return this.cacheAndReturn(ip, result);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      this.logger.warn(`[Geo] ProxyCheck failed for ${ip}: ${msg}`);
    }

    // ── Attempt 2: ip-api.com (fallback — free, rate-limited at 45 req/min)
    // Retry once with backoff in case of transient rate limit / timeout.
    try {
      const result = await this.checkViaIpApiWithRetry(ip);
      this.logger.log(
        `[Geo] ip-api OK: ip=${ip} country=${result.countryCode} ` +
        `region=${result.pricingRegion} provider=ip-api`,
      );
      result.provider = 'ip-api';
      return this.cacheAndReturn(ip, result);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      this.logger.warn(`[Geo] ip-api fallback failed for ${ip}: ${msg}`);
    }

    // ── Last resort: ALL external geo services failed.
    // This is a CRITICAL failure — log explicitly and fallback to EU.
    // Common root causes in production:
    //   1. EKS pods have no outbound internet (missing NAT gateway / egress rules)
    //   2. PROXYCHECK_API_KEY missing, expired, or rate-limited
    //   3. ip-api.com rate-limited (45 req/min free tier) or unreachable
    //   4. DNS resolution failure inside the pod
    this.logger.error(
      `[Geo] GEO_FAILED — All geo lookups exhausted for ${ip}. ` +
      `Defaulting to EU (EUR) as safe international fallback. ` +
      `TROUBLESHOOT: ` +
      `(1) kubectl exec into pod → curl -s https://proxycheck.io/v2/8.8.8.8?key=$PROXYCHECK_API_KEY ` +
      `(2) curl -s http://ip-api.com/json/8.8.8.8 ` +
      `(3) Verify egress NAT / SecurityGroup allows outbound HTTPS/HTTP.`,
    );
    const result = this.buildStaticResult('EU', 'Unknown (geo services unavailable)', 'EU');
    result.provider = 'fallback';
    return this.cacheAndReturn(ip, result);
  }

  private async checkViaProxyCheck(ip: string): Promise<GeoResult> {
    const apiKey = this.config.get<string>('PROXYCHECK_API_KEY', '');
    // vpn=1  → detect VPNs
    // asn=1  → AS number (useful for hosting detection)
    // risk=1 → risk score
    const url = apiKey
      ? `https://proxycheck.io/v2/${ip}?key=${apiKey}&vpn=1&asn=1&risk=1`
      : `https://proxycheck.io/v2/${ip}?vpn=1`;

    // Use a generous timeout (5s) — production networks can be slow
    const response = await firstValueFrom(
      this.http.get(url, { timeout: 5000 }),
    );
    const data = response.data;

    // Top-level status check
    if (data?.status === 'error' || data?.status === 'denied') {
      throw new Error(
        `ProxyCheck status: ${data.status} — ${data.message ?? ''}`,
      );
    }

    const ipData = data?.[ip] || {};
    const countryCode: string | null = ipData.isocode || null;

    // ProxyCheck sometimes returns proxy/type data but no country (isocode missing).
    // This happens on free tier rate limits or when the IP isn't in their geo DB.
    // Throw so the caller falls through to ip-api.com which has better coverage.
    if (!countryCode) {
      throw new Error(
        `ProxyCheck returned no isocode for ${ip} ` +
        `(raw: ${JSON.stringify(ipData)}) — falling back to ip-api`,
      );
    }

    const isProxy = ipData.proxy === 'yes';
    const isVpn = ipData.type === 'VPN';
    const isTor = ipData.type === 'TOR';
    const isHosting = ipData.type === 'Hosting';

    return {
      countryCode,
      countryName: ipData.country ?? null,
      isProxy,
      isVpn,
      isTor,
      isHosting,
      isSuspicious: isProxy || isVpn || isTor || isHosting,
      pricingRegion: this.resolvePricingRegion(countryCode),
      provider: 'proxycheck',
      raw: ipData,
    };
  }

  /** Wraps checkViaIpApi with one retry (1 s backoff) for transient failures. */
  private async checkViaIpApiWithRetry(ip: string): Promise<GeoResult> {
    try {
      return await this.checkViaIpApi(ip);
    } catch (err) {
      this.logger.warn(
        `[Geo] ip-api first attempt failed for ${ip}, retrying in 1s: ` +
        `${err instanceof Error ? err.message : String(err)}`,
      );
      await new Promise((r) => setTimeout(r, 1000));
      return await this.checkViaIpApi(ip);
    }
  }

  private async checkViaIpApi(ip: string): Promise<GeoResult> {
    // ip-api.com free tier: HTTP only, 45 req/min, no key required
    const url = `http://ip-api.com/json/${ip}?fields=status,country,countryCode,proxy,hosting,query`;
    const response = await firstValueFrom(this.http.get(url, { timeout: 5000 }));
    const data = response.data;

    if (data.status !== 'success') {
      throw new Error(`ip-api returned status="${data.status}" for ${ip}`);
    }

    const countryCode: string | null = data.countryCode || null;

    // ip-api should always return a countryCode for valid public IPs.
    // If it doesn't, throw so we fall through to the final EU fallback.
    if (!countryCode) {
      throw new Error(
        `ip-api returned no countryCode for ${ip} (raw: ${JSON.stringify(data)})`,
      );
    }

    const isProxy = !!data.proxy;
    const isHosting = !!data.hosting;

    return {
      countryCode,
      countryName: data.country ?? null,
      isProxy,
      isVpn: isProxy, // ip-api doesn't distinguish VPN vs proxy; treat the same
      isTor: false,
      isHosting,
      isSuspicious: isProxy || isHosting,
      pricingRegion: this.resolvePricingRegion(countryCode),
      provider: 'ip-api',
      raw: data,
    };
  }

  private resolvePricingRegion(code: string | null): 'TN' | 'US' | 'EU' | 'OTHER' | null {
    if (!code) return null;
    if (code === 'TN') return 'TN';
    if (code === 'US') return 'US';
    // EU members + all other countries (incl. UK, CA, AU, UAE, …) → Stripe EUR
    return 'EU';
  }

  private buildStaticResult(
    countryCode: string | null,
    countryName: string | null,
    pricingRegion: 'TN' | 'US' | 'EU' | 'OTHER' | null,
    isSuspicious = false,
  ): GeoResult {
    return {
      countryCode,
      countryName,
      isProxy: false,
      isVpn: false,
      isTor: false,
      isHosting: false,
      isSuspicious,
      pricingRegion,
      provider: 'fallback',
    };
  }

  private cacheAndReturn(key: string, result: GeoResult): GeoResult {
    this.cache.set(key, { expiresAt: Date.now() + this.cacheTtlMs, result });
    return result;
  }
}
