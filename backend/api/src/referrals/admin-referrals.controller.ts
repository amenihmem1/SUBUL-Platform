import {
  Controller, Get, Post, Patch, Body, Param, Query,
  UseGuards, HttpCode, HttpStatus, Logger,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AdminGuard } from '../auth/guards/admin.guard';
import { ReferralsService } from './referrals.service';

@Controller('api/admin/referrals')
@UseGuards(JwtAuthGuard, AdminGuard)
export class AdminReferralsController {
  private readonly logger = new Logger(AdminReferralsController.name);

  constructor(private readonly referrals: ReferralsService) {}

  /** GET /api/admin/referrals/stats */
  @Get('stats')
  async getStats() {
    return this.referrals.adminGetStats();
  }

  /** GET /api/admin/referrals?status=qualified&search=email&page=1&limit=20 */
  @Get()
  async listReferrals(
    @Query('status') status?: string,
    @Query('search') search?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.referrals.adminListReferrals({
      status,
      search,
      page: page ? parseInt(page) : 1,
      limit: limit ? parseInt(limit) : 20,
    });
  }

  /** GET /api/admin/referrals/rewards?status=pending_payout&page=1&limit=20 */
  @Get('rewards')
  async listRewards(
    @Query('status') status?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.referrals.adminListRewards({
      status,
      page: page ? parseInt(page) : 1,
      limit: limit ? parseInt(limit) : 20,
    });
  }

  /** GET /api/admin/referrals/payout-requests?status=submitted&page=1&limit=20 */
  @Get('payout-requests')
  async listPayoutRequests(
    @Query('status') status?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.referrals.adminListPayoutRequests({
      status,
      page: page ? parseInt(page) : 1,
      limit: limit ? parseInt(limit) : 20,
    });
  }

  /** GET /api/admin/referrals/payout-requests/:id — request details + items */
  @Get('payout-requests/:id')
  async getPayoutRequest(@Param('id') id: string) {
    return this.referrals.adminGetPayoutRequest(id);
  }

  /** GET /api/admin/referrals/top-referrers */
  @Get('top-referrers')
  async topReferrers(@Query('limit') limit?: string) {
    return this.referrals.adminGetTopReferrers(limit ? parseInt(limit) : 20);
  }

  /** GET /api/admin/referrals/audit-log?entityType=reward&entityId=...&page=1&limit=50 */
  @Get('audit-log')
  async auditLog(
    @Query('entityType') entityType?: string,
    @Query('entityId') entityId?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.referrals.adminListAuditLog({
      entityType,
      entityId,
      page: page ? parseInt(page) : 1,
      limit: limit ? parseInt(limit) : 50,
    });
  }

  /** PATCH /api/admin/referrals/payout-requests/:id/approve */
  @Patch('payout-requests/:id/approve')
  @HttpCode(HttpStatus.OK)
  async approvePayoutRequest(
    @Param('id') id: string,
    @Body() body: { adminNotes?: string },
  ) {
    return this.referrals.adminApprovePayoutRequest(id, body.adminNotes);
  }

  /** PATCH /api/admin/referrals/payout-requests/:id/reject */
  @Patch('payout-requests/:id/reject')
  @HttpCode(HttpStatus.OK)
  async rejectPayoutRequest(
    @Param('id') id: string,
    @Body() body: { adminNotes: string },
  ) {
    return this.referrals.adminRejectPayoutRequest(id, body.adminNotes);
  }

  /** PATCH /api/admin/referrals/payout-requests/:id/mark-paid */
  @Patch('payout-requests/:id/mark-paid')
  @HttpCode(HttpStatus.OK)
  async markPaidPayoutRequest(
    @Param('id') id: string,
    @Body() body: { adminNotes?: string },
  ) {
    return this.referrals.adminMarkPaidPayoutRequest(id, body.adminNotes);
  }

  /** PATCH /api/admin/referrals/:id/flag-fraud */
  @Patch(':id/flag-fraud')
  @HttpCode(HttpStatus.OK)
  async flagFraud(
    @Param('id') id: string,
    @Body() body: { flags: string[]; adminNotes?: string },
  ) {
    return this.referrals.adminFlagFraud(id, body.flags, body.adminNotes);
  }

  /** PATCH /api/admin/referrals/:id/reject */
  @Patch(':id/reject')
  @HttpCode(HttpStatus.OK)
  async rejectReferral(
    @Param('id') id: string,
    @Body() body: { adminNotes: string },
  ) {
    return this.referrals.adminRejectReferral(id, body.adminNotes);
  }

  /** POST /api/admin/referrals/recompute — trigger full recompute for all users */
  @Post('recompute')
  @HttpCode(HttpStatus.OK)
  async recomputeAll() {
    return this.referrals.recompute();
  }
}
