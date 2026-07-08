import {
  IsString, IsEnum, IsNumber, IsOptional, IsBoolean,
  IsDateString, IsArray, Min, Max, MaxLength, MinLength
} from 'class-validator';
import { Transform } from 'class-transformer';

export class CreatePromoCodeDto {
  @IsString()
  @MinLength(3)
  @MaxLength(64)
  @Transform(({ value }) => value?.toUpperCase?.()?.trim())
  code!: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;

  @IsEnum(['percentage', 'fixed'])
  discountType!: 'percentage' | 'fixed';

  @IsNumber()
  @Min(0)
  discountValue!: number;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  applicablePlans?: string[];

  @IsOptional()
  @IsNumber()
  @Min(1)
  maxUses?: number;

  @IsOptional()
  @IsNumber()
  @Min(1)
  perUserLimit?: number;

  @IsOptional()
  @IsDateString()
  startDate?: string;

  @IsOptional()
  @IsDateString()
  endDate?: string;

  @IsOptional()
  @IsBoolean()
  active?: boolean;

  @IsOptional()
  @IsString()
  @MaxLength(3)
  currencyScope?: string;

  /** UUID of the CommercialProfile that owns this code */
  @IsOptional()
  @IsString()
  commercialId?: string;
}
