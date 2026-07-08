import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsObject, IsArray, IsNumber, IsOptional, IsEnum } from 'class-validator';

export class CreateQuizLevelResultDto {
  @ApiPropertyOptional({ example: 42, description: 'ID utilisateur (résolu depuis le cookie de session)' })
  @IsOptional()
  @IsNumber()
  userId?: number;

  /** Domain for level quiz. Note: Roadmap Agent uses profile (cloud|cyber|ai). Frontend maps cloud → devops when saving level results. */
  @ApiPropertyOptional({ enum: ['devops', 'ai', 'cyber'], example: 'devops', description: 'Domaine du test de niveau' })
  @IsOptional()
  @IsEnum(['devops', 'ai', 'cyber'])
  domain?: 'devops' | 'ai' | 'cyber';

  @ApiPropertyOptional({
    example: { 1: 'A', 2: 'C', 3: 'B' },
    description: 'Réponses de l\'apprenant : { questionId: lettre }',
  })
  @IsOptional()
  @IsObject()
  answers?: Record<number, string>;

  @ApiPropertyOptional({
    example: [{ id: 1, domain: 'devops', question: 'Qu\'est-ce que Kubernetes ?', difficulty: 'facile', points: 1, correct: true }],
    description: 'Détail des questions avec résultats',
  })
  @IsOptional()
  @IsArray()
  questions?: Array<{
    id: number;
    domain: string;
    question: string;
    difficulty: string;
    points: number;
    correct: boolean;
  }>;

  @ApiPropertyOptional({
    example: { score: 12, total: 17, percentage: 70.6 },
    description: 'Score obtenu',
  })
  @IsOptional()
  @IsObject()
  score?: {
    score: number;
    total: number;
    percentage: number;
  };

  @ApiPropertyOptional({ enum: ['Débutant', 'Intermédiaire', 'Expert'], example: 'Intermédiaire', description: 'Niveau déterminé' })
  @IsOptional()
  @IsEnum(['Débutant', 'Intermédiaire', 'Expert'])
  level?: 'Débutant' | 'Intermédiaire' | 'Expert';
}
