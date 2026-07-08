import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';

export type PayoutMethod = 'bank' | 'd17';

@Entity('payout_accounts')
@Index(['userId'])
export class PayoutAccount {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'user_id', type: 'int' })
  userId!: number;

  @Column({ name: 'method', type: 'varchar', length: 8 })
  method!: PayoutMethod;

  @Column({ name: 'label', type: 'varchar', length: 64, nullable: true })
  label!: string | null;

  @Column({ name: 'account_details', type: 'jsonb', default: () => "'{}'::jsonb" })
  accountDetails!: Record<string, string>;

  @Column({ name: 'is_active', type: 'boolean', default: true })
  isActive!: boolean;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt!: Date;
}

