import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, Matches, MaxLength } from 'class-validator';

export class UpdateUserDto {
  @ApiPropertyOptional({ example: 'Jane Doe', description: 'Nom complet' })
  @IsOptional()
  @IsString()
  fullName?: string;

  @ApiPropertyOptional({ example: 'TechCorp', description: 'Nom de l\'entreprise' })
  @IsOptional()
  @IsString()
  companyName?: string;

  @ApiPropertyOptional({ example: '+216 12 345 678', description: 'Numéro de téléphone' })
  @IsOptional()
  @Matches(/^\+?[0-9\s\-()]{7,20}$/, { message: 'Phone number format is invalid. Use digits, spaces, dashes, or parentheses (7-20 chars), optionally starting with +' })
  @MaxLength(32)
  phone?: string;

  @ApiPropertyOptional({ example: '5 avenue Montaigne, Paris', description: 'Adresse postale' })
  address?: string;

  @ApiPropertyOptional({ example: 'Expert en cybersécurité et cloud.', description: 'Biographie' })
  bio?: string;

  @ApiPropertyOptional({ example: 'https://cdn.example.com/avatar.jpg', description: 'URL de la photo de profil' })
  profilePicture?: string;

  @ApiPropertyOptional({ example: true, description: 'Email vérifié ?' })
  isEmailVerified?: boolean;

  @ApiPropertyOptional({ example: 'admin', enum: ['learner', 'admin', 'instructor'], description: 'Rôle utilisateur' })
  role?: string;

  @ApiPropertyOptional({ example: 'active', enum: ['active', 'inactive', 'suspended'], description: 'Statut du compte' })
  status?: string;
}
