import {
  Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn,
  Index, ManyToOne, JoinColumn
} from 'typeorm';

export type DiscountType = 'percentage' | 'fixed';

@Entity('promo_codes')
@Index(['code'], { unique: true })
export class PromoCode {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ length: 64, unique: true })
  code!: string;

  @Column({ type: 'text', nullable: true })
  description?: string;

  @Column({ name: 'discount_type', length: 16 })
  discountType!: DiscountType;

  /** For percentage: 0-100. For fixed: amount in smallest currency unit */
  @Column({ name: 'discount_value', type: 'decimal', precision: 10, scale: 2 })
  discountValue!: number;

  /** JSON array of plan slugs, null = all plans */
  @Column({ name: 'applicable_plans', type: 'text', nullable: true })
  applicablePlans?: string;

  @Column({ name: 'max_uses', type: 'int', nullable: true })
  maxUses?: number;

  @Column({ name: 'used_count', type: 'int', default: 0 })
  usedCount!: number;

  @Column({ name: 'per_user_limit', type: 'int', nullable: true })
  perUserLimit?: number;

  @Column({ name: 'start_date', type: 'timestamp', nullable: true })
  startDate?: Date;

  @Column({ name: 'end_date', type: 'timestamp', nullable: true })
  endDate?: Date;

  @Column({ name: 'active', default: true })
  active!: boolean;

  /** Currency scope: TND, USD, EUR, or null = all */
  @Column({ name: 'currency_scope', length: 3, nullable: true })
  currencyScope?: string;

  @Column({ name: 'created_by', nullable: true })
  createdBy?: number;

  /** If set, this code is owned by a commercial agent and commission is tracked */
  @Column({ name: 'commercial_id', type: 'uuid', nullable: true })
  @Index()
  commercialId?: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;
}
