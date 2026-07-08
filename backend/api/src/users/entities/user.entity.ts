import { Entity, PrimaryGeneratedColumn, Column, OneToMany, ManyToOne, JoinColumn } from 'typeorm';
import { WeeklyGoal } from '../../goals/entities/weekly-goal.entity';
import { DailyGoal } from '../../goals/entities/daily-goal.entity';
import { LabProgress } from '../../labs/entities/lab-progress.entity';
import { Company } from '../../companies/entities/company.entity';
import { University } from '../../university/entities/university.entity';

@Entity('users')
export class User {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ length: 64, unique: true })
  email!: string;

  @Column({ name: 'password_hash', type: 'varchar', nullable: true })
  passwordHash?: string;

  @Column({ name: 'fullname', length: 128, nullable: true })
  fullName?: string;

  @Column({ name: 'profile_picture', length: 255, nullable: true })
  profilePicture?: string;

  @Column({ name: 'is_email_verified', type: 'boolean', default: false })
  isEmailVerified!: boolean;

  @Column({ name: 'email_verified_at', type: 'timestamp without time zone', nullable: true })
  emailVerifiedAt?: Date;

  @Column({ type: 'varchar', nullable: true })
  role?: string;

  @Column({ name: 'has_completed_assessment', type: 'boolean', default: false })
  hasCompletedAssessment!: boolean;

  /** Detected learning track from the profile quiz: cloud | cyber | ai */
  @Column({ name: 'track', type: 'varchar', length: 20, nullable: true })
  track?: 'cloud' | 'cyber' | 'ai';

  @Column({ type: 'varchar', default: 'pending' })
  status!: string;

  @Column({ name: 'company_name', length: 128, nullable: true })
  companyName?: string;

  @ManyToOne(() => Company, { nullable: true })
  @JoinColumn({ name: 'company_id' })
  company?: Company;

  @Column({ name: 'company_id', type: 'uuid', nullable: true })
  companyId?: string;

  @Column({ name: 'university_id', type: 'uuid', nullable: true })
  universityId?: string;

  @ManyToOne(() => University, { nullable: true })
  @JoinColumn({ name: 'university_id' })
  university?: University;

  /** When set, overrides default per-agent monthly limit for this user */
  @Column({ name: 'agent_limit_override', type: 'int', nullable: true })
  agentLimitOverride?: number;

  @Column({ name: 'phone', length: 32, nullable: true })
  phone?: string;

  @Column({ name: 'address', length: 255, nullable: true })
  address?: string;

  @Column({ name: 'bio', type: 'text', nullable: true })
  bio?: string;


  @Column({ name: 'last_login', type: 'timestamp without time zone', nullable: true })
  lastLogin?: Date;

  @Column({ name: 'email_verification_token', type: 'varchar', length: 64, nullable: true })
  emailVerificationToken?: string;

  @Column({ name: 'email_verification_token_expires', type: 'timestamp without time zone', nullable: true })
  emailVerificationTokenExpires?: Date;

  @Column({ name: 'password_reset_token', type: 'varchar', length: 64, nullable: true })
  passwordResetToken?: string;

  @Column({ name: 'password_reset_token_expires', type: 'timestamp without time zone', nullable: true })
  passwordResetTokenExpires?: Date;

  @Column({ name: 'requires_password_reset', default: false })
  requiresPasswordReset!: boolean;

  @Column({ type: 'timestamp without time zone', name: 'created_at', default: () => 'CURRENT_TIMESTAMP' })
  createdAt!: Date;

  @Column({ type: 'timestamp without time zone', name: 'updated_at', default: () => 'CURRENT_TIMESTAMP', onUpdate: 'CURRENT_TIMESTAMP' })
  updatedAt!: Date;

  @OneToMany(() => WeeklyGoal, weeklyGoal => weeklyGoal.user)
  weeklyGoals!: WeeklyGoal[];

  @OneToMany(() => DailyGoal, dailyGoal => dailyGoal.user)
  dailyGoals!: DailyGoal[];

  @OneToMany(() => LabProgress, labProgress => labProgress.user)
  labProgress!: LabProgress[];
}
