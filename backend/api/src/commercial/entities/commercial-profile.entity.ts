import {
  Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn,
  Index, ManyToOne, JoinColumn
} from 'typeorm';
import { User } from '../../users/entities/user.entity';

export type CommercialStatus = 'active' | 'inactive';

@Entity('commercial_profiles')
export class CommercialProfile {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  /** Links to the users table — one commercial = one user account with role='commercial' */
  @Column({ name: 'user_id', unique: true })
  @Index()
  userId!: number;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user!: User;

  @Column({ name: 'status', length: 16, default: 'active' })
  status!: CommercialStatus;

  /** ISO-4217 currency preference (kept for UI preferences) */
  @Column({ name: 'preferred_currency', length: 3, default: 'EUR' })
  preferredCurrency!: string;

  @Column({ name: 'notes', type: 'text', nullable: true })
  notes?: string;

  /** Denormalized referral count — updated on each redemption */
  @Column({ name: 'total_referrals', type: 'int', default: 0 })
  totalReferrals!: number;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;

  // Note: points_balance and last_reward_milestone columns remain in the DB schema
  // (added by migration 1712800000000) but are no longer used by the application.
}
