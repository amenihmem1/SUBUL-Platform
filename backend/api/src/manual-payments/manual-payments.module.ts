import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ManualPaymentRequest } from './entities/manual-payment-request.entity';
import { ManualPaymentsService } from './manual-payments.service';
import { ManualPaymentsController } from './manual-payments.controller';
import { AdminManualPaymentsController } from './admin-manual-payments.controller';
import { SubscriptionsModule } from '../subscriptions/subscriptions.module';
import { MailModule } from '../mail/mail.module';
import { BlobStorageModule } from '../common/S3/s3.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([ManualPaymentRequest]),
    SubscriptionsModule,
    MailModule,
    BlobStorageModule,
  ],
  controllers: [ManualPaymentsController, AdminManualPaymentsController],
  providers: [ManualPaymentsService],
  exports: [ManualPaymentsService],
})
export class ManualPaymentsModule {}
