import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateUserDto {
  @ApiProperty({ example: 'john.doe@example.com', description: 'Adresse email unique' })
  email!: string;

  @ApiPropertyOptional({ example: 'John Doe', description: 'Nom complet' })
  fullName?: string;

  @ApiPropertyOptional({ example: '+33 6 12 34 56 78', description: 'Numéro de téléphone' })
  phone?: string;

  @ApiPropertyOptional({ example: 'Acme Corp', description: 'Nom de l\'entreprise' })
  companyName?: string;

  @ApiPropertyOptional({ example: '12 rue de la Paix, Paris', description: 'Adresse postale' })
  address?: string;

  @ApiPropertyOptional({ example: 'Développeur cloud passionné par Azure.', description: 'Biographie courte' })
  bio?: string;

  @ApiPropertyOptional({ example: 'learner', enum: ['learner', 'admin', 'instructor'], description: 'Rôle utilisateur' })
  role?: string;

  @ApiProperty({ example: 'SecurePass123!', description: 'Mot de passe (min 8 caractères)' })
  password!: string;

  @ApiPropertyOptional({ example: 'active', enum: ['active', 'inactive', 'suspended'], description: 'Statut du compte' })
  status?: string;
}
