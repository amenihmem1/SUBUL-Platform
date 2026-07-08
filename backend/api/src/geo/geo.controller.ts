import { Controller, Get, Logger, Req } from '@nestjs/common';
import { Request } from 'express';
import { GeoService } from './geo.service';
import { extractIp, extractIpDebug } from '../common/utils/ip-extraction.util';

/**
 * Production debug endpoint — call from browser to see exactly what IP and country
 * the backend detects. Use this to diagnose geo detection issues in production.
 *
 * Example:
 *   curl https://app.subul.uk/api/geo/debug
 *   curl -H "X-Forwarded-For: 85.10.0.1" https://app.subul.uk/api/geo/debug
 */
@Controller('api/geo')
export class GeoController {
  private readonly logger = new Logger(GeoController.name);

  constructor(private readonly geoService: GeoService) {}

  @Get('debug')
  async debug(@Req() req: Request) {
    const debugInfo = extractIpDebug(req);
    const extractedIp = debugInfo.extractedIp;

    this.logger.log(
      `[GeoDebug] socket=${debugInfo.headers.socketRemoteAddress} ` +
      `express=${debugInfo.headers.expressReqIp} ` +
      `xff=${JSON.stringify(debugInfo.headers.xForwardedFor)} ` +
      `x-real-ip=${debugInfo.headers.xRealIp} → extracted=${extractedIp}`,
    );

    const geo = await this.geoService.detectCountry(extractedIp);

    return {
      ...debugInfo,
      geo: {
        ...geo,
        selectedCurrency: geo.pricingRegion === 'TN' ? 'TND'
          : geo.pricingRegion === 'US' ? 'USD'
          : geo.pricingRegion === 'EU' ? 'EUR'
          : 'EUR', // default fallback
      },
      pricingRegion: geo.pricingRegion,
      fallbackUsed: geo.countryCode === null,
      reason: geo.countryCode === null
        ? 'proxycheck_and_ipapi_failed'
        : 'geo_lookup_success',
    };
  }
}
