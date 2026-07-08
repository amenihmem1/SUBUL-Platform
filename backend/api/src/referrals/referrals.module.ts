import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ReferralCode } from './entities/referral-code.entity';
import { Referral } from './entities/referral.entity';
import { ReferralReward } from './entities/referral-reward.entity';
import { PayoutAccount } from './entities/payout-account.entity';
import { PayoutRequest } from './entities/payout-request.entity';
import { PayoutRequestItem } from './entities/payout-request-item.entity';
import { ReferralAuditLog } from './entities/referral-audit-log.entity';
import { ReferralsService } from './referrals.service';
import { ReferralsController } from './referrals.controller';
import { AdminReferralsController } from './admin-referrals.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      ReferralCode,
      Referral,
      ReferralReward,
      PayoutAccount,
      PayoutRequest,
      PayoutRequestItem,
      ReferralAuditLog,
    ]),
  ],
  controllers: [ReferralsController, AdminReferralsController],
  providers: [ReferralsService],
  exports: [ReferralsService],
})
export class ReferralsModule {}
