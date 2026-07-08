import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString, IsNotEmpty, IsOptional, IsInt, IsArray,
  IsHexColor, IsObject, IsUrl, IsIn, Min, Max,
} from 'class-validator';

export class CreateCertificationDto {
  @ApiProperty({ example: 'AZ-900: Microsoft Azure Fundamentals' })
  @IsString() @IsNotEmpty()
  title!: string;

  @ApiProperty({ example: 'Microsoft' })
  @IsString() @IsNotEmpty()
  provider!: string;

  @ApiPropertyOptional()
  @IsString() @IsOptional()
  description?: string;

  @ApiPropertyOptional({ example: '4 semaines' })
  @IsString() @IsOptional()
  duration?: string;

  @ApiPropertyOptional({ example: '165€' })
  @IsString() @IsOptional()
  price?: string;

  @ApiPropertyOptional({ example: 'az-900' })
  @IsString() @IsOptional()
  externalId?: string;

  @ApiPropertyOptional({ example: 'AZ-900' })
  @IsString() @IsOptional()
  examCode?: string;

  @ApiPropertyOptional({ example: '#0078D4' })
  @IsHexColor() @IsOptional()
  badgeColor?: string;

  @ApiPropertyOptional()
  @IsInt() @IsOptional()
  estimatedHours?: number;

  @ApiPropertyOptional({ type: [String] })
  @IsArray() @IsString({ each: true }) @IsOptional()
  finalExamTips?: string[];

  @ApiPropertyOptional({ type: Object })
  @IsObject() @IsOptional()
  resources?: Record<string, unknown>;

  // ── Visual assets ──────────────────────────────────────────────────────────

  @ApiPropertyOptional({ description: 'URL de l\'image principale de la certification' })
  @IsString() @IsOptional()
  imageUrl?: string;

  @ApiPropertyOptional({ description: 'URL de la bannière (hero image)' })
  @IsString() @IsOptional()
  bannerUrl?: string;

  @ApiPropertyOptional({ description: 'URL de l\'icône/logo' })
  @IsString() @IsOptional()
  iconUrl?: string;

  // ── Exam details ───────────────────────────────────────────────────────────

  @ApiPropertyOptional({ example: 70, description: 'Score minimum (%) pour réussir' })
  @IsInt() @Min(0) @Max(100) @IsOptional()
  passingScore?: number;

  @ApiPropertyOptional({ example: 60 })
  @IsInt() @Min(1) @IsOptional()
  numQuestions?: number;

  @ApiPropertyOptional({ example: 90 })
  @IsInt() @Min(1) @IsOptional()
  examDurationMinutes?: number;

  @ApiPropertyOptional({ example: 'fr', enum: ['fr', 'en', 'ar'] })
  @IsString() @IsIn(['fr', 'en', 'ar']) @IsOptional()
  language?: string;

  @ApiPropertyOptional({ type: [String], example: ['Azure fundamentals', 'Cloud concepts'] })
  @IsArray() @IsString({ each: true }) @IsOptional()
  skills?: string[];

  @ApiPropertyOptional({ type: [String], example: ['cloud', 'azure', 'beginner'] })
  @IsArray() @IsString({ each: true }) @IsOptional()
  tags?: string[];

  @ApiPropertyOptional({ example: 'Beginner' })
  @IsString() @IsOptional()
  level?: string;

  @ApiPropertyOptional({ example: 'cloud' })
  @IsString() @IsOptional()
  domain?: string;

  @ApiPropertyOptional({ example: 'Active', enum: ['Active', 'Draft', 'Archived'] })
  @IsString() @IsIn(['Active', 'Draft', 'Archived']) @IsOptional()
  status?: 'Active' | 'Draft' | 'Archived';
}
