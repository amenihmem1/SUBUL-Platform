import { IsString, IsNotEmpty, IsOptional, IsEnum } from 'class-validator';

export class CreateCertificationDto {
  @IsString()
  @IsNotEmpty()
  title!: string;

  @IsString()
  @IsNotEmpty()
  provider!: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsString()
  @IsOptional()
  duration?: string;

  @IsString()
  @IsOptional()
  price?: string;
}