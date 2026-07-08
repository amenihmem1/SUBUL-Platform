import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { HttpModule } from '@nestjs/axios';
import { makeCounterProvider } from '@willsoto/nestjs-prometheus';
import { PaymentTransaction } from './entities/payment-transaction.entity';
import { PaymentsService } from './payments.service';
import { PaymentsController } from './payments.controller';
import { WebhooksController } from './webhooks.controller';
import { StripeProvider } from './providers/stripe.provider';
import { FlouciProvider } from './providers/flouci.provider';
import { GeoModule } from '../geo/geo.module';
import { PromoCodesModule } from '../promo-codes/promo-codes.module';
import { SubscriptionsModule } from '../subscriptions/subscriptions.module';
import { UsersModule } from '../users/users.module';
import { MailModule } from '../mail/mail.module';
import { ReferralsModule } from '../referrals/referrals.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([PaymentTransaction]),
    HttpModule,
    GeoModule,
    PromoCodesModule,
    SubscriptionsModule,
    UsersModule,
    MailModule,
    ReferralsModule,
  ],
  controllers: [PaymentsController, WebhooksController],
  providers: [
    PaymentsService,
    StripeProvider,
    FlouciProvider,
    makeCounterProvider({ name: 'stripe_revenue_usd_total',     help: 'Stripe revenue in USD',          labelNames: ['plan', 'currency'] }),
    makeCounterProvider({ name: 'stripe_payment_intents_total', help: 'Stripe payment intent outcomes', labelNames: ['status', 'plan'] }),
    makeCounterProvider({ name: 'paid_api_failures_total',      help: 'Failed paid external API calls', labelNames: ['provider', 'agent', 'error_type'] }),
  ],
  exports: [PaymentsService],
})
export class PaymentsModule {}
