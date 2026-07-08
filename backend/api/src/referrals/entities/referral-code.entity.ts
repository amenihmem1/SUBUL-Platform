import {
  Entity, PrimaryGeneratedColumn, Column,
  CreateDateColumn, Index,
} from 'typeorm';

@Entity('referral_codes')
export class ReferralCode {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'user_id', type: 'int', unique: true })
  @Index()
  userId!: number;

  @Column({ name: 'code', type: 'varchar', length: 16, unique: true })
  code!: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;
}
