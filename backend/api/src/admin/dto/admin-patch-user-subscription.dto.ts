import { IsIn, IsOptional, IsString, IsUUID } from 'class-validator';
import type { AdminManagedSubscriptionStatus } from './admin-assign-user-subscription.dto';

/** Period fields are normalized server-side to 24h when the target plan is the public free plan. */
export class AdminPatchUserSubscriptionDto {
  @IsOptional()
  @IsIn(['active', 'expired'])
  status?: AdminManagedSubscriptionStatus;

  @IsOptional()
  @IsUUID()
  planId?: string;

  @IsOptional()
  @IsString()
  periodStart?: string;

  @IsOptional()
  @IsString()
  periodEnd?: string;
}
