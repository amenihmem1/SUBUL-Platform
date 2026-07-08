import { Type } from 'class-transformer';
import { IsIn, IsInt, IsOptional, IsString, IsUUID } from 'class-validator';

export type AdminManagedSubscriptionStatus = 'active' | 'expired';

/** When `planId` is the public free plan, the server normalizes the period to exactly 24 hours. */
export class AdminAssignUserSubscriptionDto {
  @Type(() => Number)
  @IsInt()
  userId!: number;

  @IsUUID()
  planId!: string;

  @IsOptional()
  @IsIn(['active', 'expired'])
  status?: AdminManagedSubscriptionStatus;

  @IsOptional()
  @IsString()
  periodStart?: string;

  @IsOptional()
  @IsString()
  periodEnd?: string;
}
