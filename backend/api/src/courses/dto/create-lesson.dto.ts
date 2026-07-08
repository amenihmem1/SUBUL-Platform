import { IsNumber, IsOptional, IsString, IsArray, IsObject } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class CreateLessonDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  lessonOrder?: number;

  @ApiPropertyOptional()
  @IsString()
  title!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  content?: string;

  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  bullets?: string[];

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  externalId?: string;

  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  keyPoints?: string[];

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  analogy?: string;

  @ApiPropertyOptional({ type: Object })
  @IsOptional()
  @IsObject()
  comparisonTable?: Record<string, unknown>;
}
