import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsOptional, IsString } from 'class-validator';

export class ImportCertifCoursesDto {
  @ApiPropertyOptional({ description: 'Optional absolute or relative path to certif_courses.json' })
  @IsOptional()
  @IsString()
  filePath?: string;

  @ApiPropertyOptional({ enum: ['upsert_only', 'sync_owned'], default: 'upsert_only' })
  @IsOptional()
  @IsIn(['upsert_only', 'sync_owned'])
  mode?: 'upsert_only' | 'sync_owned';
}
