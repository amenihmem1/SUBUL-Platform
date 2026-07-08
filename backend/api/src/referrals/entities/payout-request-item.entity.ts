import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';

@Entity('payout_request_items')
@Index(['payoutRequestId'])
export class PayoutRequestItem {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'payout_request_id', type: 'uuid' })
  payoutRequestId!: string;

  @Column({ name: 'referral_reward_id', type: 'uuid', unique: true })
  referralRewardId!: string;

  @Column({ name: 'amount_cents', type: 'int' })
  amountCents!: number;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;
}

