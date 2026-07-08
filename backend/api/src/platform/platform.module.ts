import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AgentUsageMonthly } from './entities/agent-usage-monthly.entity';
import { PlatformSetting } from './entities/platform-setting.entity';
import { User } from '../users/entities/user.entity';
import { AgentQuotaService } from './agent-quota.service';
import { SubscriptionsModule } from '../subscriptions/subscriptions.module';

@Module({
  imports: [TypeOrmModule.forFeature([AgentUsageMonthly, PlatformSetting, User]), SubscriptionsModule],
  providers: [AgentQuotaService],
  exports: [AgentQuotaService, TypeOrmModule],
})
export class PlatformModule {}
