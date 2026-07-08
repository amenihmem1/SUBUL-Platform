import {
  Controller, Get, Post, Delete, Body, Req, UseGuards, HttpCode, HttpStatus, Logger, Param,
} from '@nestjs/common';
import { Request } from 'express';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { ReferralsService } from './referrals.service';
import { PayoutMethod } from './entities/payout-account.entity';

@Controller('api/referral')
@UseGuards(JwtAuthGuard)
export class ReferralsController {
  private readonly logger = new Logger(ReferralsController.name);

  constructor(private readonly referrals: ReferralsService) {}

  /** GET /api/referral/me — returns referral code, link, progress, reward */
  @Get('me')
  async getMe(@Req() req: Request & { user?: any }) {
    const userId: number = req.user?.sub || req.user?.id;
    return this.referrals.getMyStats(userId);
  }

  /**
   * GET /api/referral/rewards — list reward ledger entries
   */
  @Get('rewards')
  async listRewards(@Req() req: Request & { user?: any }) {
    const userId: number = req.user?.sub || req.user?.id;
    return this.referrals.listMyRewards(userId);
  }

  /** GET /api/referral/payout-accounts */
  @Get('payout-accounts')
  async listPayoutAccounts(@Req() req: Request & { user?: any }) {
    const userId: number = req.user?.sub || req.user?.id;
    return this.referrals.listPayoutAccounts(userId);
  }

  /** POST /api/referral/payout-accounts */
  @Post('payout-accounts')
  @HttpCode(HttpStatus.OK)
  async createPayoutAccount(
    @Req() req: Request & { user?: any },
    @Body() body: { method: PayoutMethod; label?: string; accountDetails: Record<string, string> },
  ) {
    const userId: number = req.user?.sub || req.user?.id;
    return this.referrals.createPayoutAccount(userId, body.method, body.accountDetails, body.label);
  }

  /** DELETE /api/referral/payout-accounts/:id */
  @Delete('payout-accounts/:id')
  @HttpCode(HttpStatus.OK)
  async deletePayoutAccount(
    @Req() req: Request & { user?: any },
    @Param('id') id: string,
  ) {
    const userId: number = req.user?.sub || req.user?.id;
    return this.referrals.deactivatePayoutAccount(userId, id);
  }

  /** GET /api/referral/payout-requests */
  @Get('payout-requests')
  async listPayoutRequests(@Req() req: Request & { user?: any }) {
    const userId: number = req.user?.sub || req.user?.id;
    return this.referrals.listMyPayoutRequests(userId);
  }

  /** POST /api/referral/payout-requests */
  @Post('payout-requests')
  @HttpCode(HttpStatus.OK)
  async createPayoutRequest(
    @Req() req: Request & { user?: any },
    @Body() body: { rewardIds: string[]; payoutAccountId: string },
  ) {
    const userId: number = req.user?.sub || req.user?.id;
    return this.referrals.createPayoutRequest(userId, body.rewardIds, body.payoutAccountId);
  }

  /** POST /api/referral/claim-all */
  @Post('claim-all')
  @HttpCode(HttpStatus.OK)
  async claimAll(
    @Req() req: Request & { user?: any },
    @Body() body: { payoutAccountId: string },
  ) {
    const userId: number = req.user?.sub || req.user?.id;
    return this.referrals.claimAll(userId, body.payoutAccountId);
  }

  /**
   * POST /api/referral/recompute
   * Manually re-sync referral statuses for current user.
   */
  @Post('recompute')
  @HttpCode(HttpStatus.OK)
  async recompute(@Req() req: Request & { user?: any }) {
    const userId: number = req.user?.sub || req.user?.id;
    return this.referrals.recompute(userId);
  }
}
