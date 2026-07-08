import { Controller, Get, Post, Req, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { SubscriptionsService } from './subscriptions.service';
import { FREE_PLAN_SLUG } from '../config/plans';

@Controller('api/subscriptions')
@UseGuards(JwtAuthGuard)
export class SubscriptionsController {
  constructor(private readonly subscriptions: SubscriptionsService) {}

  @Get('me/status')
  async getMyStatus(@Req() req: any) {
    const userId: number = req.user?.sub || req.user?.id;
    return this.subscriptions.resolveAccessProfile(userId);
  }

  @Post('me/start-trial')
  async startTrial(@Req() req: any) {
    const userId: number = req.user?.sub || req.user?.id;
    await this.subscriptions.assertCanUsePersonalSubscriptionFlow(userId);
    const sub = await this.subscriptions.startTrial(userId, FREE_PLAN_SLUG);
    const status = await this.subscriptions.resolveAccessProfile(userId);
    return { subscriptionId: sub.id, ...status };
  }
}
