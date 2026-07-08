import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, IsArray, IsObject, IsIn, IsNumber, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

export class LabStepDto {
  @IsString()
  title!: string;

  @IsString()
  instruction!: string;

  @IsOptional()
  @IsString()
  hint?: string;

  @IsOptional()
  @IsString()
  validationNote?: string;
}

export class CreateLabDto {
  @ApiPropertyOptional({ example: 'aws-ec2-basics', description: 'Unique URL slug' })
  @IsOptional()
  @IsString()
  slug?: string;

  @ApiPropertyOptional({ example: 'AWS EC2 Basics', description: 'Lab title' })
  @IsOptional()
  @IsString()
  title?: string;

  @ApiPropertyOptional({ example: 'Learn EC2 fundamentals', description: 'Lab description' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ example: 'aws', enum: ['aws', 'azure', 'gcp', 'nvidia'], description: 'Cloud provider' })
  @IsOptional()
  @IsIn(['aws', 'azure', 'gcp', 'nvidia'])
  provider?: string;

  @ApiPropertyOptional({ example: 'beginner', enum: ['beginner', 'intermediate', 'advanced'], description: 'Difficulty level' })
  @IsOptional()
  @IsIn(['beginner', 'intermediate', 'advanced'])
  difficulty?: string;

  @ApiPropertyOptional({ example: '45 min', description: 'Estimated time to complete (display)' })
  @IsOptional()
  @IsString()
  estimatedTime?: string;

  @ApiPropertyOptional({ example: 45, description: 'Estimated duration in minutes (numeric, for sorting)' })
  @IsOptional()
  @IsNumber()
  estimatedDurationMinutes?: number;

  @ApiPropertyOptional({ example: 'Compute', description: 'Module title' })
  @IsOptional()
  @IsString()
  moduleTitle?: string;

  @ApiPropertyOptional({ example: ['task1', 'task2'], description: 'Short task labels' })
  @IsOptional()
  @IsArray()
  tasks?: string[];

  @ApiPropertyOptional({ description: 'Rich step-by-step instructions per task' })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => LabStepDto)
  steps?: LabStepDto[];

  @ApiPropertyOptional({ description: 'Metadata (level, tags, learning objectives, etc.)' })
  @IsOptional()
  @IsObject()
  metadata?: Record<string, unknown>;

  @ApiPropertyOptional({ example: 'cloud', enum: ['cloud', 'cyber', 'ai'], description: 'Learning track' })
  @IsOptional()
  @IsIn(['cloud', 'cyber', 'ai'])
  track?: string;

  @ApiPropertyOptional({ example: 'published', enum: ['draft', 'published', 'archived'], description: 'Publication status' })
  @IsOptional()
  @IsIn(['draft', 'published', 'archived'])
  status?: string;
}
