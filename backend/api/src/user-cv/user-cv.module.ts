import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MulterModule } from '@nestjs/platform-express';
import { UserCv } from './entities/user-cv.entity';
import { UserCvController } from './user-cv.controller';
import { UserCvService } from './user-cv.service';
import { AgentsModule } from '../agents/agents.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([UserCv]),
    AgentsModule,
    MulterModule.register({ dest: process.env.UPLOAD_DIR || './uploads/cvs' }),
  ],
  controllers: [UserCvController],
  providers: [UserCvService],
  exports: [UserCvService],
})
export class UserCvModule {}
