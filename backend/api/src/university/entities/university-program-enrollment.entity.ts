import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn, CreateDateColumn, Index, Unique } from 'typeorm';
import { User } from '../../users/entities/user.entity';
import { UniversityProgram } from './university-program.entity';

@Entity('university_program_enrollments')
@Unique(['userId', 'programId'])
@Index(['programId'])
export class UniversityProgramEnrollment {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'user_id' })
  userId!: number;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user!: User;

  @Column({ name: 'program_id', type: 'uuid' })
  programId!: string;

  @ManyToOne(() => UniversityProgram, p => p.enrollments, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'program_id' })
  program!: UniversityProgram;

  @Column({ length: 32, default: 'invited' })
  status!: string;

  @Column({ name: 'invited_at', type: 'timestamp without time zone', nullable: true })
  invitedAt?: Date;

  @Column({ name: 'enrolled_at', type: 'timestamp without time zone', nullable: true })
  enrolledAt?: Date;

  @Column({ name: 'completed_at', type: 'timestamp without time zone', nullable: true })
  completedAt?: Date;

  @Column({ type: 'int', default: 0 })
  progress!: number;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;
}
