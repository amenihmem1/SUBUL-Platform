import {
  Entity, PrimaryGeneratedColumn, Column, CreateDateColumn,
  Index, ManyToOne, JoinColumn
} from 'typeorm';
import { PromoCode } from './promo-code.entity';

@Entity('promo_code_redemptions')
@Index(['promoCodeId'])
@Index(['userId'])
export class PromoCodeRedemption {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'promo_code_id', type: 'uuid' })
  promoCodeId!: string;

  @ManyToOne(() => PromoCode, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'promo_code_id' })
  promoCode!: PromoCode;

  @Column({ name: 'user_id', nullable: true })
  userId?: number;

  @Column({ name: 'payment_transaction_id', type: 'uuid', nullable: true })
  paymentTransactionId?: string;

  @Column({ name: 'discount_applied_cents', type: 'int' })
  discountAppliedCents!: number;

  /** Original amount before discount, in smallest currency unit */
  @Column({ name: 'original_amount_cents', type: 'int', nullable: true })
  originalAmountCents?: number;

  /** Final amount paid after discount, in smallest currency unit */
  @Column({ name: 'final_amount_cents', type: 'int', nullable: true })
  finalAmountCents?: number;

  /** Currency of the transaction (EUR, USD, TND) */
  @Column({ name: 'currency', length: 3, nullable: true })
  currency?: string;

  /** Commission earned by the commercial for this conversion, in smallest currency unit */
  @Column({ name: 'commission_amount_cents', type: 'int', nullable: true })
  commissionAmountCents?: number;

  /** Links to the commercial who owns the promo code used */
  @Column({ name: 'commercial_id', type: 'uuid', nullable: true })
  @Index()
  commercialId?: string;

  /** Whether the commission has been paid out to the commercial */
  @Column({ name: 'commission_paid', type: 'boolean', default: false })
  commissionPaid!: boolean;

  @Column({ name: 'commission_paid_at', type: 'timestamp', nullable: true })
  commissionPaidAt?: Date;

  /** Snapshot of the payment status when recorded */
  @Column({ name: 'payment_status', length: 32, nullable: true })
  paymentStatus?: string;

  /**
   * MVP Phase 1: always 'validated' on creation (instant).
   * Phase 2: starts as 'pending', cron flips after validation window.
   * 'cancelled' = payment refunded or reversed.
   */
  @Column({ name: 'earning_status', length: 16, default: 'validated' })
  earningStatus!: 'validated' | 'pending' | 'cancelled';

  /** Phase 2: timestamp when pending → validated */
  @Column({ name: 'validates_at', type: 'timestamp', nullable: true })
  validatesAt?: Date;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;
}
