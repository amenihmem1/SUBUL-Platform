import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsOptional, IsEnum, IsInt, Min, Max } from 'class-validator';
import { GoalCategory } from './create-goal.dto';

export class CreateWeeklyGoalDto {
  @ApiProperty({ example: 'Terminer le module Azure Core Services', description: 'Titre de l\'objectif hebdomadaire' })
  @IsString()
  title!: string;

  @ApiPropertyOptional({ example: 'Compléter les 5 leçons du module.', description: 'Description' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ enum: GoalCategory, example: GoalCategory.COURSE, description: 'Catégorie' })
  @IsEnum(GoalCategory)
  category!: GoalCategory;

  @ApiPropertyOptional({ example: 0, minimum: 0, maximum: 100, default: 0, description: 'Progression actuelle (%)' })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(100)
  progress?: number = 0;

  @ApiPropertyOptional({ example: 100, minimum: 1, maximum: 100, default: 100, description: 'Cible de progression (%)' })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(100)
  target?: number = 100;

  @ApiPropertyOptional({ example: 24, minimum: 1, maximum: 53, description: 'Numéro de la semaine (1-53)' })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(53)
  weekNumber?: number;

  @ApiPropertyOptional({ example: 2025, minimum: 2020, maximum: 2030, description: 'Année' })
  @IsOptional()
  @IsInt()
  @Min(2020)
  @Max(2030)
  year?: number;
}
