import {
  Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn,
  Index, ManyToOne, JoinColumn
} from 'typeorm';

export type PaymentProvider = 'stripe' | 'flouci';
export type PaymentStatus = 'pending' | 'initiated' | 'paid' | 'failed' | 'cancelled' | 'expired' | 'refunded';
export type BillingCycle = 'monthly' | 'quarterly' | 'semester' | 'annual';

@Entity('payment_transactions')
@Index(['userId'])
@Index(['providerTransactionId'])
@Index(['status'])
export class PaymentTransaction {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'user_id', nullable: true })
  userId?: number;

  // Plan info at time of payment (denormalized for audit)
  @Column({ name: 'plan_slug', length: 128 })
  planSlug!: string;

  @Column({ name: 'plan_name', length: 255 })
  planName!: string;

  @Column({ name: 'billing_cycle', length: 32 })
  billingCycle!: BillingCycle;

  // Provider
  @Column({ name: 'provider', length: 32 })
  provider!: PaymentProvider;

  @Column({ name: 'provider_transaction_id', length: 512, nullable: true })
  providerTransactionId?: string;

  @Column({ name: 'provider_payment_intent_id', length: 512, nullable: true })
  providerPaymentIntentId?: string;

  // Pricing
  @Column({ name: 'amount_cents', type: 'int' })
  amountCents!: number;

  @Column({ name: 'currency', length: 3 })
  currency!: string;

  @Column({ name: 'original_amount_cents', type: 'int' })
  originalAmountCents!: number;

  @Column({ name: 'discount_cents', type: 'int', default: 0 })
  discountCents!: number;

  // Geo
  @Column({ name: 'country_code', length: 2, nullable: true })
  countryCode?: string;

  @Column({ name: 'country_name', length: 128, nullable: true })
  countryName?: string;

  @Column({ name: 'ip_address', length: 64, nullable: true })
  ipAddress?: string;

  // Promo
  @Column({ name: 'promo_code_id', type: 'uuid', nullable: true })
  promoCodeId?: string;

  @Column({ name: 'promo_code', length: 64, nullable: true })
  promoCode?: string;

  // Status
  @Column({ name: 'status', length: 32, default: 'pending' })
  status!: PaymentStatus;

  // For guest checkout — email before account creation
  @Column({ name: 'customer_email', length: 255, nullable: true })
  customerEmail?: string;

  @Column({ name: 'customer_name', length: 255, nullable: true })
  customerName?: string;

  // Idempotency
  @Column({ name: 'idempotency_key', length: 255, nullable: true, unique: true })
  idempotencyKey?: string;

  // Subscription created after payment
  @Column({ name: 'subscription_id', type: 'uuid', nullable: true })
  subscriptionId?: string;

  // Provider-specific metadata (JSON)
  @Column({ name: 'provider_metadata', type: 'text', nullable: true })
  providerMetadata?: string;

  // Webhook processing
  @Column({ name: 'webhook_received_at', type: 'timestamp', nullable: true })
  webhookReceivedAt?: Date;

  @Column({ name: 'webhook_processed', default: false })
  webhookProcessed!: boolean;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;
}
