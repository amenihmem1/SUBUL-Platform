import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { LabsService } from './labs.service';
import { LabsController } from './labs.controller';
import { Lab } from './entities/lab.entity';
import { LabProgress } from './entities/lab-progress.entity';
import { AuthModule } from '../auth/auth.module';
import { SubscriptionsModule } from '../subscriptions/subscriptions.module';
import { TranslationModule } from '../translation/translation.module';

@Module({
  imports: [TypeOrmModule.forFeature([Lab, LabProgress]), AuthModule, SubscriptionsModule, TranslationModule],
  controllers: [LabsController],
  providers: [LabsService],
  exports: [LabsService],
})
export class LabsModule {}
