import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { QuoteRequest } from './entities/quote-request.entity';
import { QuoteRequestsPublicController, QuoteRequestsAdminController } from './quote-requests.controller';
import { QuoteRequestsService } from './quote-requests.service';

@Module({
  imports: [TypeOrmModule.forFeature([QuoteRequest])],
  controllers: [QuoteRequestsPublicController, QuoteRequestsAdminController],
  providers: [QuoteRequestsService],
  exports: [QuoteRequestsService],
})
export class QuoteRequestsModule {}
