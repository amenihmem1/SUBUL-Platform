import { Type } from 'class-transformer';
import { IsNumber, IsOptional, IsString, IsArray, ValidateNested, IsEnum, IsObject } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { CreateModuleDto } from './create-module.dto';
import { CourseLevel } from '../constants/course-level.enum';

export class CreateCourseDto {
  @ApiProperty({ description: 'Unique string identifier for the course (e.g. AZ-900-UNIFIED)' })
  @IsString()
  courseId!: string;

  @ApiProperty()
  @IsString()
  title!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  externalId?: string;

  @ApiPropertyOptional({ enum: CourseLevel, description: 'Course difficulty level' })
  @IsOptional()
  @IsEnum(CourseLevel)
  level?: CourseLevel;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  certificationId?: number;

  @ApiPropertyOptional({ enum: ['cloud', 'cyber', 'ai'], description: 'Learning track for profile-based filtering' })
  @IsOptional()
  @IsString()
  track?: 'cloud' | 'cyber' | 'ai';

  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  objectives?: string[];

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  durationMinutes?: number;

  @ApiPropertyOptional({ type: [Object] })
  @IsOptional()
  @IsArray()
  @IsObject({ each: true })
  quiz?: Record<string, unknown>[];

  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  examTips?: string[];

  @ApiPropertyOptional({ type: Object })
  @IsOptional()
  @IsObject()
  resources?: Record<string, unknown>;

  @ApiPropertyOptional({ type: [CreateModuleDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateModuleDto)
  modules?: CreateModuleDto[];
}
