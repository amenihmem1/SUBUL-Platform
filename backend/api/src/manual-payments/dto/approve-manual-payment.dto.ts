import { IsInt, IsOptional, IsString, Max, Min } from 'class-validator';

export class ApproveManualPaymentDto {
  /** Duration override in months (defaults to cycle: monthly=1, quarterly=3, annual=12) */
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(36)
  durationMonths?: number;

  @IsOptional()
  @IsString()
  adminNotes?: string;
}
