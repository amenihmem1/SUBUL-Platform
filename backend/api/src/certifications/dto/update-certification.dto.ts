import { PartialType } from '@nestjs/mapped-types';
import { CreateCertificationDto } from './create-certification.dto';
import { IsOptional, IsEnum, IsNumber, IsBoolean } from 'class-validator';

export class UpdateCertificationDto extends PartialType(CreateCertificationDto) {
  @IsOptional()
  @IsEnum(['Active', 'Draft', 'Archived'])
  status?: 'Active' | 'Draft' | 'Archived';

  @IsOptional()
  @IsNumber()
  students?: number;

  @IsOptional()
  @IsNumber()
  completion?: number;

  @IsOptional()
  @IsBoolean()
  available?: boolean;
}