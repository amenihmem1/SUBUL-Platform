import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { LabCloudCredential } from './entities/lab-cloud-credential.entity';
import { LabAccessSession } from './entities/lab-access-session.entity';
import { LabAccessService } from './lab-access.service';
import { LabAccessController } from './lab-access.controller';
import { SubscriptionsModule } from '../subscriptions/subscriptions.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([LabCloudCredential, LabAccessSession]),
    SubscriptionsModule,
  ],
  providers: [LabAccessService],
  controllers: [LabAccessController],
  exports: [LabAccessService],
})
export class LabAccessModule {}
