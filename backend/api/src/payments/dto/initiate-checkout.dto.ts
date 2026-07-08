import { IsEnum, IsIn, IsOptional, IsString, MaxLength } from 'class-validator';
import { BillingCycle } from '../entities/payment-transaction.entity';

export type CheckoutMode = 'renew' | 'purchase' | 'upgrade';

export class InitiateCheckoutDto {
  @IsEnum(['monthly', 'quarterly', 'annual'])
  billingCycle!: BillingCycle;

  @IsOptional()
  @IsString()
  @MaxLength(64)
  promoCode?: string;

  /** Subscription plan slug (e.g. standard, premium). Defaults to standard when omitted. */
  @IsOptional()
  @IsString()
  @MaxLength(64)
  planSlug?: string;

  /**
   * `renew` — same paid plan again (explicit renewal).
   * Omitted / `purchase` / `upgrade` — new purchase or upgrade; Standard subscribers cannot repurchase Standard without `renew`.
   */
  @IsOptional()
  @IsIn(['renew', 'purchase', 'upgrade'])
  checkoutMode?: CheckoutMode;

  /**
   * The user's active UI locale ("fr" or "en").
   * Used to build the Flouci payment return URL so it lands on the correct
   * localised page.  Defaults to "fr" (the app's default locale) when absent.
   */
  @IsOptional()
  @IsString()
  @IsIn(['en', 'fr'])
  locale?: string;
}
