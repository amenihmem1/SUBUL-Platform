import { Entity, PrimaryGeneratedColumn, Column, OneToMany, CreateDateColumn, UpdateDateColumn } from 'typeorm';
import { ExamAttempt } from './exam-attempt.entity';
import { ExamQuestion } from './exam-question.entity';

@Entity('exams')
export class Exam {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ length: 255 })
  title!: string;

  @Column({ length: 255, nullable: true })
  course!: string;

  @Column({ type: 'text', nullable: true })
  description!: string;

  @Column({ type: 'timestamp', nullable: true })
  date!: Date;

  @Column({ length: 50, nullable: true })
  duration!: string;

  @Column({ default: 0 })
  questionsCount!: number;

  @Column({ default: 70 })
  passingScore!: number;

  @Column({ enum: ['scheduled', 'available', 'completed'], default: 'available' })
  status!: string;

  @Column({ default: 0 })
  readinessScore!: number;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;

  @OneToMany(() => ExamAttempt, (attempt) => attempt.exam)
  attempts!: ExamAttempt[];

  @OneToMany(() => ExamQuestion, (q) => q.exam)
  questions!: ExamQuestion[];
}
