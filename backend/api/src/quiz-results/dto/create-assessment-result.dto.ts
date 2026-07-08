import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsObject, IsArray, IsOptional, IsEnum, IsNumber } from 'class-validator';

export class CreateAssessmentResultDto {
  @ApiPropertyOptional({ example: 42, description: 'ID utilisateur (résolu depuis le cookie de session)' })
  @IsOptional()
  @IsNumber()
  userId?: number;

  @ApiPropertyOptional({ enum: ['assessment', 'level'], example: 'assessment', description: 'Type de quiz' })
  @IsOptional()
  @IsEnum(['assessment', 'level'])
  quizType?: 'assessment' | 'level';

  @ApiPropertyOptional({ enum: ['cloud', 'cyber', 'ai', 'devops'], example: 'cloud', description: 'Domaine principal détecté' })
  @IsOptional()
  @IsEnum(['cloud', 'cyber', 'ai', 'devops'])
  domain?: 'cloud' | 'cyber' | 'ai' | 'devops';

  @ApiPropertyOptional({
    example: { cloudPercentage: 65, cyberPercentage: 20, aiPercentage: 15 },
    description: 'Scores par domaine (en %)',
  })
  @IsOptional()
  @IsObject()
  scores?: {
    cloudPercentage: number;
    cyberPercentage: number;
    aiPercentage: number;
    devopsPercentage?: number;
  };

  @ApiPropertyOptional({ example: 'Cloud Architect', description: 'Profil principal détecté' })
  @IsOptional()
  @IsString()
  primaryProfile?: string;

  @ApiPropertyOptional({ example: ['Cloud Security Architect'], description: 'Profils hybrides détectés' })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  hybridProfiles?: string[];
}
