import { Controller, Get, Query, Req, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CommercialGuard } from './guards/commercial.guard';
import { CommercialService } from './commercial.service';

@Controller('api/commercial')
@UseGuards(JwtAuthGuard, CommercialGuard)
export class CommercialController {
  constructor(private readonly service: CommercialService) {}

  private uid(req: any): number {
    return req.user?.sub || req.user?.id;
  }

  @Get('me')
  async getProfile(@Req() req: any) {
    return this.service.findByUserId(this.uid(req));
  }

  @Get('stats')
  async getStats(@Req() req: any) {
    const profile = await this.service.findByUserId(this.uid(req));
    return this.service.getStats(profile.id);
  }

  @Get('codes')
  async getCodes(@Req() req: any) {
    const profile = await this.service.findByUserId(this.uid(req));
    return this.service.getCodesForCommercial(profile.id);
  }

  @Get('referrals')
  async getReferrals(
    @Req() req: any,
    @Query('page') page = '1',
    @Query('limit') limit = '20',
    @Query('status') status?: string,
  ) {
    const profile = await this.service.findByUserId(this.uid(req));
    return this.service.getReferrals(
      profile.id,
      parseInt(page),
      parseInt(limit),
      status ? { status } : undefined,
    );
  }

  // ─── CHARTS ──────────────────────────────────────────────────────────────

  @Get('chart/referrals')
  async getReferralsChart(
    @Req() req: any,
    @Query('period') period = 'day',
    @Query('range') range = '30',
  ) {
    const profile = await this.service.findByUserId(this.uid(req));
    return this.service.getReferralsChart(profile.id, period, parseInt(range));
  }

  @Get('chart/revenue')
  async getRevenueChart(
    @Req() req: any,
    @Query('period') period = 'day',
    @Query('range') range = '30',
  ) {
    const profile = await this.service.findByUserId(this.uid(req));
    return this.service.getRevenueChart(profile.id, period, parseInt(range));
  }
}
