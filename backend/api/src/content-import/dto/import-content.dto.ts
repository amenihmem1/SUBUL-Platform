import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsArray, IsBoolean, IsDefined, IsIn, IsInt, IsNotEmpty, IsObject, IsOptional, IsString, Min } from 'class-validator';
import { Type } from 'class-transformer';

export class ImportCoursesJsonDto {
  @ApiProperty({ description: 'JSON payload compatible with certif_courses.json' })
  @IsObject()
  payload!: Record<string, unknown>;

  @ApiPropertyOptional({ default: true, description: 'Validate and preview only, no DB writes' })
  @IsOptional()
  @IsBoolean()
  dryRun?: boolean;
}

export class ValidateCoursesJsonDto {
  @ApiProperty({ description: 'JSON payload to validate (no DB calls)' })
  @IsObject()
  payload!: Record<string, unknown>;
}

export class ImportLabsJsonDto {
  @ApiProperty({ description: 'Array of interactive labs to import' })
  @IsArray()
  payload!: Array<Record<string, unknown>>;

  @ApiPropertyOptional({ default: true })
  @IsOptional()
  @IsBoolean()
  dryRun?: boolean;
}

export class CertificationImportItemDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  title!: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  provider!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ enum: ['Active', 'Draft', 'Archived'] })
  @IsOptional()
  @IsIn(['Active', 'Draft', 'Archived'])
  status?: 'Active' | 'Draft' | 'Archived';

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  externalId?: string;

  @ApiPropertyOptional({ type: [String], description: 'Course IDs to link with certification' })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  linkedCourseIds?: string[];
}

/**
 * Accepts either:
 *   - nested certif_courses-compatible payload: { certifications: [...] }
 *   - flat array of CertificationImportItemDto: [...]
 *
 * The service inspects the shape at runtime; class-validator only enforces
 * "is this an object or an array" so we can support both inputs from one
 * admin endpoint.
 */
export class ImportCertificationsJsonDto {
  @ApiProperty({
    description:
      'Either { certifications: [...] } (nested certif_courses-compatible) or a flat array of certification items.',
    oneOf: [
      { type: 'object', properties: { certifications: { type: 'array' } } },
      { type: 'array', items: { type: 'object' } },
    ],
  })
  @IsDefined()
  payload!: Record<string, unknown> | Array<Record<string, unknown>>;

  @ApiPropertyOptional({ default: true })
  @IsOptional()
  @IsBoolean()
  dryRun?: boolean;
}

export class AdminContentLabsQueryDto {
  @ApiPropertyOptional({ default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number;

  @ApiPropertyOptional({ default: 20 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  limit?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  search?: string;
}

export class ImportCertificationPathsJsonDto {
  @ApiProperty({ description: 'Certification paths payload: { paths: [...] }' })
  @IsObject()
  payload!: Record<string, unknown>;

  @ApiPropertyOptional({ default: true })
  @IsOptional()
  @IsBoolean()
  dryRun?: boolean;
}

export class ImportPracticeExamsJsonDto {
  @ApiProperty({ description: 'Array of practice exam objects' })
  @IsArray()
  payload!: Array<Record<string, unknown>>;

  @ApiPropertyOptional({ default: true })
  @IsOptional()
  @IsBoolean()
  dryRun?: boolean;
}
