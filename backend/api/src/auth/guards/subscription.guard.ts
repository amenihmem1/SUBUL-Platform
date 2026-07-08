import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import { SubscriptionsService } from '../../subscriptions/subscriptions.service';

@Injectable()
export class SubscriptionGuard implements CanActivate {
  constructor(private readonly subscriptions: SubscriptionsService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const userRole = String(request?.user?.role || '').toLowerCase();
    const userId: number | undefined = request?.user?.sub || request?.user?.id;
    if (!userId) {
      return false;
    }

    // Institutional students bypass SubscriptionGuard — their access is checked by UniversityMemberGuard
    if (userRole === 'student') return true;

    if (userRole !== 'learner') {
      return true;
    }

    const allowed = await this.subscriptions.learnerDashboardAllowed(userId);
    if (!allowed) {
      throw new ForbiddenException('Your trial has expired or no active subscription was found.');
    }
    return true;
  }
}
