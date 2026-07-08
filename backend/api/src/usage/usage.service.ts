import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectMetric } from '@willsoto/nestjs-prometheus';
import { Counter } from 'prom-client';
import { SubscriptionsService } from '../subscriptions/subscriptions.service';
import { VoiceSttUsageDto, VoiceTtsUsageDto } from './dto/voice-usage.dto';

@Injectable()
export class UsageService {
  private readonly logger = new Logger(UsageService.name);

  private readonly deepgramPerMinute: number;
  private readonly cartesiaPer1kChars: number;

  constructor(
    private readonly config: ConfigService,
    private readonly subscriptions: SubscriptionsService,
    @InjectMetric('deepgram_audio_seconds_total') private readonly deepgramSeconds: Counter<string>,
    @InjectMetric('deepgram_cost_usd_total')      private readonly deepgramCost: Counter<string>,
    @InjectMetric('deepgram_sessions_total')       private readonly deepgramSessions: Counter<string>,
    @InjectMetric('cartesia_characters_total')     private readonly cartesiaChars: Counter<string>,
    @InjectMetric('cartesia_cost_usd_total')       private readonly cartesiaCost: Counter<string>,
    @InjectMetric('cartesia_requests_total')       private readonly cartesiaRequests: Counter<string>,
  ) {
    this.deepgramPerMinute  = parseFloat(this.config.get<string>('COST_DEEPGRAM_PER_MINUTE',    '0.0043'));
    this.cartesiaPer1kChars = parseFloat(this.config.get<string>('COST_CARTESIA_PER_1K_CHARS',  '0.065'));
  }

  async recordSttUsage(userId: number, dto: VoiceSttUsageDto): Promise<void> {
    const tier = await this.resolveUserTier(userId);
    const minutes = dto.audioSeconds / 60;
    const cost    = minutes * this.deepgramPerMinute;

    this.deepgramSeconds.labels({ user_tier: tier }).inc(dto.audioSeconds);
    this.deepgramCost.labels(   { user_tier: tier }).inc(cost);
    this.deepgramSessions.labels({ status: 'completed' }).inc();

    this.logger.debug(`[STT] user=${userId} tier=${tier} secs=${dto.audioSeconds} cost=$${cost.toFixed(5)}`);
  }

  async recordTtsUsage(userId: number, dto: VoiceTtsUsageDto): Promise<void> {
    const tier = await this.resolveUserTier(userId);
    const cost = (dto.characters / 1_000) * this.cartesiaPer1kChars;

    this.cartesiaChars.labels(   { user_tier: tier }).inc(dto.characters);
    this.cartesiaCost.labels(    { user_tier: tier }).inc(cost);
    this.cartesiaRequests.labels({ status: 'completed' }).inc();

    this.logger.debug(`[TTS] user=${userId} tier=${tier} chars=${dto.characters} cost=$${cost.toFixed(5)}`);
  }

  private async resolveUserTier(userId: number): Promise<string> {
    try {
      const access = await this.subscriptions.resolveAccessProfile(userId);
      return access.effectivePlanSlug ?? 'free';
    } catch {
      return 'free';
    }
  }
}
