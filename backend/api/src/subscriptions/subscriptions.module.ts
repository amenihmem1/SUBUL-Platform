import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SubscriptionPlan } from './entities/subscription-plan.entity';
import { PlanBillingOption } from './entities/plan-billing-option.entity';
import { UserSubscription } from './entities/user-subscription.entity';
import { PaymentTransaction } from '../payments/entities/payment-transaction.entity';
import { User } from '../users/entities/user.entity';
import { UniversityMembership } from '../university/entities/university-membership.entity';
import { UniversityLicense } from '../university/entities/university-license.entity';
import { University } from '../university/entities/university.entity';
import { SubscriptionsService } from './subscriptions.service';
import { SubscriptionsController } from './subscriptions.controller';
import { PublicPlansController } from './public-plans.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      SubscriptionPlan,
      PlanBillingOption,
      UserSubscription,
      PaymentTransaction,
      User,
      UniversityMembership,
      UniversityLicense,
      University,
    ]),
  ],
  controllers: [SubscriptionsController, PublicPlansController],
  providers: [SubscriptionsService],
  exports: [SubscriptionsService, TypeOrmModule],
})
export class SubscriptionsModule {}
