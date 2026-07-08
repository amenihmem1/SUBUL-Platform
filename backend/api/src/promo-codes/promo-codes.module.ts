import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PromoCode } from './entities/promo-code.entity';
import { PromoCodeRedemption } from './entities/promo-code-redemption.entity';
import { CommercialProfile } from '../commercial/entities/commercial-profile.entity';
import { PromoCodesService } from './promo-codes.service';
import { PromoCodesController } from './promo-codes.controller';
import { PromoCodesPublicController } from './promo-codes.controller';

@Module({
  imports: [TypeOrmModule.forFeature([PromoCode, PromoCodeRedemption, CommercialProfile])],
  controllers: [PromoCodesController, PromoCodesPublicController],
  providers: [PromoCodesService],
  exports: [PromoCodesService],
})
export class PromoCodesModule {}
