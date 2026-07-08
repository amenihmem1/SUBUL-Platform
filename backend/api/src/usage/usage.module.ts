import { Module } from '@nestjs/common';
import { makeCounterProvider } from '@willsoto/nestjs-prometheus';
import { SubscriptionsModule } from '../subscriptions/subscriptions.module';
import { UsageController } from './usage.controller';
import { UsageService } from './usage.service';

@Module({
  imports: [SubscriptionsModule],
  controllers: [UsageController],
  providers: [
    UsageService,
    makeCounterProvider({ name: 'deepgram_audio_seconds_total', help: 'Deepgram STT audio seconds reported by clients', labelNames: ['user_tier'] }),
    makeCounterProvider({ name: 'deepgram_cost_usd_total',      help: 'Estimated Deepgram cost in USD',                 labelNames: ['user_tier'] }),
    makeCounterProvider({ name: 'deepgram_sessions_total',      help: 'Deepgram STT sessions',                          labelNames: ['status'] }),
    makeCounterProvider({ name: 'cartesia_characters_total',    help: 'Cartesia TTS characters reported by clients',    labelNames: ['user_tier'] }),
    makeCounterProvider({ name: 'cartesia_cost_usd_total',      help: 'Estimated Cartesia cost in USD',                 labelNames: ['user_tier'] }),
    makeCounterProvider({ name: 'cartesia_requests_total',      help: 'Cartesia TTS requests',                          labelNames: ['status'] }),
  ],
  exports: [UsageService],
})
export class UsageModule {}
