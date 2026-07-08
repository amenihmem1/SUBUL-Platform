import { Module } from '@nestjs/common';
import { BlobStorageService } from './s3.service';

@Module({
  providers: [BlobStorageService],
  exports: [BlobStorageService],
})
export class BlobStorageModule {}
