import { ApiPropertyOptional, ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsNumber, IsString, IsArray, IsEnum } from 'class-validator';

export class CreateRoadmapDto {
  @ApiPropertyOptional({ example: 42, description: 'ID utilisateur' })
  @IsOptional()
  @IsNumber()
  userId?: number;

  @ApiPropertyOptional({ description: 'Liste des modules du roadmap', type: 'array' })
  @IsOptional()
  @IsArray()
  modules?: any[];

  @ApiPropertyOptional({ example: { domain: 'cloud', level: 'Intermédiaire' }, description: 'Profil de l\'utilisateur' })
  @IsOptional()
  userProfile?: any;

  @ApiPropertyOptional({ example: 45, minimum: 0, maximum: 100, description: 'Progression totale (%)' })
  @IsOptional()
  @IsNumber()
  totalProgress?: number;

  @ApiPropertyOptional({ example: 2, description: 'Niveau utilisateur (0=Débutant → 4=Expert)' })
  @IsOptional()
  @IsNumber()
  userLevel?: number;

  @ApiPropertyOptional({ example: 320, description: 'Total de points XP accumulés' })
  @IsOptional()
  @IsNumber()
  totalXP?: number;
}

export class UpdateRoadmapProgressDto {
  @ApiProperty({ example: 'module-azure-fundamentals', description: 'Identifiant du module' })
  @IsString()
  moduleId!: string;

  @ApiProperty({ example: 75, minimum: 0, maximum: 100, description: 'Progression du module (%)' })
  @IsNumber()
  progress!: number;

  @ApiProperty({ enum: ['completed', 'current', 'upcoming', 'locked'], example: 'current', description: 'Statut du module' })
  @IsEnum(['completed', 'current', 'upcoming', 'locked'])
  status!: 'completed' | 'current' | 'upcoming' | 'locked';
}
