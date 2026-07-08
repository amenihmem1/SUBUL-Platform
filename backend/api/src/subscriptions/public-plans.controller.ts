import { Controller, Get, Logger } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { SubscriptionsService } from './subscriptions.service';

@ApiTags('Public')
@Controller('api/public/plans')
export class PublicPlansController {
  private readonly logger = new Logger(PublicPlansController.name);

  constructor(private readonly subscriptionsService: SubscriptionsService) {}

  @Get()
  @ApiOperation({ summary: 'List all public subscription plans for the frontend' })
  async getPublicPlans() {
    const plans = await this.subscriptionsService.findAllPlans();
    
    // Filter out hidden/internal plans and inactive plans, then sort
    const publicPlans = plans
      .filter(p => p.isActive && p.visibility === 'public')
      .map(p => {
        // Parse features block safely
        let featuresObj = {};
        try {
          featuresObj = p.features ? JSON.parse(p.features) : {};
        } catch {
          // ignore
        }

        // Only return active billing options
        const activeBilling = p.billingOptions?.filter(o => o.isActive) || [];

        return {
          id: p.id,
          slug: p.slug,
          name: p.name,
          description: p.description,
          type: p.type,
          sortOrder: p.sortOrder,
          badgeText: p.badgeText,
          themeColor: p.themeColor,
          features: featuresObj,
          billingOptions: activeBilling.map(opt => ({
            id: opt.id,
            region: opt.region,
            cycle: opt.cycle,
            priceCents: opt.priceCents,
            currency: opt.currency,
            discountText: opt.discountText
          }))
        };
      });

    if (process.env.LOG_PUBLIC_PLANS === 'true') {
      this.logger.log(
        `[PublicPlans] count=${publicPlans.length} slugs=${publicPlans.map((p) => p.slug).join(',') || '(none)'}`,
      );
    }

    return publicPlans;
  }
}
