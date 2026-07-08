import { IsString, IsIn, IsOptional, IsBoolean, MaxLength } from 'class-validator';

const PROVIDERS = ['aws', 'azure', 'gcp', 'nvidia'] as const;
const CRED_TYPES = ['sandbox_account', 'iam_user', 'voucher_code', 'api_key'] as const;

export class CreateLabCredentialDto {
  @IsString()
  @IsIn(PROVIDERS)
  provider!: string;

  @IsString()
  @MaxLength(255)
  label!: string;

  @IsOptional()
  @IsString()
  @IsIn(CRED_TYPES)
  credentialType?: string;

  @IsOptional()
  @IsString()
  consoleUrl?: string | null;

  @IsOptional()
  @IsString()
  loginEmail?: string | null;

  @IsOptional()
  @IsString()
  loginPassword?: string | null;

  @IsOptional()
  @IsString()
  accessKey?: string | null;

  @IsOptional()
  @IsString()
  secretKey?: string | null;

  @IsOptional()
  extraFields?: Record<string, string> | null;

  @IsOptional()
  @IsString()
  notes?: string | null;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class UpdateLabCredentialDto extends CreateLabCredentialDto {}
