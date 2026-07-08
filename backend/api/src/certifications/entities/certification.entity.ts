import { Entity, PrimaryGeneratedColumn, Column, OneToMany } from 'typeorm';
import { Course } from '../../courses/entities/course.entity';

@Entity('certifications')
export class Certification {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ length: 255 })
  title!: string;

  @Column({ name: 'external_id', length: 100, nullable: true, unique: true })
  externalId?: string;

  @Column({ length: 100 })
  provider!: string;

  @Column({ name: 'exam_code', length: 50, nullable: true })
  examCode?: string;

  @Column({ name: 'badge_color', length: 20, nullable: true })
  badgeColor?: string;

  @Column('text', { nullable: true })
  description!: string;

  @Column({ default: 0 })
  students!: number;

  @Column({ default: 0 })
  completion!: number;

  @Column({ enum: ['Active', 'Draft', 'Archived'], default: 'Draft' })
  status!: 'Active' | 'Draft' | 'Archived';

  @Column({ default: true })
  available!: boolean;

  @Column({ nullable: true })
  duration!: string;

  @Column({ nullable: true })
  price!: string;

  @Column({ nullable: true })
  level!: string;

  @Column({ nullable: true })
  domain!: string;

  @Column({ name: 'estimated_hours', type: 'int', nullable: true })
  estimatedHours?: number;

  @Column({ name: 'final_exam_tips', type: 'json', nullable: true, default: [] })
  finalExamTips?: string[];

  @Column({ type: 'json', nullable: true, default: {} })
  resources?: Record<string, unknown>;

  @Column({ length: 50, nullable: true })
  source?: string;

  @Column({ name: 'source_version', length: 50, nullable: true })
  sourceVersion?: string;

  @Column({ name: 'imported_at', type: 'timestamp', nullable: true })
  importedAt?: Date;

  @Column({ name: 'azure_search_indexed_at', type: 'timestamp without time zone', nullable: true })
  azureSearchIndexedAt?: Date;

  @Column({ name: 'azure_search_document_count', type: 'integer', nullable: true })
  azureSearchDocumentCount?: number | null;

  @Column({ name: 'azure_search_last_error', type: 'text', nullable: true })
  azureSearchLastError?: string | null;

  @Column({ name: 'raw_metadata', type: 'json', nullable: true })
  rawMetadata?: Record<string, unknown>;

  // ── Visual assets ──────────────────────────────────────────────────────────
  @Column({ name: 'image_url', length: 500, nullable: true })
  imageUrl?: string;

  @Column({ name: 'banner_url', length: 500, nullable: true })
  bannerUrl?: string;

  @Column({ name: 'icon_url', length: 500, nullable: true })
  iconUrl?: string;

  // ── Exam metadata ──────────────────────────────────────────────────────────
  @Column({ name: 'passing_score', type: 'int', nullable: true })
  passingScore?: number;

  @Column({ name: 'num_questions', type: 'int', nullable: true })
  numQuestions?: number;

  @Column({ name: 'exam_duration_minutes', type: 'int', nullable: true })
  examDurationMinutes?: number;

  @Column({ length: 10, nullable: true, default: 'fr' })
  language?: string;

  @Column({ type: 'text', array: true, nullable: true })
  skills?: string[];

  @Column({ type: 'text', array: true, nullable: true })
  tags?: string[];

  @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP', name: 'created_at' })
  createdAt!: Date;

  @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP', onUpdate: 'CURRENT_TIMESTAMP', name: 'updated_at' })
  updatedAt!: Date;

  /**
   * One certification contains one or more courses.
   * FK lives on the courses table: courses.certification_id → certifications.id
   */
  @OneToMany(() => Course, (course) => course.certification)
  courses?: Course[];
}
