import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { User } from '../../users/entities/user.entity';

@Entity('employer_candidates')
export class EmployerCandidate {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ name: 'employer_id' })
  employerId!: number;

  @Column({ name: 'job_id' })
  jobId!: number;

  @Column({ name: 'user_id' })
  userId!: number;

  @Column({ type: 'varchar', length: 128 })
  name!: string;

  @Column({ type: 'varchar', length: 255 })
  email!: string;

  @Column({ name: 'phone', type: 'varchar', length: 32, nullable: true })
  phone?: string;

  @Column({ name: 'resume_url', type: 'varchar', length: 512, nullable: true })
  resumeUrl?: string;

  @Column({ name: 'cover_letter', type: 'text', nullable: true })
  coverLetter?: string;

  @Column({ 
    type: 'varchar', 
    length: 32, 
    default: 'pending',
  })
  status!: string;

  @Column({ name: 'applied_at', type: 'timestamp without time zone', nullable: true })
  appliedAt?: Date;

  @Column({ name: 'notes', type: 'text', nullable: true })
  notes?: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'user_id' })
  user?: User;
}

@Entity('employer_interviews')
export class EmployerInterview {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ name: 'employer_id' })
  employerId!: number;

  @Column({ name: 'candidate_id' })
  candidateId!: number;

  @Column({ name: 'job_id', nullable: true })
  jobId?: number;

  @Column({ type: 'varchar', length: 255 })
  title!: string;

  @Column({ type: 'varchar', length: 512, nullable: true })
  description?: string;

  @Column({ name: 'scheduled_at', type: 'timestamp without time zone' })
  scheduledAt!: Date;

  @Column({ name: 'duration_minutes', type: 'int', default: 60 })
  durationMinutes!: number;

  @Column({ name: 'meeting_url', type: 'varchar', length: 512, nullable: true })
  meetingUrl?: string;

  @Column({ 
    type: 'varchar', 
    length: 32, 
    default: 'scheduled',
  })
  status!: string;

  @Column({ name: 'meeting_type', type: 'varchar', length: 32, default: 'video' })
  meetingType!: string;

  @Column({ name: 'location', type: 'varchar', length: 255, nullable: true })
  location?: string;

  @Column({ name: 'notes', type: 'text', nullable: true })
  notes?: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;
}

@Entity('employer_employees')
export class EmployerEmployee {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ name: 'employer_id' })
  employerId!: number;

  @Column({ name: 'user_id', nullable: true })
  userId?: number;

  @Column({ type: 'varchar', length: 255 })
  name!: string;

  @Column({ type: 'varchar', length: 255 })
  email!: string;

  @Column({ type: 'varchar', length: 128, nullable: true })
  position?: string;

  @Column({ type: 'varchar', length: 128, nullable: true })
  department?: string;

  @Column({ 
    type: 'varchar', 
    length: 32, 
    default: 'pending',
  })
  learnerStatus!: string;

  @Column({ name: 'enrolled_at', type: 'timestamp without time zone', nullable: true })
  enrolledAt?: Date;

  @Column({ name: 'courses_in_progress', type: 'int', default: 0 })
  coursesInProgress!: number;

  @Column({ name: 'courses_completed', type: 'int', default: 0 })
  coursesCompleted!: number;

  @Column({ type: 'int', default: 0 })
  certifications!: number;

  @Column({ type: 'int', default: 0 })
  progression!: number;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'user_id' })
  user?: User;
}

@Entity('employer_certified_learners')
export class EmployerCertifiedLearner {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ name: 'employer_id' })
  employerId!: number;

  @Column({ name: 'user_id', nullable: true })
  userId?: number;

  @Column({ type: 'varchar', length: 255 })
  name!: string;

  @Column({ type: 'varchar', length: 255 })
  email!: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  certification!: string;

  @Column({ type: 'varchar', length: 128, nullable: true })
  domain!: string;

  @Column({ name: 'obtained_at', type: 'timestamp without time zone', nullable: true })
  obtainedAt!: Date;

  @Column({ type: 'int', default: 0 })
  score!: number;

  @Column({ 
    type: 'varchar', 
    length: 32, 
    default: 'intermediate',
  })
  level!: string;

  @Column({ type: 'boolean', default: true })
  available!: boolean;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'user_id' })
  user?: User;
}
