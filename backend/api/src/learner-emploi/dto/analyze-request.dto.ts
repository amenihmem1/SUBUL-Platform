import { Transform } from 'class-transformer';
import { IsArray, IsBoolean, IsInt, IsOptional, IsString, Max, Min } from 'class-validator';

const toStringArray = ({ value }: { value: unknown }): string[] => {
  if (Array.isArray(value)) {
    return value.map((v) => String(v).trim()).filter(Boolean);
  }
  if (typeof value === 'string') {
    return value
      .split(',')
      .map((v) => v.trim())
      .filter(Boolean);
  }
  return [];
};

const toBoolean = ({ value }: { value: unknown }): boolean => {
  if (typeof value === 'boolean') return value;
  if (typeof value === 'string') return value.toLowerCase() === 'true';
  return false;
};

const toNumber = ({ value }: { value: unknown }): number | undefined => {
  if (typeof value === 'number') return value;
  if (typeof value === 'string' && value.trim()) return Number.parseInt(value, 10);
  return undefined;
};

export class AnalyzeRequestDto {
  @IsOptional()
  @IsString()
  target_role?: string;

  @IsOptional()
  @Transform(toStringArray)
  @IsArray()
  @IsString({ each: true })
  locations?: string[];

  @IsOptional()
  @Transform(toBoolean)
  @IsBoolean()
  remote_only?: boolean;

  @IsOptional()
  @Transform(toNumber)
  @IsInt()
  @Min(1)
  @Max(200)
  max_jobs?: number;
}
