import {
  Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn,
  CreateDateColumn, UpdateDateColumn, Index,
} from 'typeorm';
import { University } from './university.entity';
import { User } from '../../users/entities/user.entity';
import { UniversityDepartment } from './university-department.entity';
import { UniversityCohort } from './university-cohort.entity';

export type UniversityMemberRole = 'owner' | 'admin' | 'coordinator' | 'student';
export type UniversityMemberStatus = 'active' | 'inactive' | 'removed';

@Entity('university_memberships')
@Index(['universityId', 'userId'], { unique: true })
export class UniversityMembership {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'university_id', type: 'uuid' })
  universityId!: string;

  @ManyToOne(() => University, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'university_id' })
  university!: University;

  @Column({ name: 'user_id' })
  userId!: number;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user!: User;

  @Column({ length: 32, default: 'student' })
  role!: UniversityMemberRole;

  @Column({ length: 32, default: 'active' })
  status!: UniversityMemberStatus;

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

  @Column({ name: 'invited_at', type: 'timestamp without time zone', default: () => 'NOW()' })
  invitedAt!: Date;

  @Column({ name: 'joined_at', type: 'timestamp without time zone', nullable: true })
  joinedAt?: Date;

  @Column({ name: 'removed_at', type: 'timestamp without time zone', nullable: true })
  removedAt?: Date;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;
}
