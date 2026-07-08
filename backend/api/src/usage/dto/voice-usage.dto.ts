import { IsNumber, Min, Max } from 'class-validator';

export class VoiceSttUsageDto {
  @IsNumber()
  @Min(0)
  @Max(3600)
  audioSeconds!: number;
}

export class VoiceTtsUsageDto {
  @IsNumber()
  @Min(0)
  @Max(100_000)
  characters!: number;
}
