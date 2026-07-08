import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsArray,
  IsBoolean,
  IsDefined,
  IsIn,
  IsInt,
  IsNotEmpty,
  IsObject,
  IsOptional,
  IsString,
  Max,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';

export class CreatePracticeExamQuestionDto {
  @ApiPropertyOptional() @IsOptional() @IsString()
  externalId?: string;

  @ApiPropertyOptional() @IsOptional() @IsInt()
  questionOrder?: number;

  @ApiProperty() @IsString() @IsNotEmpty()
  prompt!: string;

  @ApiProperty({ type: 'array' })
  @IsArray()
  options!: Array<{ id: string; text: string }> | string[];

  @ApiProperty({ description: 'Correct option id(s) or text(s); array supports multi-correct' })
  @IsArray()
  correct!: string[];

  @ApiPropertyOptional() @IsOptional() @IsString()
  explanation?: string;

  @ApiPropertyOptional() @IsOptional() @IsString()
  domain?: string;

  @ApiPropertyOptional() @IsOptional() @IsString()
  difficulty?: string;
}

export class CreatePracticeExamDto {
  @ApiProperty() @IsString() @IsNotEmpty()
  slug!: string;

  @ApiProperty() @IsString() @IsNotEmpty()
  title!: string;

  @ApiPropertyOptional() @IsOptional() @IsString()
  description?: string;

  @ApiPropertyOptional() @IsOptional() @IsInt()
  certificationId?: number | null;

  @ApiPropertyOptional({ default: 60 }) @IsOptional() @IsInt() @Min(1) @Max(600)
  durationMinutes?: number;

  @ApiPropertyOptional({ default: 70 }) @IsOptional() @IsInt() @Min(0) @Max(100)
  passingScore?: number;

  @ApiPropertyOptional({ enum: ['beginner', 'intermediate', 'advanced'] })
  @IsOptional() @IsIn(['beginner', 'intermediate', 'advanced'])
  difficulty?: 'beginner' | 'intermediate' | 'advanced';

  @ApiPropertyOptional({ enum: ['draft', 'published', 'archived'] })
  @IsOptional() @IsIn(['draft', 'published', 'archived'])
  status?: 'draft' | 'published' | 'archived';

  @ApiPropertyOptional({ type: [String] })
  @IsOptional() @IsArray() @IsString({ each: true })
  tags?: string[];

  @ApiPropertyOptional() @IsOptional() @IsString()
  externalId?: string;

  @ApiPropertyOptional({ type: [CreatePracticeExamQuestionDto] })
  @IsOptional() @IsArray()
  @Type(() => CreatePracticeExamQuestionDto)
  questions?: CreatePracticeExamQuestionDto[];
}

export class UpdatePracticeExamDto {
  @ApiPropertyOptional() @IsOptional() @IsString() title?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() description?: string;
  @ApiPropertyOptional() @IsOptional() @IsInt() certificationId?: number | null;
  @ApiPropertyOptional() @IsOptional() @IsInt() @Min(1) @Max(600) durationMinutes?: number;
  @ApiPropertyOptional() @IsOptional() @IsInt() @Min(0) @Max(100) passingScore?: number;
  @ApiPropertyOptional() @IsOptional() @IsIn(['beginner', 'intermediate', 'advanced']) difficulty?: 'beginner' | 'intermediate' | 'advanced';
  @ApiPropertyOptional() @IsOptional() @IsIn(['draft', 'published', 'archived']) status?: 'draft' | 'published' | 'archived';
  @ApiPropertyOptional() @IsOptional() @IsArray() @IsString({ each: true }) tags?: string[];
  @ApiPropertyOptional({ type: [CreatePracticeExamQuestionDto] })
  @IsOptional() @IsArray()
  @Type(() => CreatePracticeExamQuestionDto)
  questions?: CreatePracticeExamQuestionDto[];
}

export class ImportPracticeExamsJsonDto {
  @ApiProperty({
    description:
      'Array of practice exams to import. Same shape as the create DTO. Re-importing the same slug updates the exam in place.',
  })
  @IsDefined()
  payload!: Array<Record<string, unknown>>;

  @ApiPropertyOptional({ default: true })
  @IsOptional() @IsBoolean()
  dryRun?: boolean;
}

export class ValidatePracticeExamsJsonDto {
  @ApiProperty()
  @IsDefined()
  payload!: Array<Record<string, unknown>>;
}

export class AdminPracticeExamsQueryDto {
  @ApiPropertyOptional() @IsOptional() @Type(() => Number) @IsInt() @Min(1)
  page?: number;

  @ApiPropertyOptional() @IsOptional() @Type(() => Number) @IsInt() @Min(1)
  limit?: number;

  @ApiPropertyOptional() @IsOptional() @IsString()
  search?: string;

  @ApiPropertyOptional() @IsOptional() @IsIn(['draft', 'published', 'archived'])
  status?: 'draft' | 'published' | 'archived';

  @ApiPropertyOptional() @IsOptional() @Type(() => Number) @IsInt()
  certificationId?: number;
}
