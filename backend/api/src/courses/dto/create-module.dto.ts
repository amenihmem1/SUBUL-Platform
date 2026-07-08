import { Type } from 'class-transformer';
import { IsNumber, IsOptional, IsString, IsArray, ValidateNested, IsObject } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { CreateLessonDto } from './create-lesson.dto';
import { CreateCourseLabDto } from './create-course-lab.dto';

export class CreateModuleDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  moduleOrder?: number;

  @ApiPropertyOptional()
  @IsString()
  title!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  icon?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  externalId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  durationMinutes?: number;

  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  objectives?: string[];

  @ApiPropertyOptional({ type: [Object] })
  @IsOptional()
  @IsArray()
  @IsObject({ each: true })
  quiz?: Record<string, unknown>[];

  @ApiPropertyOptional({ type: [CreateLessonDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateLessonDto)
  lessons?: CreateLessonDto[];

  @ApiPropertyOptional({ type: [CreateCourseLabDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateCourseLabDto)
  labs?: CreateCourseLabDto[];
}
