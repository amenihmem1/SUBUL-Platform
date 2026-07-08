import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn, OneToMany, CreateDateColumn, UpdateDateColumn } from 'typeorm';
import { User } from '../../users/entities/user.entity';
import { UniversityProgram } from './university-program.entity';
import { UniversityLicense } from './university-license.entity';
import { UniversityMembership } from './university-membership.entity';

export type UniversityStatus = 'pending' | 'active' | 'suspended' | 'expired';

@Entity('universities')
export class University {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ length: 255 })
  name!: string;

  @Column({ length: 160, unique: true })
  slug!: string;

  @Column({ length: 32, default: 'pending' })
  status!: UniversityStatus;

  @Column({ length: 512, nullable: true })
  logo?: string;

  @Column({ length: 255, nullable: true })
  website?: string;

  @Column({ length: 128, nullable: true })
  country?: string;

  @Column({ length: 32, nullable: true })
  phone?: string;

  @Column({ type: 'text', nullable: true })
  address?: string;

  @Column({ name: 'billing_email', length: 255, nullable: true })
  billingEmail?: string;

  @Column({ name: 'primary_contact_user_id', nullable: true })
  primaryContactUserId?: number;

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'primary_contact_user_id' })
  primaryContact?: User;

  @Column({ name: 'contract_start_date', type: 'date', nullable: true })
  contractStartDate?: string;

  @Column({ name: 'contract_end_date', type: 'date', nullable: true })
  contractEndDate?: string;

  @Column({ name: 'setup_token', length: 128, unique: true, nullable: true })
  setupToken?: string;

  @Column({ name: 'setup_token_expires_at', type: 'timestamp without time zone', nullable: true })
  setupTokenExpiresAt?: Date;

  @Column({ name: 'is_setup_complete', default: false })
  isSetupComplete!: boolean;

  @Column({ type: 'text', nullable: true })
  metadata?: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;

  @OneToMany(() => UniversityProgram, p => p.university)
  programs!: UniversityProgram[];

  @OneToMany(() => UniversityLicense, l => l.university)
  licenses!: UniversityLicense[];

  @OneToMany(() => UniversityMembership, m => m.university)
  memberships!: UniversityMembership[];

  @OneToMany(() => User, user => user.university)
  learners!: User[];
}
