import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CommercialProfile } from './entities/commercial-profile.entity';
import { CommercialService } from './commercial.service';
import { CommercialController } from './commercial.controller';
import { AdminCommercialController } from './admin-commercial.controller';
import { PromoCode } from '../promo-codes/entities/promo-code.entity';
import { PromoCodeRedemption } from '../promo-codes/entities/promo-code-redemption.entity';
import { User } from '../users/entities/user.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      CommercialProfile,
      PromoCode,
      PromoCodeRedemption,
      User,
    ]),
  ],
  controllers: [CommercialController, AdminCommercialController],
  providers: [CommercialService],
  exports: [CommercialService],
})
export class CommercialModule {}
