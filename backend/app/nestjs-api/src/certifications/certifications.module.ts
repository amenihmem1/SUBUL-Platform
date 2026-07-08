import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CertificationsService } from './certifications.service';
import { CertificationsController } from './certifications.controller';
import { Certification } from './entities/certification.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Certification])],
  controllers: [CertificationsController],
  providers: [CertificationsService],
})
export class CertificationsModule {}