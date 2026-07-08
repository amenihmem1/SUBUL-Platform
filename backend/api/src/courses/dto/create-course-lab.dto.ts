import { IsNumber, IsOptional, IsString, IsArray, IsObject } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class CreateCourseLabDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  labOrder?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  labId?: string;

  @ApiPropertyOptional()
  @IsString()
  title!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  objective?: string;

  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  learningObjectives?: string[];

  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  evaluationCriteria?: string[];

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  durationMinutes?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  difficultyLevel?: string;

  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  prerequisites?: string[];

  @ApiPropertyOptional({ type: [Object] })
  @IsOptional()
  @IsArray()
  @IsObject({ each: true })
  resources?: Record<string, unknown>[];
}
