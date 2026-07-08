import { IsIn, IsNotEmpty, IsNumber, IsOptional, IsString, Min } from 'class-validator';

export class CreateManualPaymentDto {
  @IsIn(['bank_transfer', 'd17'])
  paymentMethod!: 'bank_transfer' | 'd17';

  @IsString()
  @IsNotEmpty()
  planSlug!: string;

  @IsString()
  @IsNotEmpty()
  billingCycle!: string;

  @IsNumber()
  @Min(1)
  amountCents!: number;

  @IsString()
  @IsNotEmpty()
  currency!: string;

  /** Optional promo code that was applied */
  promoCode?: string;

  /** Same semantics as web checkout — required to renew the same paid plan (e.g. Standard → Standard). */
  @IsOptional()
  @IsIn(['renew', 'purchase', 'upgrade'])
  checkoutMode?: 'renew' | 'purchase' | 'upgrade';
}
