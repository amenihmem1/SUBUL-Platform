import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsOptional, IsEnum, IsArray, IsDate } from 'class-validator';
import { Type } from 'class-transformer';

export enum GoalCategory {
  CERTIFICATION = 'certification',
  COURSE = 'course',
  SKILL = 'skill',
  CAREER = 'career',
}

export enum GoalPriority {
  HIGH = 'high',
  MEDIUM = 'medium',
  LOW = 'low',
}

export enum GoalStatus {
  ON_TRACK = 'on-track',
  BEHIND = 'behind',
  COMPLETED = 'completed',
}

export enum GoalVisibility {
  PRIVATE = 'private',
  PUBLIC = 'public',
}

export class CreateGoalDto {
  @ApiProperty({ example: 'Obtenir la certification AZ-900', description: 'Titre de l\'objectif' })
  @IsString()
  title!: string;

  @ApiPropertyOptional({ example: 'Préparer et passer l\'examen AZ-900 avant fin juin.', description: 'Description détaillée' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ enum: GoalCategory, example: GoalCategory.CERTIFICATION, description: 'Catégorie de l\'objectif' })
  @IsEnum(GoalCategory)
  category!: GoalCategory;

  @ApiProperty({ enum: GoalPriority, example: GoalPriority.HIGH, description: 'Priorité' })
  @IsEnum(GoalPriority)
  priority!: GoalPriority;

  @ApiPropertyOptional({ example: 'Score ≥ 700/1000 à l\'examen', description: 'Critères de succès' })
  @IsOptional()
  @IsString()
  successCriteria?: string;

  @ApiPropertyOptional({ example: '2025-06-30T00:00:00.000Z', description: 'Date limite (ISO 8601)' })
  @IsOptional()
  @IsDate()
  @Type(() => Date)
  deadline?: Date;

  @ApiPropertyOptional({ example: 'Progresser vers un poste d\'architecte cloud.', description: 'Motivation personnelle' })
  @IsOptional()
  @IsString()
  motivation?: string;

  @ApiPropertyOptional({ enum: GoalVisibility, example: GoalVisibility.PRIVATE, description: 'Visibilité' })
  @IsOptional()
  @IsEnum(GoalVisibility)
  visibility?: GoalVisibility;

  @ApiPropertyOptional({ example: 'Un week-end de repos bien mérité', description: 'Récompense prévue' })
  @IsOptional()
  @IsString()
  reward?: string;

  @ApiPropertyOptional({ example: ['Terminer le cours AZ-900', 'Passer un examen blanc'], description: 'Liste des jalons' })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  milestones?: string[];

  @ApiPropertyOptional({ example: ['Terminer le cours AZ-900'], description: 'Jalons complétés' })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  completedMilestones?: string[];
}
