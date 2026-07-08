import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsOptional, IsBoolean, IsInt, Min, Max, IsDate } from 'class-validator';
import { Type } from 'class-transformer';

export class CreateDailyGoalDto {
  @ApiProperty({ example: 'Réviser 2 leçons AZ-900', description: 'Titre de l\'objectif journalier' })
  @IsString()
  title!: string;

  @ApiPropertyOptional({ example: false, default: false, description: 'Objectif déjà complété ?' })
  @IsOptional()
  @IsBoolean()
  completed?: boolean = false;

  @ApiPropertyOptional({ example: 10, minimum: 1, maximum: 100, default: 5, description: 'Points XP attribués à la complétion' })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(100)
  points?: number = 5;

  @ApiPropertyOptional({ example: '2025-06-15T00:00:00.000Z', description: 'Date cible (ISO 8601)' })
  @IsOptional()
  @IsDate()
  @Type(() => Date)
  goalDate?: Date;
}
