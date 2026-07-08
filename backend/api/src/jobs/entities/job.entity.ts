import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { Company } from '../../companies/entities/company.entity';
import { User } from '../../users/entities/user.entity';

@Entity('jobs')
export class Job {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ length: 255 })
  title!: string;

  @Column('text', { nullable: true })
  description!: string;

  @Column({ length: 255, nullable: true })
  location!: string;

  @Column({ name: 'contract_type', length: 100, nullable: true })
  contractType?: string;

  @Column({ type: 'numeric', nullable: true })
  salary?: number;

  @Column({ type: 'jsonb', nullable: true })
  skills?: string[];

  @Column({ length: 255, nullable: true })
  domain?: string;

  @Column({ type: 'date', nullable: true })
  deadline?: Date;

  @ManyToOne(() => Company, company => company.jobs, { nullable: true, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'company_id' })
  company?: Company;

  @Column({ name: 'company_id', type: 'uuid', nullable: true })
  companyId?: string;

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'employer_id' })
  employer?: User;

  @Column({ name: 'employer_id', nullable: true })
  employerId?: number;

  @Column({ type: 'varchar', length: 50, default: 'pending' })
  status!: string; // 'pending', 'published', 'rejected', 'archived'

  @Column({ name: 'previous_status', type: 'varchar', length: 50, nullable: true })
  previousStatus?: string;

  @Column({ name: 'admin_notes', type: 'text', nullable: true })
  adminNotes?: string;

  @Column({ name: 'rejection_reason', type: 'text', nullable: true })
  rejectionReason?: string;

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'reviewed_by' })
  reviewedBy?: User;

  @Column({ name: 'reviewed_by', nullable: true })
  reviewedById?: number;

  @Column({ name: 'reviewed_at', type: 'timestamp', nullable: true })
  reviewedAt?: Date;

  @Column({ name: 'published_at', type: 'timestamp', nullable: true })
  publishedAt?: Date;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;
}
