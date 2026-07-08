import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { PracticeExamQuestion } from './practice-exam-question.entity';

export type PracticeExamStatus = 'draft' | 'published' | 'archived';
export type PracticeExamDifficulty = 'beginner' | 'intermediate' | 'advanced';

@Entity('practice_exams')
@Index('IDX_practice_exams_certification_id', ['certificationId'])
@Index('IDX_practice_exams_status', ['status'])
export class PracticeExam {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ length: 120, unique: true })
  slug!: string;

  @Column({ name: 'certification_id', type: 'int', nullable: true })
  certificationId!: number | null;

  @Column({ length: 255 })
  title!: string;

  @Column({ type: 'text', nullable: true })
  description!: string | null;

  @Column({ name: 'duration_minutes', type: 'int', default: 60 })
  durationMinutes!: number;

  @Column({ name: 'passing_score', type: 'int', default: 70 })
  passingScore!: number;

  @Column({ length: 20, default: 'beginner' })
  difficulty!: PracticeExamDifficulty;

  @Column({ length: 20, default: 'draft' })
  status!: PracticeExamStatus;

  @Column({ name: 'external_id', type: 'varchar', length: 120, nullable: true })
  externalId!: string | null;

  @Column({ type: 'varchar', length: 64, nullable: true })
  source!: string | null;

  @Column({ type: 'jsonb', default: () => `'[]'::jsonb` })
  tags!: string[];

  @Column({ name: 'azure_search_indexed_at', type: 'timestamptz', nullable: true })
  azureSearchIndexedAt!: Date | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt!: Date;

  @OneToMany(() => PracticeExamQuestion, (q) => q.practiceExam)
  questions?: PracticeExamQuestion[];
}
