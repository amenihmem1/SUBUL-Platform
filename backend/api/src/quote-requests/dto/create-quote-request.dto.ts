import { Transform } from 'class-transformer';
import { IsEmail, IsEnum, IsInt, IsOptional, IsString, MaxLength, Min } from 'class-validator';
import { QuotePlanType } from '../entities/quote-request.entity';

export class CreateQuoteRequestDto {
  @IsString()
  @MaxLength(120)
  @Transform(({ value }) => String(value || '').trim())
  name!: string;

  @IsEmail()
  @MaxLength(180)
  @Transform(({ value }) => String(value || '').trim().toLowerCase())
  email!: string;

  @IsOptional()
  @IsString()
  @MaxLength(32)
  @Transform(({ value }) => (value ? String(value).trim() : undefined))
  phone?: string;

  @IsString()
  @MaxLength(180)
  @Transform(({ value }) => String(value || '').trim())
  organization!: string;

  @IsInt()
  @Min(1)
  numberOfUsers!: number;

  @IsOptional()
  @IsString()
  @MaxLength(4000)
  @Transform(({ value }) => (value ? String(value).trim() : undefined))
  message?: string;

  @IsEnum(['universite', 'entreprise'])
  @Transform(({ value }) => String(value || '').trim().toLowerCase())
  planType!: QuotePlanType;
}
