import { Controller, Get, Param, Req, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { SubscriptionGuard } from '../auth/guards/subscription.guard';
import { LabAccessService } from './lab-access.service';

@UseGuards(JwtAuthGuard, SubscriptionGuard)
@Controller('api/learner/lab-access')
export class LabAccessController {
  constructor(private readonly labAccessService: LabAccessService) {}

  @Get(':provider')
  getMyAccess(
    @Req() req: { user: { id: number; sub?: number } },
    @Param('provider') provider: string,
  ) {
    const userId: number = (req.user as any)?.id ?? (req.user as any)?.sub;
    return this.labAccessService.getMyAccessSession(userId, provider);
  }
}
