import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn, CreateDateColumn, UpdateDateColumn } from 'typeorm';
import { User } from '../../users/entities/user.entity';
import { Lab } from './lab.entity';

@Entity('lab_progress')
export class LabProgress {
  @PrimaryGeneratedColumn()
  id!: number;

  @ManyToOne(() => User, user => user.labProgress)
  @JoinColumn({ name: 'user_id' })
  user!: User;

  @ManyToOne(() => Lab, lab => lab.progress)
  @JoinColumn({ name: 'lab_id' })
  lab!: Lab;

  @Column({ name: 'user_id' })
  userId!: number;

  @Column({ name: 'lab_id' })
  labId!: number;

  @Column({ name: 'completed_tasks', type: 'jsonb', default: '[]' })
  completedTasks!: number[];

  @Column({ name: 'is_completed', type: 'boolean', default: false })
  isCompleted!: boolean;

  @Column({ name: 'started_at', type: 'timestamp without time zone', nullable: true })
  startedAt?: Date;

  @Column({ name: 'completed_at', type: 'timestamp without time zone', nullable: true })
  completedAt?: Date;

  @Column({ type: 'jsonb', nullable: true })
  notes?: {
    taskNotes?: { [taskId: number]: string };
    generalNotes?: string;
    quizScore?: number;
    quizTotal?: number;
    quizCompletedAt?: string;
  };

  @Column({ name: 'time_spent', type: 'integer', default: 0 })
  timeSpent!: number;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;
}
