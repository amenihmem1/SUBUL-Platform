import { IsInt, IsString, IsIn, IsOptional, IsPositive, Min, Max } from 'class-validator';

const PROVIDERS = ['aws', 'azure', 'gcp', 'nvidia'] as const;

export class GrantLabAccessDto {
  @IsInt()
  @IsPositive()
  userId!: number;

  @IsString()
  @IsIn(PROVIDERS)
  provider!: string;

  @IsInt()
  @Min(1)
  @Max(8760) // max 1 year
  durationHours!: number;

  @IsOptional()
  @IsInt()
  @IsPositive()
  credentialId?: number;

  @IsOptional()
  @IsString()
  notes?: string | null;
}

export class BulkGrantLabAccessDto {
  @IsInt({ each: true })
  @IsPositive({ each: true })
  userIds!: number[];

  @IsString()
  @IsIn(PROVIDERS)
  provider!: string;

  @IsInt()
  @Min(1)
  @Max(8760)
  durationHours!: number;

  @IsOptional()
  @IsInt()
  @IsPositive()
  credentialId?: number;

  @IsOptional()
  @IsString()
  notes?: string | null;
}
