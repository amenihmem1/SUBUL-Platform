import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';

export type QuotePlanType = 'universite' | 'entreprise';
export type QuoteRequestStatus = 'pending' | 'contacted' | 'closed';

@Entity('quote_requests')
export class QuoteRequest {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ length: 120 })
  name!: string;

  @Column({ length: 180 })
  email!: string;

  @Column({ type: 'varchar', length: 32, nullable: true })
  phone!: string | null;

  @Column({ length: 180 })
  organization!: string;

  @Column({ name: 'number_of_users', type: 'int' })
  numberOfUsers!: number;

  @Column({ type: 'text', nullable: true })
  message?: string | null;

  @Column({ name: 'plan_type', length: 32 })
  planType!: QuotePlanType;

  @Column({ length: 32, default: 'pending' })
  status!: QuoteRequestStatus;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;
}
