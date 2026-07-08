import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn, CreateDateColumn, Index } from 'typeorm';
import { University } from './university.entity';
import { UniversityProgram } from './university-program.entity';
import { UniversityDepartment } from './university-department.entity';
import { UniversityCohort } from './university-cohort.entity';
import { User } from '../../users/entities/user.entity';
import { UniversityMemberRole } from './university-membership.entity';

export type InviteStatus = 'pending' | 'accepted' | 'expired' | 'cancelled';

@Entity('university_invites')
@Index(['email', 'universityId'])
export class UniversityInvite {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'university_id', type: 'uuid' })
  universityId!: string;

  @ManyToOne(() => University, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'university_id' })
  university!: University;

  @Column({ name: 'program_id', type: 'uuid', nullable: true })
  programId?: string;

  @ManyToOne(() => UniversityProgram, p => p.invites, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'program_id' })
  program?: UniversityProgram;

  @Column({ length: 255 })
  email!: string;

  @Column({ length: 128, unique: true })
  token!: string;

  @Column({ length: 32, default: 'pending' })
  status!: InviteStatus;

  @Column({ length: 32, default: 'student' })
  role!: UniversityMemberRole;

  @Column({ name: 'department_id', type: 'uuid', nullable: true })
  departmentId?: string;

  @ManyToOne(() => UniversityDepartment, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'department_id' })
  department?: UniversityDepartment;

  @Column({ name: 'cohort_id', type: 'uuid', nullable: true })
  cohortId?: string;

  @ManyToOne(() => UniversityCohort, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'cohort_id' })
  cohort?: UniversityCohort;

  @Column({ name: 'invited_by', nullable: true })
  invitedBy?: number;

  @ManyToOne(() => User, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'invited_by' })
  invitedByUser?: User;

  @Column({ name: 'resend_count', default: 0 })
  resendCount!: number;

  @Column({ name: 'last_resent_at', type: 'timestamp without time zone', nullable: true })
  lastResentAt?: Date;

  @Column({ name: 'expires_at', type: 'timestamp without time zone', nullable: true })
  expiresAt?: Date;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;
}
